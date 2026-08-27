export type ARState =
  | 'idle'
  | 'initializing'
  | 'scanning'
  | 'recognized'
  | 'targetLost'
  | 'modelLoading'
  | 'modelError'
  | 'error';

export type ARCapabilityStatus =
  | 'preview'
  | 'nativeARAvailable'
  | 'unsupported'
  | 'permissionDenied'
  | 'initializing'
  | 'scanning'
  | 'recognized'
  | 'targetLost'
  | 'modelLoading'
  | 'modelError'
  | 'error';

export type ARCapabilityReason =
  | 'SUPPORTED'
  | 'UNSUPPORTED_DEVICE'
  | 'ARCORE_NOT_INSTALLED'
  | 'NATIVE_MODULE_UNAVAILABLE'
  | 'UNKNOWN';

export interface ARCapabilityResult {
  supported: boolean;
  reason: ARCapabilityReason;
}

export interface MonumentARConfig {
  monumentId: string;
  slug?: string;
  recognitionEnabled: boolean;
  recognitionMethod?: 'image-target' | 'vision';
  recognitionImageUrl?: string;
  referenceImages?: string[];
  minimumRecognitionConfidence?: number;
  isTestModel?: boolean;
  physicalWidth?: number;
}
