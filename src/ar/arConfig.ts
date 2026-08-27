import { MonumentARConfig } from './types';

export const MONUMENT_AR_CONFIGS: Record<string, MonumentARConfig> = {
  'brihadeeswarar': {
    monumentId: 'brihadeeswarar',
    recognitionEnabled: true,
    recognitionMethod: 'image-target',
    recognitionImageUrl: '/uploads/monuments/brihadeeswarar.jpeg',
    minimumRecognitionConfidence: 0.85,
    physicalWidth: 0.15,
  },
  'meenakshi-amman': {
    monumentId: 'meenakshi-amman',
    recognitionEnabled: false,
    recognitionMethod: 'image-target',
    minimumRecognitionConfidence: 0.85,
  },
  'mahabalipuram': {
    monumentId: 'mahabalipuram',
    recognitionEnabled: false,
    recognitionMethod: 'image-target',
    minimumRecognitionConfidence: 0.85,
  },
  'gangaikonda-cholapuram': {
    monumentId: 'gangaikonda-cholapuram',
    recognitionEnabled: false,
    recognitionMethod: 'image-target',
    minimumRecognitionConfidence: 0.85,
  },
  'airavatesvara': {
    monumentId: 'airavatesvara',
    recognitionEnabled: false,
    recognitionMethod: 'image-target',
    minimumRecognitionConfidence: 0.85,
  },
  'thirumalai-nayakkar': {
    monumentId: 'thirumalai-nayakkar',
    recognitionEnabled: false,
    recognitionMethod: 'image-target',
    minimumRecognitionConfidence: 0.85,
  },
};

export const getARConfig = (monumentId: string): MonumentARConfig | null => {
  // Try to find by direct slug/id mapping
  if (MONUMENT_AR_CONFIGS[monumentId]) {
    return MONUMENT_AR_CONFIGS[monumentId];
  }
  // Fallback case-insensitive check
  const found = Object.values(MONUMENT_AR_CONFIGS).find(
    cfg => cfg.monumentId.toLowerCase() === monumentId.toLowerCase()
  );
  return found || null;
};
