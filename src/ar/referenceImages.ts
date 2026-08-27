import { MonumentARConfig } from './types';
import { MONUMENT_AR_CONFIGS } from './arConfig';

export const REFERENCE_IMAGES: Record<string, MonumentARConfig> = {
  'brihadeeswarar': MONUMENT_AR_CONFIGS['brihadeeswarar'],
};

export const getReferenceImageConfig = (monumentId: string): MonumentARConfig | null => {
  if (REFERENCE_IMAGES[monumentId]) {
    return REFERENCE_IMAGES[monumentId];
  }
  // Case-insensitive fallback
  const found = Object.values(REFERENCE_IMAGES).find(
    cfg => cfg.monumentId.toLowerCase() === monumentId.toLowerCase()
  );
  return found || null;
};
