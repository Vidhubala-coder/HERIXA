import { spawn } from 'child_process';
import path from 'path';

export type AiServiceState = 'STARTING' | 'INITIALIZING' | 'READY' | 'UNAVAILABLE' | 'ERROR' | 'FAILED';
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

let aiServiceState: AiServiceState = 'STARTING';
let lastFailureReason: string | null = null;
let lastCheckTime = 0;

// Circuit Breaker Variables
let circuitState: CircuitState = 'CLOSED';
let failureCount = 0;
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 10000; // 10 seconds cooldown
let lastStateChangeTime = Date.now();

// Runtime Recovery Variables
let recoveryAttempts = 0;
const MAX_RECOVERY_ATTEMPTS = 1;
let lastRecoveryTime = 0;
const RECOVERY_COOLDOWN_MS = 30000; // 30 seconds cooldown between recoveries

export const getAiServiceState = () => ({
  state: aiServiceState,
  lastFailureReason,
  lastCheckTime,
  circuitState,
  failureCount
});

export const recordSuccess = () => {
  failureCount = 0;
  if (circuitState !== 'CLOSED') {
    console.log(`[HERIXA-CIRCUIT] Circuit Breaker: ${circuitState} -> CLOSED`);
    circuitState = 'CLOSED';
    lastStateChangeTime = Date.now();
  }
};

export const recordFailure = () => {
  failureCount++;
  if (circuitState === 'CLOSED' && failureCount >= FAILURE_THRESHOLD) {
    console.warn(`[HERIXA-CIRCUIT] Circuit Breaker: CLOSED -> OPEN (Threshold exceeded)`);
    circuitState = 'OPEN';
    lastStateChangeTime = Date.now();
  } else if (circuitState === 'HALF_OPEN') {
    console.warn(`[HERIXA-CIRCUIT] Circuit Breaker: HALF_OPEN -> OPEN (Probe request failed)`);
    circuitState = 'OPEN';
    lastStateChangeTime = Date.now();
  }
};

// Start uvicorn process asynchronously from backend for recovery
export const attemptRuntimeRecovery = async (): Promise<boolean> => {
  const now = Date.now();
  if (now - lastRecoveryTime < RECOVERY_COOLDOWN_MS) {
    console.warn('[HERIXA-AI] Runtime recovery check: in cooldown, skipping spawn');
    return false;
  }
  if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    console.warn('[HERIXA-AI] Runtime recovery check: max recovery attempts reached');
    return false;
  }

  recoveryAttempts++;
  lastRecoveryTime = now;
  console.log(`[HERIXA-AI] Runtime recovery started (attempt ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})`);

  try {
    const startScript = path.resolve(__dirname, '../../scripts/start-ai.js');
    console.log(`[HERIXA-AI] Launching recovery script: node ${startScript}`);
    const child = spawn('node', [startScript], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref(); // Allow the parent process to run independently
    
    // Wait a brief 2 seconds for process to start spawning before running the next check
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  } catch (err: any) {
    console.error(`[HERIXA-AI] Runtime recovery failed to launch process: ${err.message}`);
    return false;
  }
};

let activeHealthPromise: Promise<boolean> | null = null;
const HEALTH_CACHE_TTL = 2000; // 2 seconds TTL

const checkAiServiceHealthInternal = async (silentMode = false): Promise<boolean> => {
  const rawUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').trim();
  const aiServiceUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
  const healthUrl = `${aiServiceUrl}/health`;
  
  if (!silentMode) {
    console.log('[HERIXA-AI] SERVICE_CHECK_STARTED');
  }
  
  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(2000) // Short 2 seconds timeout
    });

    if (res.ok) {
      console.log('[HERIXA-AI] FASTAPI_REACHABLE');
      const data: any = await res.json();
      
      const modelLoaded = data && (data.modelLoaded === true || data.model_loaded === true);
      const status = data && data.status;

      if (status === 'READY' && modelLoaded) {
        if (aiServiceState !== 'READY') {
          console.log('[HERIXA-AI] MODEL_STATUS: READY');
        }
        aiServiceState = 'READY';
        lastFailureReason = null;
        return true;
      } else if (status === 'INITIALIZING') {
        aiServiceState = 'INITIALIZING';
        lastFailureReason = 'ONNX model is still initializing.';
        if (!silentMode) {
          console.log('[HERIXA-AI] MODEL_STATUS: INITIALIZING');
        }
        return false;
      } else {
        aiServiceState = 'FAILED';
        lastFailureReason = 'FastAPI is ready but model failed to load.';
        console.warn(`[HERIXA-AI] MODEL_STATUS: FAILED. Reason: ${lastFailureReason}`);
        return false;
      }
    } else {
      let data: any = null;
      try {
        data = await res.json();
      } catch (e) {}
      
      const status = data && data.status;
      if (status === 'INITIALIZING') {
        aiServiceState = 'INITIALIZING';
        lastFailureReason = 'ONNX model is initializing (HTTP ' + res.status + ').';
        if (!silentMode) {
          console.log('[HERIXA-AI] MODEL_STATUS: INITIALIZING');
        }
        return false;
      }
      
      aiServiceState = 'FAILED';
      lastFailureReason = `FastAPI returned HTTP status ${res.status}`;
      console.warn(`[HERIXA-AI] MODEL_STATUS: FAILED. Reason: ${lastFailureReason}`);
      return false;
    }
  } catch (err: any) {
    aiServiceState = 'UNAVAILABLE';
    lastFailureReason = err.message || String(err);
    if (!silentMode) {
      console.log('[HERIXA-AI] FastAPI service unreachable or unavailable');
    }
    return false;
  }
};

