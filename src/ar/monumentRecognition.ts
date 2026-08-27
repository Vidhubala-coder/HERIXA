export interface RecognitionResult {
  recognized: boolean;
  monumentId?: string;
  confidence?: number;
  timestamp: number;
  recognitionMethod?: 'image-target' | 'vision';
  reason?:
    | 'NATIVE_AR_UNAVAILABLE'
    | 'NO_TARGET_FOUND'
    | 'ASSET_NOT_CONFIGURED'
    | 'PERMISSION_DENIED'
    | 'DEVICE_UNSUPPORTED'
    | 'INITIALIZATION_FAILED'
    | 'UNKNOWN_ERROR';
}

export interface RecognitionProvider {
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  recognize(frameData: any): Promise<RecognitionResult>;
  dispose(): Promise<void>;
}

export class PreviewRecognitionProvider implements RecognitionProvider {
  async initialize(): Promise<void> {}
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async recognize(frameData: any): Promise<RecognitionResult> {
    return {
      recognized: false,
      reason: 'NATIVE_AR_UNAVAILABLE',
      timestamp: Date.now(),
      recognitionMethod: 'image-target',
    };
  }
  async dispose(): Promise<void> {}
}

export class NativeARRecognitionProvider implements RecognitionProvider {
  private isInitialized = false;
  private isRunning = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('NativeARRecognitionProvider: Provider not initialized.');
    }
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  async recognize(frameData: any): Promise<RecognitionResult> {
    if (!this.isRunning) {
      return {
        recognized: false,
        reason: 'INITIALIZATION_FAILED',
        timestamp: Date.now(),
        recognitionMethod: 'image-target',
      };
    }
    // Return NO_TARGET_FOUND because native targets are not loaded/configured yet
    return {
      recognized: false,
      reason: 'NO_TARGET_FOUND',
      timestamp: Date.now(),
      recognitionMethod: 'image-target',
    };
  }

  async dispose(): Promise<void> {
    this.isInitialized = false;
    this.isRunning = false;
  }
}

/**
 * Convenience export to preserve existing imports if any
 */
export const recognizeMonument = async (frameData: any): Promise<RecognitionResult> => {
  const provider = new PreviewRecognitionProvider();
  return provider.recognize(frameData);
};
