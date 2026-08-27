export interface RetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  abortSignal?: AbortSignal;
}

/**
 * Executes an AI operation with exponential backoff retries for transient errors.
 */
export const withAIRetry = async <T>(
  operation: (attempt: number) => Promise<T>,
  operationName: string,
  modelName: string,
  config: RetryConfig = {}
): Promise<T> => {
  // Use a maximum of 2 attempts for operations unless specified otherwise
  const maxAttempts = config.maxAttempts ?? 5;
  const initialDelayMs = config.initialDelayMs ?? 2000;
  const backoffFactor = config.backoffFactor ?? 2;
  const maxDelayMs = config.maxDelayMs ?? 15000;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (config.abortSignal?.aborted) {
        console.log(`[AI] Operation ${operationName} cancelled via abortSignal before attempt ${attempt}.`);
        throw new Error('Generation cancelled.');
      }

      console.log(`[AI] Generation started`);
      console.log(`[AI] Model: ${modelName}`);
      console.log(`[AI] Attempt: ${attempt}`);
      console.log(`[AI] Request started`);

      const startTime = Date.now();
      const result = await operation(attempt);
      const duration = Date.now() - startTime;

      console.log(`[AI] Request completed in ${duration} ms`);
      console.log(`[AI] Generation completed`);
      return result;
    } catch (err: any) {
      lastError = err;
      const duration = Date.now() - (attempt === 1 ? Date.now() : 0);

      const errMsg = err?.message || '';
      const errStatus = Number(err?.status || err?.statusCode || 0);
      const errCode = err?.code || '';
      const errStr = `${errMsg} ${errStatus} ${errCode}`.toLowerCase();

      console.error(`[AI DEBUG ERROR] Attempt ${attempt} error message: "${errMsg}", status: ${errStatus}, code: ${errCode}`);

      // Check if it was cancelled
      const isCancelled = config.abortSignal?.aborted === true;

      if (isCancelled) {
        console.log(`[AI] Operation ${operationName} was cancelled via abortSignal. Skipping retries.`);
        throw new Error('Generation cancelled.');
      }

      // Check if the error is transient
      // 1. HTTP Status check
      const isTransientStatus = [408, 429, 500, 502, 503, 504].includes(errStatus);

      // 2. Error message/code check for network errors or timeout
      const isNetworkOrTimeout = 
        errStr.includes('timeout') ||
        errStr.includes('time out') ||
        errStr.includes('etimedout') ||
        errStr.includes('enotfound') ||
        errStr.includes('econnrefused') ||
        errStr.includes('fetch failed') ||
        errStr.includes('network') ||
        errStr.includes('connect');

      // 3. Rate Limit / Quota check
      const isRateLimit =
        errStr.includes('429') ||
        errStr.includes('exhausted') ||
        errStr.includes('quota') ||
        errStr.includes('rate limit') ||
        errStr.includes('resource_exhausted');

      const isTransient = isTransientStatus || isNetworkOrTimeout || isRateLimit;

      console.error(`[AI ERROR]
operation: ${operationName}
model: ${modelName}
status: ${errStatus || 'N/A'}
duration: ${duration}
attempt: ${attempt}
message: ${errMsg || String(err)}`);

      // If error is not transient or we have reached the max attempt count, throw immediately
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }

      // Calculate delay with exponential backoff and jitter
      let delay = Math.min(initialDelayMs * Math.pow(backoffFactor, attempt - 1), maxDelayMs);
      if (isRateLimit) {
        delay = Math.max(delay, 8000 * attempt);
      }
      const jitter = Math.random() * 200 - 100; // Jitter +/- 100ms
      const finalDelay = Math.max(50, delay + jitter);

      console.log(`[AI] Retry scheduled in ${Math.round(finalDelay)} ms`);
      
      // Support aborting delay if cancelled during wait
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (config.abortSignal) {
            config.abortSignal.removeEventListener('abort', onAbort);
          }
          resolve();
        }, finalDelay);

        const onAbort = () => {
          clearTimeout(timeout);
          reject(new Error('Generation cancelled.'));
        };

        if (config.abortSignal) {
          if (config.abortSignal.aborted) {
            onAbort();
          } else {
            config.abortSignal.addEventListener('abort', onAbort);
          }
        }
      });
    }
  }

  throw lastError;
};
