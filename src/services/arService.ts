import { recognizeMonument as rawRecognize, RecognitionResult } from '../ar/monumentRecognition';
import { getARConfig as rawGetConfig } from '../ar/arConfig';
import { MonumentARConfig } from '../ar/types';
import { apiFetch } from './api';

export const recognizeMonument = async (frameData: any): Promise<RecognitionResult> => {
  return rawRecognize(frameData);
};

export const getARConfig = async (monumentId: string): Promise<MonumentARConfig | null> => {
  // Attempt to load from the backend API first
  try {
    const response = await apiFetch(`/api/monuments/${monumentId}/ar`);
    if (response && response.success && response.data) {
      const data = response.data;
      const { getImageUrl } = require('./monumentService');
      if (data.recognitionImageUrl) {
        data.recognitionImageUrl = getImageUrl(data.recognitionImageUrl);
      }
      return data;
    }
  } catch (err) {
    console.warn(`arService: Failed to fetch backend AR config for ${monumentId}. Using local fallback.`, err);
  }

  // Fallback to local config registry
  return rawGetConfig(monumentId);
};
