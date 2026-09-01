export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MonumentContext {
  name: string;
  location: string;
  period: string;
  description?: string;
  historicalBackground?: string;
  architecture?: string;
  interestingFacts?: string[];
}

export interface AssistantServiceResponse {
  success: boolean;
  message: string;
  errorDetails?: string;
  statusCode?: number;
}

const SYSTEM_INSTRUCTION = `You are HERIXA Heritage Assistant, an intelligent cultural heritage and educational assistant.

You are primarily powered by OpenAI's general knowledge and reasoning capabilities.

Answer the user's questions naturally and accurately across history, culture, architecture, heritage, education, travel-related heritage information, and general topics.

HERIXA database context may be provided as supplementary information. When provided, use it to improve accuracy for HERIXA-specific monument information, but do not limit your answer to the database.

If the database does not contain information relevant to the question, continue answering using your general knowledge.

Never pretend that the database contains information when it does not.

When discussing HERIXA-specific stored information, prioritize the supplied HERIXA context.

When answering general questions, use your broader knowledge.

If you are uncertain about a specific factual claim, clearly communicate the uncertainty rather than inventing information.

If the user asks in Tamil or Tanglish, respond naturally in Tamil/Tanglish. If the user asks in English, respond in English.

Keep answers conversational and easy to understand. Provide detailed explanations when the user asks for them.`;

