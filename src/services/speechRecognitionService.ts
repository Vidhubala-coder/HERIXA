import { Platform } from 'react-native';

let ExpoSpeechRecognitionModule: any = null;
let ExpoWebSpeechRecognition: any = null;
let isNativeModuleAvailable = false;

try {
  // Dynamically load the package inside a try/catch block
  // to avoid application crash in Expo Go where the native module is missing
  const SpeechRecognitionPackage = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = SpeechRecognitionPackage.ExpoSpeechRecognitionModule;
  ExpoWebSpeechRecognition = SpeechRecognitionPackage.ExpoWebSpeechRecognition;
  isNativeModuleAvailable = !!ExpoSpeechRecognitionModule;
} catch (err) {
  console.warn('[HERIXA VOICE] Native module ExpoSpeechRecognition is unavailable (running in Expo Go). Fallback active.');
}

export interface SpeechRecognitionResult {
  text: string;
  error?: string;
}

class SpeechRecognitionService {
  private activeRecognition: any = null;

  /**
   * Check if speech recognition is supported and available on the current device.
   */
  public async isAvailable(): Promise<boolean> {
    try {
      if (!isNativeModuleAvailable) {
        return false;
      }
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
      }
      return await ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch (err) {
      console.warn('[HERIXA VOICE] Speech recognition availability check failed:', err);
      return false;
    }
  }

  /**
   * Request microphone and speech recognition permissions.
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      if (!isNativeModuleAvailable) {
        return false;
      }
      console.log('[HERIXA VOICE] Permission status checking...');
      const status = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      console.log('[HERIXA VOICE] Current permission status:', status.status);

      if (status.granted) {
        return true;
      }

      const request = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      console.log('[HERIXA VOICE] Permission request result:', request.status);
      return request.granted;
    } catch (error) {
      console.warn('[HERIXA VOICE] Microphone/Speech permission request failed:', error);
      return false;
    }
  }

  /**
   * Start recording and transcribing speech to text.
   * @param languageCode The locale code e.g. 'en-US', 'ta-IN', 'hi-IN'
   * @param onSpeechResult Callback when transcript segments are available
   * @param onSpeechError Callback on errors
   */
  public startListening(
    languageCode: string,
    onSpeechResult: (text: string, isFinal: boolean) => void,
    onSpeechError: (error: string) => void
  ): void {
    try {
      if (!isNativeModuleAvailable || !ExpoWebSpeechRecognition) {
        throw new Error('Voice input is unavailable in this app build. Please use the development build with speech recognition support.');
      }

      console.log(`[HERIXA VOICE] Recording started with language: ${languageCode}`);
      
      // Stop any active recognition session first
      this.stopListening();

      const recognition = new ExpoWebSpeechRecognition();
      recognition.lang = languageCode;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        let isFinal = false;

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]) {
            fullTranscript += result[0].transcript;
            if (result.isFinal) {
              isFinal = true;
            }
          }
        }

        onSpeechResult(fullTranscript, isFinal);
      };

      recognition.onerror = (event: any) => {
        console.error('[HERIXA VOICE] Error event:', event.error || event.message || event);
        onSpeechError(event.error || 'Speech recognition failed');
      };

      recognition.onend = () => {
        console.log('[HERIXA VOICE] Recording stopped');
      };

      this.activeRecognition = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('[HERIXA VOICE] Failed to start speech recognition:', err);
      onSpeechError(err.message || 'Failed to start voice input');
    }
  }

  /**
   * Stop recording and process results.
   */
  public stopListening(): void {
    if (this.activeRecognition) {
      try {
        this.activeRecognition.stop();
      } catch (err) {
        console.warn('[HERIXA VOICE] Error stopping recognition:', err);
      } finally {
        this.activeRecognition = null;
      }
    }
  }

  /**
   * Cancel recording immediately without processing results.
   */
  public cancelListening(): void {
    if (this.activeRecognition) {
      try {
        // Remove event handlers to prevent final results
        this.activeRecognition.onresult = null;
        this.activeRecognition.onerror = null;
        this.activeRecognition.onend = null;
        this.activeRecognition.abort();
      } catch (err) {
        console.warn('[HERIXA VOICE] Error cancelling recognition:', err);
      } finally {
        this.activeRecognition = null;
      }
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
export default speechRecognitionService;
