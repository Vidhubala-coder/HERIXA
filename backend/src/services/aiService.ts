export type AiServiceState = 'STARTING' | 'LOADING' | 'READY' | 'UNAVAILABLE' | 'ERROR';

let aiServiceState: AiServiceState = 'STARTING';
let lastFailureReason: string | null = null;
let lastCheckTime = 0;

export const getAiServiceState = () => ({
  state: aiServiceState,
  lastFailureReason,
  lastCheckTime
});

export const checkAiServiceHealth = async (): Promise<boolean> => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001';
  const healthUrl = `${aiServiceUrl}/health`;
  
  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (res.ok) {
      const data: any = await res.json();
      const modelLoaded = data && (data.modelLoaded === true || data.model_loaded === true);
      const isReady = data && (data.status === 'READY' || data.status === 'healthy');

      if (modelLoaded && isReady) {
        if (aiServiceState !== 'READY') {
          console.log(`[HERIXA-AI] FastAPI URL: ${aiServiceUrl}`);
          console.log('[HERIXA-AI] Model initialization started');
          console.log(`[HERIXA-AI] Model path: ${data.model || 'models/integration/onnx/herixa_phase3g.onnx'}`);
          console.log('[HERIXA-AI] Model loaded successfully');
          console.log('[HERIXA-AI] Model status: READY');
        }
        aiServiceState = 'READY';
        lastFailureReason = null;
        lastCheckTime = Date.now();
        return true;
      } else {
        aiServiceState = 'LOADING';
        lastFailureReason = 'ONNX model is not loaded yet in FastAPI context.';
        console.warn(`[HERIXA-AI] Model status: LOADING. Reason: ${lastFailureReason}`);
        return false;
      }
    } else {
      aiServiceState = 'ERROR';
      lastFailureReason = `FastAPI returned HTTP status ${res.status}`;
      console.warn(`[HERIXA-AI] Model initialization FAILED. Reason: ${lastFailureReason}`);
      return false;
    }
  } catch (err: any) {
    aiServiceState = 'UNAVAILABLE';
    lastFailureReason = err.message || String(err);
    console.warn(`[HERIXA-AI] Model initialization FAILED. Reason: FastAPI unreachable or timed out (${lastFailureReason})`);
    return false;
  }
};
