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

export const recordFailure = (isTemporaryGateway = false) => {
  // Temporary 502/503/504/timeout gateway status during cold start does NOT permanently trip circuit breaker
  if (isTemporaryGateway) {
    console.warn(`[HERIXA-CIRCUIT] Temporary gateway status during cold start recorded (failureCount: ${failureCount}). Circuit breaker state preserved as ${circuitState}.`);
    return;
  }
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
  const rawUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').trim();
  if (rawUrl.startsWith('https://')) {
    // Remote cloud AI service (e.g. Render); skip local process spawning
    return false;
  }

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
const HEALTH_CACHE_TTL = 5000; // 5 seconds TTL to avoid rapid polling

const checkAiServiceHealthInternal = async (silentMode = false, overrideTimeoutMs?: number): Promise<boolean> => {
  const rawUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').trim();
  const aiServiceUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
  const healthUrl = `${aiServiceUrl}/health`;
  
  if (!silentMode) {
    console.log('[HERIXA-AI] SERVICE_CHECK_STARTED');
  }
  
  try {
    const isRemote = aiServiceUrl.startsWith('https://');
    // Remote Render free-tier cold start can take up to 50-60s; use 55s health timeout.
    // For polling inside waitForModelReady, override with a shorter per-probe timeout.
    const healthTimeout = overrideTimeoutMs ?? (isRemote ? 55000 : 8000);
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(healthTimeout)
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
        recordSuccess();
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
      
      // HTTP 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout), or 429 (Rate Limited)
      // are temporary gateway / cold-start conditions, not permanent model failures
      if (res.status === 502 || res.status === 503 || res.status === 504 || res.status === 429) {
        aiServiceState = 'UNAVAILABLE';
        lastFailureReason = `AI service gateway response (HTTP ${res.status}). Service may be waking up.`;
        if (!silentMode) {
          console.warn(`[HERIXA-AI] AI service gateway temporary status: HTTP ${res.status}`);
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
      console.log('[HERIXA-AI] FastAPI service unreachable or unavailable:', lastFailureReason);
    }
    return false;
  }
};

export const checkAiServiceHealthOnStartup = async (maxRetries = 8, delayMs = 3000): Promise<boolean> => {
  const rawUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').trim();
  const isRemote = rawUrl.startsWith('https://');
  // For remote Render services, use a shorter per-probe timeout on startup so we can retry quickly
  // The real cold-start wait is handled by waitForModelReady during request time.
  const startupProbeTimeout = isRemote ? 15000 : 8000;
  console.log('[HERIXA-AI] SERVICE_CHECK_STARTED');
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isReady = await checkAiServiceHealthInternal(true, startupProbeTimeout);
    if (isReady) {
      lastCheckTime = Date.now();
      return true;
    }
    if (attempt < maxRetries) {
      // Exponential backoff: 3s, 4.2s, 5.8s, 8.2s, 11.5s, 16s, 16s
      const backoff = delayMs * Math.pow(1.4, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, Math.min(backoff, 16000)));
    }
  }

  console.log('[HERIXA-AI] FastAPI service unreachable or unavailable during startup check');
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
      // Attempt recovery once if unavailable locally
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

// Poll health check while state is INITIALIZING or waking up.
// Uses short per-probe timeouts (10s) so that the total maxWaitMs budget
// actually covers multiple real probe attempts rather than 1–2 long waits.
export const waitForModelReady = async (maxWaitMs = 75000): Promise<boolean> => {
  const rawUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').trim();
  const isRemote = rawUrl.startsWith('https://');
  // Per-probe timeout: 12s for remote (fast fail + retry), 5s for local
  const perProbeTimeoutMs = isRemote ? 12000 : 5000;
  const betweenPollMs = isRemote ? 3000 : 1000; // pause between polls
  
  console.log(`[HERIXA-AI] Polling AI service readiness (max wait: ${maxWaitMs}ms, probe timeout: ${perProbeTimeoutMs}ms)...`);
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const isHealthy = await checkAiServiceHealthInternal(true, perProbeTimeoutMs);
    if (isHealthy && aiServiceState === 'READY') {
      const elapsed = Date.now() - start;
      console.log(`[HERIXA-AI] Model transitioned to READY after ${elapsed}ms wait.`);
      return true;
    }
    
    if (aiServiceState === 'FAILED') {
      console.warn('[HERIXA-AI] Model failed to load during wait.');
      return false;
    }

    const remaining = maxWaitMs - (Date.now() - start);
    if (remaining <= 0) break;
    await new Promise(resolve => setTimeout(resolve, Math.min(betweenPollMs, remaining)));
  }

  const elapsed = Date.now() - start;
  console.warn(`[HERIXA-AI] Bounded readiness wait timed out after ${elapsed}ms.`);
  return false;
};

export const callPredictionService = async (formData: any, signal?: AbortSignal): Promise<Response> => {
  const rawUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').trim();
  const aiServiceUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
  const predictUrl = `${aiServiceUrl}/predict`;

  let available = await isAiServiceAvailable();
  if (!available) {
    // If remote service is unavailable (cold start), attempt controlled polling wait up to 75s
    if (aiServiceUrl.startsWith('https://')) {
      console.log('[HERIXA-AI] Remote AI service unavailable during initial check. Service may be warming up. Waiting for model readiness...');
      available = await waitForModelReady(75000);
    }
    if (!available) {
      throw new Error('MODEL_UNAVAILABLE');
    }
  }

  // If status is INITIALIZING, wait/poll up to 75 seconds
  if (aiServiceState === 'INITIALIZING') {
    const ready = await waitForModelReady(75000);
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
      // Sensible backoff delay before retry
      await new Promise(res => setTimeout(res, 3000));
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
        aiServiceState = 'READY';
        console.log('[HERIXA-RECOGNITION] MODEL_INFERENCE_COMPLETED');
        return response;
      }

      // If HTTP status is 502, 503, or 504, these are temporary/availability errors during cold start
      const isTemporaryStatus = response.status === 502 || response.status === 503 || response.status === 504;
      if (isTemporaryStatus && attempt < maxAttempts) {
        console.warn(`[HERIXA-RECOGNITION] FastAPI returned temporary status ${response.status}. Retrying after backoff...`);
        recordFailure(true);
        continue;
      }

      recordFailure(isTemporaryStatus);
      return response;
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('timed out');
      const isConnectionError = err.code === 'ECONNREFUSED' || String(err).includes('ECONNREFUSED') || 
                                err.code === 'EHOSTUNREACH' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND';

      recordFailure(true);

      if ((isTimeout || isConnectionError) && attempt < maxAttempts) {
        console.warn(`[HERIXA-RECOGNITION] Temporary connection error (${err.message || err}). Retrying after backoff...`);
        continue;
      }

      throw err;
    }
  }

  throw new Error('MODEL_UNAVAILABLE');
};
