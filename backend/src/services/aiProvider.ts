import { ChatMessage, MonumentContext, AssistantServiceResponse } from './openaiService';
import { chatWithOpenAI, checkOpenAIHealth } from './openaiService';
import { chatWithGroq, checkGroqHealth } from './groqService';

export interface AssistantHealth {
  success: boolean;
  provider: string;
  status: 'ready' | 'unavailable' | 'auth_failed' | 'rate_limited' | 'model_unavailable' | 'not_configured';
  configuredModel?: string;
  selectedModel?: string;
  modelAvailable?: boolean;
  errorDetails?: string;
}

export { ChatMessage };

export const getActiveProviderHealth = async (): Promise<AssistantHealth> => {
  const provider = process.env.AI_ASSISTANT_PROVIDER || 'groq';

  if (provider === 'groq') {
    const health = await checkGroqHealth();
    return {
      success: health.success,
      provider: health.provider,
      status: health.status,
      configuredModel: health.configuredModel,
      selectedModel: health.selectedModel,
      modelAvailable: health.modelAvailable,
      errorDetails: health.errorDetails
    };
  } else if (provider === 'openai') {
    const health = await checkOpenAIHealth();
    let status: AssistantHealth['status'] = 'unavailable';
    if (health.status === 'READY') status = 'ready';
    else if (health.status === 'OPENAI_KEY_MISSING') status = 'not_configured';
    else if (health.status === 'AUTH_FAILED') status = 'auth_failed';
    else if (health.status === 'RATE_LIMITED') status = 'rate_limited';

    return {
      success: health.success,
      provider: health.provider,
      status,
      configuredModel: health.model,
      selectedModel: health.model,
      modelAvailable: health.success,
      errorDetails: health.errorDetails
    };
  } else {
    return {
      success: false,
      provider,
      status: 'not_configured',
      errorDetails: 'ASSISTANT_PROVIDER_NOT_CONFIGURED'
    };
  }
};

export const chatWithActiveProvider = async (
  message: string,
  conversation: ChatMessage[],
  monumentContext?: MonumentContext
): Promise<AssistantServiceResponse> => {
  const provider = process.env.AI_ASSISTANT_PROVIDER || 'groq';

  if (provider === 'groq') {
    return chatWithGroq(message, conversation, monumentContext);
  } else if (provider === 'openai') {
    return chatWithOpenAI(message, conversation, monumentContext);
  } else {
    return {
      success: false,
      message: 'HERIXA Assistant is currently unavailable.',
      errorDetails: 'ASSISTANT_PROVIDER_NOT_CONFIGURED',
      statusCode: 500
    };
  }
};