export const chatWithOpenAI = async (
  message: string,
  conversation: ChatMessage[],
  monumentContext?: MonumentContext
): Promise<AssistantServiceResponse> => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    console.error('[HERIXA-ASSISTANT] OpenAI request failed: OPENAI_API_KEY environment variable is not configured');
    return {
      success: false,
      message: 'Heritage Assistant configuration is incomplete. OpenAI API Key is missing on the server.',
      errorDetails: 'AI_AUTH_ERROR',
      statusCode: 401
    };
  }

  console.log('[HERIXA-ASSISTANT] Request started');

  // Build messages array
  let systemPrompt = SYSTEM_INSTRUCTION;
  if (monumentContext) {
    systemPrompt += `\n\nActive HERIXA Monument Context:\n- Name: ${monumentContext.name}\n- Location: ${monumentContext.location}\n- Period/Dynasty: ${monumentContext.period}`;
    if (monumentContext.description) {
      systemPrompt += `\n- Description: ${monumentContext.description}`;
    }
    if (monumentContext.historicalBackground) {
      systemPrompt += `\n- History: ${monumentContext.historicalBackground}`;
    }
    if (monumentContext.architecture) {
      systemPrompt += `\n- Architecture: ${monumentContext.architecture}`;
    }
    if (monumentContext.interestingFacts && monumentContext.interestingFacts.length > 0) {
      systemPrompt += `\n- Interesting Facts:\n  ${monumentContext.interestingFacts.map(f => `* ${f}`).join('\n  ')}`;
    }
    systemPrompt += `\n\nThe user is currently viewing this monument. When they refer to "this temple", "this monument", "its architecture", or "it", they are referring to ${monumentContext.name}.`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversation.map(msg => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: message }
  ];

  const timeoutMs = 15000; // 15s timeout
  let attempt = 0;
  const maxAttempts = 2; // initial attempt + max 1 retry

  try {
    while (attempt < maxAttempts) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log('[HERIXA-ASSISTANT] OpenAI request sent');

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.6,
            max_tokens: 800
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('[HERIXA-ASSISTANT] OpenAI response received');

        if (response.ok) {
          const data = await response.json() as any;
          const assistantText = data?.choices?.[0]?.message?.content;
          if (!assistantText) {
            throw new Error('Malformed response from OpenAI: empty message content');
          }

          return {
            success: true,
            message: assistantText
          };
        } else {
          const status = response.status;
          let errorBody: any = {};
          try {
            errorBody = await response.json();
          } catch (_) {
            // ignore
          }

          console.error(`[HERIXA-ASSISTANT] OpenAI request failed with HTTP ${status}. Details: ${JSON.stringify(errorBody)}`);

          const isQuotaExceeded =
            errorBody?.error?.code === 'insufficient_quota' ||
            errorBody?.code === 'insufficient_quota' ||
            errorBody?.error?.type === 'insufficient_quota' ||
            errorBody?.type === 'insufficient_quota' ||
            (errorBody?.error?.message && errorBody.error.message.toLowerCase().includes('quota')) ||
            (errorBody?.message && errorBody.message.toLowerCase().includes('quota')) ||
            (errorBody?.error?.message && errorBody.error.message.toLowerCase().includes('exceeded your current quota')) ||
            (errorBody?.message && errorBody.message.toLowerCase().includes('exceeded your current quota'));

          if (status === 429) {
            if (isQuotaExceeded) {
              console.log('[HERIXA-ASSISTANT] OpenAI quota exceeded');
              return {
                success: false,
                message: 'HERIXA Assistant is temporarily unavailable because the AI service quota has been reached. Please try again later.',
                errorDetails: 'OPENAI_QUOTA_EXCEEDED',
                statusCode: 429
              };
            } else {
              console.log('[HERIXA-ASSISTANT] Rate limited');
              if (attempt < maxAttempts) {
                console.log('[HERIXA-ASSISTANT] Retrying rate-limited OpenAI request in 1000ms...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
              } else {
                return {
                  success: false,
                  message: 'Too many requests right now. Please wait a moment and try again.',
                  errorDetails: 'RATE_LIMITED',
                  statusCode: 429
                };
              }
            }
          } else if (status === 401) {
            return {
              success: false,
              message: 'Authentication with AI provider failed. Please check server configuration.',
              errorDetails: 'AI_AUTH_ERROR',
              statusCode: 401
            };
          } else if (status === 500 || status === 502) {
            return {
              success: false,
              message: 'Heritage Assistant service is temporarily unavailable due to a server error. Please try again.',
              errorDetails: 'AI_SERVER_ERROR',
              statusCode: status
            };
          } else if (status === 503) {
            return {
              success: false,
              message: 'Heritage Assistant service is currently unavailable. Please try again later.',
              errorDetails: 'AI_UNAVAILABLE',
              statusCode: 503
            };
          }

          return {
            success: false,
            message: 'Heritage Assistant service is temporarily unavailable. Please try again.',
            errorDetails: 'AI_SERVER_ERROR',
            statusCode: status
          };
        }
      } catch (err: any) {
        clearTimeout(timeoutId);

        const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('timed out');
        if (isTimeout) {
          console.error(`[HERIXA-ASSISTANT] OpenAI request timed out on attempt ${attempt}`);
          if (attempt >= maxAttempts) {
            return {
              success: false,
              message: 'Heritage Assistant response timed out. Connection took too long.',
              errorDetails: 'REQUEST_TIMEOUT',
              statusCode: 408
            };
          }
        } else {
          console.error(`[HERIXA-ASSISTANT] OpenAI request failed on attempt ${attempt}: ${err.message || err}`);
          if (attempt >= maxAttempts) {
            return {
              success: false,
              message: 'Heritage Assistant is currently unavailable. Please check your network connection.',
              errorDetails: 'NETWORK_UNAVAILABLE',
              statusCode: 503
            };
          }
        }

        if (attempt < maxAttempts) {
          console.log('[HERIXA-ASSISTANT] Retrying failed network request in 1000ms...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return {
      success: false,
      message: 'Heritage Assistant is currently unavailable. Please check your network connection.',
      errorDetails: 'NETWORK_UNAVAILABLE',
      statusCode: 503
    };
  } finally {
    console.log('[HERIXA-ASSISTANT] Request completed');
  }
};

export const checkOpenAIHealth = async (): Promise<any> => {
  const apiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return {
      success: false,
      provider: 'openai',
      status: 'NOT_CONFIGURED',
      model: modelName,
      errorDetails: 'OPENAI_API_KEY_MISSING'
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.status === 401) {
      return {
        success: false,
        provider: 'openai',
        status: 'AUTH_FAILED',
        model: modelName,
        errorDetails: 'OPENAI_AUTH_FAILED'
      };
    }
    if (response.status === 429) {
      return {
        success: false,
        provider: 'openai',
        status: 'RATE_LIMITED',
        model: modelName,
        errorDetails: 'OPENAI_RATE_LIMITED'
      };
    }
    if (!response.ok) {
      return {
        success: false,
        provider: 'openai',
        status: 'UNAVAILABLE',
        model: modelName,
        errorDetails: 'OPENAI_UNAVAILABLE'
      };
    }

    return {
      success: true,
      provider: 'openai',
      status: 'READY',
      model: modelName
    };
  } catch (err) {
    return {
      success: false,
      provider: 'openai',
      status: 'UNAVAILABLE',
      model: modelName,
      errorDetails: 'OPENAI_UNAVAILABLE'
    };
  }
};
