const { spawn, execSync } = require('child_process');
const path = require('path');

async function checkHealth() {
  try {
    const res = await fetch('http://127.0.0.1:8001/health', { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const data = await res.json();
      const modelLoaded = data && (data.modelLoaded === true || data.model_loaded === true);
      const isReady = data && (data.status === 'READY' || data.status === 'healthy');
      return modelLoaded && isReady;
    }
  } catch (e) {
    // Unreachable
  }
  return false;
}

async function waitForReady() {
  console.log('[HERIXA-AI] Waiting for FastAPI readiness...');
  const startTime = Date.now();
  const timeoutMs = 15000;
  
  while (Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const res = await fetch('http://127.0.0.1:8001/health', { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        const data = await res.json();
        const status = data.status || (data.ai_recognition && data.ai_recognition.status);
        console.log(`[HERIXA-AI] FastAPI health: ${status || 'unknown'}`);
        if (status === 'READY') {
          console.log('[HERIXA-AI] Model status: READY');
          return true;
        } else if (status === 'FAILED') {
          console.error('[HERIXA-AI] Model status: FAILED. Model initialization failed.');
          return false;
        }
      }
    } catch (e) {
      // Ignore connection issues during start
    }
  }
  console.error('[HERIXA-AI] FastAPI startup failed: Timeout waiting for model to become READY.');
  return false;
}

async function main() {
  const healthy = await checkHealth();
  if (healthy) {
    console.log('[HERIXA-AI] FastAPI service already running and healthy on port 8001. Reusing existing instance.');
    setTimeout(() => process.exit(0), 100);
    return;
  }

  console.log('[HERIXA-AI] Port 8001 is not running a healthy FastAPI service. Checking for stale processes on port 8001...');
  try {
    const stdout = execSync('netstat -ano').toString();
    const lines = stdout.split('\n');
    const lineWithPort = lines.find(line => line.includes(':8001') && line.includes('LISTENING'));
    if (lineWithPort) {
      const parts = lineWithPort.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        console.log(`[HERIXA-AI] Found stale process on port 8001 with PID ${pid}. Terminating it...`);
        execSync(`taskkill /F /PID ${pid}`);
        console.log('[HERIXA-AI] Stale process terminated.');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (err) {
    console.warn(`[HERIXA-AI] Health startup search: no conflicting active socket on port 8001 or check skipped (${err.message}).`);
  }

  console.log('[HERIXA-AI] Starting FastAPI service...');
  const pythonPath = path.resolve(__dirname, '../../ai/.venv/Scripts/python.exe');
  const aiDir = path.resolve(__dirname, '../../ai');

  console.log(`[HERIXA-AI] Python path: ${pythonPath}`);
  console.log(`[HERIXA-AI] Cwd: ${aiDir}`);

  // Safe non-shell spawn
  const child = spawn(
    pythonPath,
    ['-m', 'uvicorn', 'src.service:app', '--host', '127.0.0.1', '--port', '8001'],
    {
      cwd: aiDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    }
  );

  console.log('[HERIXA-AI] FastAPI process started');

  // Forward streams with prefix
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        console.log(`[HERIXA-AI] ${trimmed}`);
      }
    }
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        console.error(`[HERIXA-AI] ${trimmed}`);
      }
    }
  });

  // Handle process exits
  child.on('exit', (code, signal) => {
    console.log(`[HERIXA-AI] FastAPI process exited with code ${code} and signal ${signal}`);
    process.exit(code ?? 1);
  });

  child.on('error', (err) => {
    console.error(`[HERIXA-AI] Failed to start FastAPI process: ${err.message}`);
    process.exit(1);
  });

  // Polling check
  const ready = await waitForReady();
  if (!ready) {
    console.error('[HERIXA-AI] FastAPI startup failed.');
    child.kill('SIGKILL');
    try {
      execSync(`taskkill /F /PID ${child.pid}`, { stdio: 'ignore' });
    } catch (e) {}
    process.exit(1);
  }

  // Cleanup child on parent exits
  const cleanUp = () => {
    console.log('[HERIXA-AI] Terminating FastAPI process...');
    child.kill('SIGTERM');
    try {
      execSync(`taskkill /F /PID ${child.pid}`, { stdio: 'ignore' });
    } catch (e) {}
  };

  process.on('SIGINT', () => {
    cleanUp();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanUp();
    process.exit(0);
  });
}

main();