export const checkAiServiceHealthOnStartup = async (maxRetries = 15, delayMs = 1000): Promise<boolean> => {
  console.log('[HERIXA-AI] SERVICE_CHECK_STARTED');
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isReady = await checkAiServiceHealthInternal(true);
    if (isReady) {
      lastCheckTime = Date.now();
      return true;
    }
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log('[HERIXA-AI] FastAPI service unreachable or unavailable');
  lastCheckTime = Date.now();
  return false;
};

export const checkAiServiceHealth = async (): Promise<boolean> => {
  const now = Date.now();
  if (now - lastCheckTime < HEALTH_CACHE_TTL && aiServiceState !== 'STARTING') {
    return aiServiceState === 'READY';
  }

  if (activeHealthPromise) {
    return activeHealthPromise;
  }

  activeHealthPromise = (async () => {
    try {
      const result = await checkAiServiceHealthInternal(false);
      lastCheckTime = Date.now();
      return result;
    } finally {
      activeHealthPromise = null;
    }
  })();

  return activeHealthPromise;
};

export const isAiServiceAvailable = async (): Promise<boolean> => {
  const now = Date.now();
  
  if (circuitState === 'OPEN') {
    if (now - lastStateChangeTime > COOLDOWN_MS) {
      console.log('[HERIXA-CIRCUIT] Circuit Breaker: OPEN -> HALF_OPEN (Cooldown finished)');
      circuitState = 'HALF_OPEN';
      lastStateChangeTime = now;
    } else {
      console.log('[HERIXA-CIRCUIT] Circuit Breaker: OPEN (Blocking request)');
      return false;
    }
  }
  
  // If not READY or INITIALIZING, perform health check
  if (aiServiceState !== 'READY' && aiServiceState !== 'INITIALIZING') {
    const isHealthy = await checkAiServiceHealth();
    if (!isHealthy) {
      // Attempt recovery once if unavailable
      if (aiServiceState === 'UNAVAILABLE') {
        const recovered = await attemptRuntimeRecovery();
        if (recovered) {
          // Re-check health after spawning uvicorn
          return await checkAiServiceHealth();
        }
      }
      return false;
    }
  }
  
  return true;
};

// Poll health check while state is INITIALIZING
export const waitForModelReady = async (): Promise<boolean> => {
  if ((aiServiceState as any) !== 'INITIALIZING') {
    return (aiServiceState as any) === 'READY';
  }

  console.log('[HERIXA-AI] Model is INITIALIZING. Polling readiness with bounded wait...');
  const pollInterval = 500; // 500ms
  const maxWait = 5000;     // 5 seconds max wait
  let elapsed = 0;

  while (elapsed < maxWait) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;

    // Run health check
    const isHealthy = await checkAiServiceHealth();
    if (isHealthy && (aiServiceState as any) === 'READY') {
      console.log(`[HERIXA-AI] Model transitioned to READY after ${elapsed}ms wait.`);
      return true;
    }
    
    if ((aiServiceState as any) === 'FAILED') {
      console.warn('[HERIXA-AI] Model failed to load during wait.');
      return false;
    }
  }

  console.warn(`[HERIXA-AI] Bounded readiness wait timed out after ${maxWait}ms.`);
  return false;
};

export const callPredictionService = async (formData: any, signal?: AbortSignal): Promise<Response> => {
  const rawUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').trim();
  const aiServiceUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
  const predictUrl = `${aiServiceUrl}/predict`;

  const available = await isAiServiceAvailable();
  if (!available) {
    throw new Error('MODEL_UNAVAILABLE');
  }

  // If status is INITIALIZING, wait/poll
  if (aiServiceState === 'INITIALIZING') {
    const ready = await waitForModelReady();
    if (!ready) {
      throw new Error(aiServiceState === 'INITIALIZING' ? 'MODEL_INITIALIZING' : 'MODEL_UNAVAILABLE');
    }
  }

  let attempt = 0;
  const maxAttempts = 2; // Original + 1 retry = 2 attempts max

  while (attempt < maxAttempts) {
    attempt++;
    if (attempt > 1) {
      console.log(`[HERIXA-RECOGNITION] Retrying prediction request, attempt ${attempt}...`);
    }

    try {
      console.log('[HERIXA-RECOGNITION] MODEL_INFERENCE_STARTED');
      const response = await fetch(predictUrl, {
        method: 'POST',
        body: formData,
        signal: signal
      });

      if (response.ok) {
        recordSuccess();
        console.log('[HERIXA-RECOGNITION] MODEL_INFERENCE_COMPLETED');
        return response;
      }

      // If HTTP status is 502, 503, or 504, these are temporary/availability errors
      const isTemporaryStatus = response.status === 502 || response.status === 503 || response.status === 504;
      if (isTemporaryStatus && attempt < maxAttempts) {
        console.warn(`[HERIXA-RECOGNITION] FastAPI returned temporary status ${response.status}. Retrying...`);
        recordFailure();
        continue;
      }

      recordFailure();
      return response;
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('timed out');
      const isConnectionError = err.code === 'ECONNREFUSED' || String(err).includes('ECONNREFUSED') || 
                                err.code === 'EHOSTUNREACH' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND';

      recordFailure();

      if ((isTimeout || isConnectionError) && attempt < maxAttempts) {
        console.warn(`[HERIXA-RECOGNITION] Temporary connection error (${err.message || err}). Retrying...`);
        continue;
      }

      throw err;
    }
  }

  throw new Error('MODEL_UNAVAILABLE');
};
