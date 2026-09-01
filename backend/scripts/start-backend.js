const { spawn, execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function checkHealth() {
  try {
    const res = await fetch('http://127.0.0.1:5000/api/health', { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const data = await res.json();
      return data && data.status === 'ok';
    }
  } catch (e) {
    // Unreachable
  }
  return false;
}

async function main() {
  console.log('[HERIXA-BACKEND] SERVICE_CHECK_STARTED');
  const healthy = await checkHealth();
  if (healthy) {
    console.log('[HERIXA-BACKEND] Backend service already running and healthy on port 5000. Reusing existing instance.');
    setTimeout(() => process.exit(0), 100);
    return;
  }

  console.log('[HERIXA-BACKEND] PORT_5000_STATUS: UNAVAILABLE_OR_STALE');
  console.log('[HERIXA-BACKEND] Checking for stale processes on port 5000...');
  try {
    const stdout = execSync('netstat -ano').toString();
    const lines = stdout.split('\n');
    const lineWithPort = lines.find(line => line.includes(':5000') && line.includes('LISTENING'));
    if (lineWithPort) {
      const parts = lineWithPort.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        console.log(`[HERIXA-BACKEND] Found process on port 5000 with PID ${pid}. Verifying process type...`);
        const taskInfo = execSync(`tasklist /FI "PID eq ${pid}"`).toString();
        if (taskInfo.toLowerCase().includes('node.exe')) {
          console.log('[HERIXA-BACKEND] STALE_PROCESS_DETECTED');
          console.log('[HERIXA-BACKEND] Cleaning stale HERIXA backend process...');
          execSync(`taskkill /F /PID ${pid}`);
          console.log('[HERIXA-BACKEND] STALE_PROCESS_TERMINATED');
          // Wait briefly for port release
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.warn(`[HERIXA-BACKEND] Process on port 5000 is not a node process. PID: ${pid}, Image: ${taskInfo.trim()}. Will not kill.`);
        }
      }
    } else {
      console.log('[HERIXA-BACKEND] PORT_5000_STATUS: AVAILABLE');
    }
  } catch (err) {
    console.warn(`[HERIXA-BACKEND] Stale process check failed or skipped: ${err.message}`);
  }

  // 5. Non-blocking startup diagnostic check for local Ollama
  if (process.env.AI_ASSISTANT_PROVIDER === 'ollama') {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        console.log('[HERIXA-OLLAMA] Ollama service available.');
        const data = await response.json();
        const models = data?.models || [];
        const modelExists = models.some(m => {
          const name = m.name || '';
          return name.toLowerCase() === ollamaModel.toLowerCase() ||
                 name.toLowerCase().startsWith(ollamaModel.toLowerCase() + ':') ||
                 ollamaModel.toLowerCase().startsWith(name.toLowerCase() + ':');
        });
        if (modelExists) {
          console.log(`[HERIXA-OLLAMA] Model ${ollamaModel} available.`);
        } else {
          console.log(`[HERIXA-OLLAMA] Model ${ollamaModel} is not installed.`);
          console.log(`[HERIXA-OLLAMA] Please install the model manually before using the assistant.`);
        }
      } else {
        console.log('[HERIXA-OLLAMA] Ollama is unavailable.');
        console.log('[HERIXA-OLLAMA] Start Ollama and ensure the configured model is installed.');
      }
    } catch (err) {
      console.log('[HERIXA-OLLAMA] Ollama is unavailable.');
      console.log('[HERIXA-OLLAMA] Start Ollama and ensure the configured model is installed.');
    }
  }

  // 6. Non-blocking startup diagnostic check for Groq Cloud API
  if (process.env.AI_ASSISTANT_PROVIDER === 'groq') {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY' || apiKey.includes('temp_key')) {
      console.warn('[HERIXA-ASSISTANT] [WARNING] Groq API key is not configured or is a placeholder. Heritage Assistant chat will return configuration errors.');
    } else {
      console.log(`[HERIXA-ASSISTANT] Groq Assistant provider is active using model: ${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'}`);
    }
  }

  console.log('[HERIXA-BACKEND] STARTING_SERVER');
  
  const tsNodeDevPath = path.resolve(__dirname, '../node_modules/ts-node-dev/lib/bin.js');
  const backendDir = path.resolve(__dirname, '..');

  const child = spawn(
    process.execPath,
    [tsNodeDevPath, '--respawn', '--transpile-only', '--exit-child', 'src/server.ts'],
    {
      cwd: backendDir,
      stdio: 'inherit',
      shell: false
    }
  );

  console.log('[HERIXA-BACKEND] SERVER_READY');

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    console.error(`[HERIXA-BACKEND] STARTUP_FAILED: ${err.message}`);
    process.exit(1);
  });

  // Clean up child on parent exits
  const cleanUp = () => {
    console.log('[HERIXA-BACKEND] Terminating backend process...');
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
