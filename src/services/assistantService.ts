import { apiFetch } from './api';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface MonumentChatContext {
  name: string;
  location: string;
  period: string;
}

export interface AssistantChatResponse {
  success: boolean;
  message: string;
  errorDetails?: string;
}

export const askHeritageAssistant = async (
  message: string,
  conversation: ChatTurn[],
  monumentContext?: MonumentChatContext
): Promise<AssistantChatResponse> => {
  try {
    const result = await apiFetch('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation,
        monumentContext,
      }),
    });
    return result;
  } catch (err: any) {
    console.error('[HERIXA-FRONTEND-ASSISTANT] Request failed:', err);
    
    let errorDetails = 'AI_SERVICE_ERROR';
    let messageText = 'Heritage Assistant service is temporarily unavailable. Please try again.';

    const status = err.status || err.responseBody?.status;
    const bodyErrorDetails = err.responseBody?.errorDetails;
    const bodyMessage = err.responseBody?.message;

    if (err.isNetworkError) {
      errorDetails = 'NETWORK_UNAVAILABLE';
      messageText = 'Unable to connect to HERIXA Assistant. Please check your connection and try again.';
    } else if (err.isTimeout || status === 408) {
      errorDetails = 'REQUEST_TIMEOUT';
      messageText = 'Heritage Assistant request timed out. Please try again.';
    } else if (bodyErrorDetails === 'GROQ_RATE_LIMITED') {
      errorDetails = 'GROQ_RATE_LIMITED';
      messageText = 'HERIXA Assistant is temporarily busy. Please try again shortly.';
    } else if (bodyErrorDetails === 'GROQ_UNAVAILABLE') {
      errorDetails = 'GROQ_UNAVAILABLE';
      messageText = 'HERIXA Assistant is temporarily unavailable. Please try again later.';
    } else if (bodyErrorDetails === 'GROQ_AUTH_FAILED') {
      errorDetails = 'GROQ_AUTH_FAILED';
      messageText = 'HERIXA Assistant configuration needs attention.';
    } else if (bodyErrorDetails === 'GROQ_PERMISSION_DENIED') {
      errorDetails = 'GROQ_PERMISSION_DENIED';
      messageText = 'HERIXA Assistant permission denied. Please verify your Groq API subscription/role.';
    } else if (bodyErrorDetails === 'GROQ_MODEL_UNAVAILABLE') {
      errorDetails = 'GROQ_MODEL_UNAVAILABLE';
      messageText = 'HERIXA Assistant model is temporarily unavailable.';
    } else if (bodyErrorDetails === 'ASSISTANT_PROVIDER_NOT_CONFIGURED') {
      errorDetails = 'ASSISTANT_PROVIDER_NOT_CONFIGURED';
      messageText = 'HERIXA Assistant is currently unavailable.';
    } else if (bodyErrorDetails === 'OLLAMA_UNAVAILABLE') {
      errorDetails = 'OLLAMA_UNAVAILABLE';
      messageText = 'HERIXA Assistant is currently unavailable. Please start the local AI service and try again.';
    } else if (bodyErrorDetails === 'MODEL_NOT_FOUND') {
      errorDetails = 'MODEL_NOT_FOUND';
      messageText = 'HERIXA Assistant model is not installed on the AI server. Please configure the Ollama model before using the assistant.';
    } else if (bodyErrorDetails === 'OLLAMA_TIMEOUT') {
      errorDetails = 'OLLAMA_TIMEOUT';
      messageText = 'HERIXA Assistant is taking too long to respond. Please try again.';
    } else if (bodyErrorDetails === 'OPENAI_QUOTA_EXCEEDED') {
      errorDetails = 'OPENAI_QUOTA_EXCEEDED';
      messageText = 'HERIXA Assistant is temporarily unavailable. Please try again later.';
    } else if (bodyErrorDetails === 'RATE_LIMITED' || status === 429) {
      errorDetails = 'RATE_LIMITED';
      messageText = 'HERIXA AI is busy right now. Please wait a moment and try again.';
    } else if (bodyErrorDetails === 'AI_AUTH_ERROR' || status === 401) {
      errorDetails = 'AI_AUTH_ERROR';
      messageText = bodyMessage || 'AI authentication failed. Please contact support.';
    } else if (bodyErrorDetails === 'AI_UNAVAILABLE' || status === 503) {
      errorDetails = 'AI_UNAVAILABLE';
      messageText = bodyMessage || 'Heritage Assistant service is currently unavailable. Please try again later.';
    } else if (bodyErrorDetails === 'AI_SERVER_ERROR' || status === 500 || status === 502) {
      errorDetails = 'AI_SERVER_ERROR';
      messageText = bodyMessage || 'Heritage Assistant service is temporarily unavailable due to a server error. Please try again.';
    } else if (err.responseBody) {
      errorDetails = bodyErrorDetails || 'AI_SERVICE_ERROR';
      messageText = bodyMessage || messageText;
    }

    return {
      success: false,
      message: messageText,
      errorDetails,
    };
  }
};
