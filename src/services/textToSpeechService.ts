import * as Speech from 'expo-speech';
import { getLanguageByCode } from '../config/languages';

export const cleanTextForSpeech = (text: string): string => {
  if (!text) return '';
  
  let cleaned = text;
  
  // 1. Remove markdown syntax
  cleaned = cleaned.replace(/[\*\_`#~]/g, ''); // remove *, _, `, #, ~
  
  // 2. Remove markdown links [text](url) -> keep only text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // 3. Remove parenthetical descriptions or brackets containing URLs/technical stuff
  cleaned = cleaned.replace(/\((https?:\/\/[^\)]+|www\.[^\)]+)\)/gi, '');
  cleaned = cleaned.replace(/\[(https?:\/\/[^\\]+|www\.[^\\]+)\]/gi, '');
  
  // 4. Remove emojis and special decorative symbols (bullet points, emoji ranges)
  cleaned = cleaned.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
  
  // 5. Remove common formatting symbols like bullet points, dashes at start of lines, extra spaces
  cleaned = cleaned.replace(/^\s*[-•+\*]\s+/gm, ''); // remove bullet symbols
  cleaned = cleaned.replace(/\s+/g, ' '); // normalize whitespace
  
  return cleaned.trim();
};

class TextToSpeechService {
  private currentlySpeaking: boolean = false;

  /**
   * Speak a given text in the selected language.
   * @param text The string to speak aloud.
   * @param languageCode The language code ('en', 'ta', 'hi').
   * @param onStart Callback when speech starts.
   * @param onDone Callback when speech completes successfully.
   * @param onError Callback when speech fails.
   */
  public async speak(
    text: string,
    languageCode: string,
    onStart?: () => void,
    onDone?: () => void,
    onError?: (error: any) => void
  ): Promise<void> {
    try {
      // First stop any ongoing speech
      await this.stop();

      const cleanedText = cleanTextForSpeech(text);
      if (!cleanedText) {
        if (onDone) onDone();
        return;
      }

      const langConfig = getLanguageByCode(languageCode);
      const locale = langConfig.speechLocale;

      this.currentlySpeaking = true;
      if (onStart) onStart();

      // Find available voice matching the language code
      let voiceId: string | undefined = undefined;
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        // Look for exact match or starting with languageCode
        const matchingVoice = voices.find((v: Speech.Voice) => 
          v.language.toLowerCase() === locale.toLowerCase() || 
          v.language.toLowerCase().startsWith(languageCode.toLowerCase())
        );
        if (matchingVoice) {
          voiceId = matchingVoice.identifier;
          console.log(`[TTS] Selected voice ${matchingVoice.name} (${matchingVoice.language}) for language ${languageCode}`);
        }
      } catch (err) {
        console.warn('[TTS] Failed to retrieve system voices:', err);
      }

      const options: Speech.SpeechOptions = {
        language: locale,
        onStart: () => {
          this.currentlySpeaking = true;
        },
        onDone: () => {
          this.currentlySpeaking = false;
          if (onDone) onDone();
        },
        onStopped: () => {
          this.currentlySpeaking = false;
          if (onDone) onDone();
        },
        onError: (err) => {
          this.currentlySpeaking = false;
          console.warn(`[TTS] Speech engine error for ${languageCode}:`, err);
          
          // Graceful fallback: if specific language voice fails, try default system voice in English
          if (languageCode !== 'en') {
            console.log(`[TTS] Falling back to English voice for speech`);
            Speech.speak(cleanedText, {
              language: 'en-US',
              onStart: () => { this.currentlySpeaking = true; },
              onDone: () => { this.currentlySpeaking = false; if (onDone) onDone(); },
              onStopped: () => { this.currentlySpeaking = false; if (onDone) onDone(); },
              onError: (fallbackErr) => {
                this.currentlySpeaking = false;
                console.error('[TTS] Fallback speech failed:', fallbackErr);
                if (onError) onError(fallbackErr);
              }
            });
          } else {
            if (onError) onError(err);
          }
        },
      };

      if (voiceId) {
        options.voice = voiceId;
      }

      Speech.speak(cleanedText, options);
    } catch (err) {
      this.currentlySpeaking = false;
      console.warn('Failed to initialize speech engine:', err);
      if (onError) onError(err);
    }
  }

  /**
   * Stop any active speech.
   */
  public async stop(): Promise<void> {
    try {
      const speaking = await Speech.isSpeakingAsync();
      if (speaking || this.currentlySpeaking) {
        await Speech.stop();
        // Add a tiny sleep to let the OS speech engine release audio resources
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      this.currentlySpeaking = false;
    } catch (err) {
      console.warn('Failed to stop speech engine:', err);
      this.currentlySpeaking = false;
    }
  }


  /**
   * Check if speech is currently active.
   */
  public async isSpeaking(): Promise<boolean> {
    try {
      return (await Speech.isSpeakingAsync()) || this.currentlySpeaking;
    } catch (err) {
      return this.currentlySpeaking;
    }
  }
}

export const textToSpeechService = new TextToSpeechService();
export default textToSpeechService;
