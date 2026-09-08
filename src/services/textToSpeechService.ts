import * as Speech from "expo-speech";
import { getLanguageByCode } from "../config/languages";

export const cleanTextForSpeech = (text: string): string => {
  if (!text) return "";
  let cleaned = text;

  // Strip section headers like "1. Start Here", "2. Don't Miss", etc.
  cleaned = cleaned.replace(/^\s*\d+\.\s*(Start Here|Don't Miss|Look Closely|Experience the Space|Photography Tips|Respect the Heritage|Before You Leave)\s*/gmi, "");
  
  // Strip title prefixes like "Start here:", "What to see:", "Photography tips:", etc.
  cleaned = cleaned.replace(/\b(Start here|Don't miss|What to see|Look closely|Experience the space|Photography tips|Respect the heritage|Before you leave|Historical origin|Ruler \/ Dynasty|Historical significance|Architecture & History|Key Details|Key Facts|Architecture Highlights)\s*:?\s*/gmi, "");

  cleaned = cleaned.replace(/^#+\s+/gm, "");
  cleaned = cleaned.replace(/[\*\_`#~]/g, "");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  cleaned = cleaned.replace(/\((https?:\/\/[^\)]+|www\.[^\)]+)\)/gi, "");
  cleaned = cleaned.replace(/\[(https?:\/\/[^\\]+|www\.[^\\]+)\]/gi, "");
  cleaned = cleaned.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/\s+/g, " ");
  return cleaned.trim();
};

class TextToSpeechService {
  private currentlySpeaking = false;
  private stopRequested = false;

  // ── Single-chunk speak ──────────────────────────────────────────────────
  public async speak(
    text: string,
    languageCode: string,
    onStart?: () => void,
    onDone?: () => void,
    onError?: (error: any) => void
  ): Promise<void> {
    try {
      await this.stop();
      this.stopRequested = false;
      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) { if (onDone) onDone(); return; }
      const locale = getLanguageByCode(languageCode).speechLocale;
      this.currentlySpeaking = true;
      if (onStart) onStart();
      const voiceId = await this._findVoice(locale, languageCode);
      const opts: Speech.SpeechOptions = {
        language: locale,
        onStart: () => { this.currentlySpeaking = true; },
        onDone: () => { this.currentlySpeaking = false; if (onDone) onDone(); },
        onStopped: () => { this.currentlySpeaking = false; if (onDone) onDone(); },
        onError: (err) => {
          this.currentlySpeaking = false;
          if (onError) onError(err);
        },
      };
      if (voiceId) opts.voice = voiceId;
      Speech.speak(cleaned, opts);
    } catch (err) {
      this.currentlySpeaking = false;
      if (onError) onError(err);
    }
  }

  // ── Multi-chunk sequential speak ────────────────────────────────────────
  public async speakChunked(
    chunks: string[],
    languageCode: string,
    onStart?: () => void,
    onChunkDone?: (index: number, total: number) => void,
    onAllDone?: () => void,
    onError?: (error: any) => void
  ): Promise<void> {
    if (!chunks.length) { if (onAllDone) onAllDone(); return; }
    await this.stop();
    this.stopRequested = false;
    const locale = getLanguageByCode(languageCode).speechLocale;
    const voiceId = await this._findVoice(locale, languageCode);
    this.currentlySpeaking = true;
    if (onStart) onStart();

    let consecutiveErrors = 0;
    const speakChunk = (i: number): void => {
      if (this.stopRequested || i >= chunks.length) {
        this.currentlySpeaking = false;
        if (!this.stopRequested && onAllDone) onAllDone();
        return;
      }
      const cleaned = cleanTextForSpeech(chunks[i]);
      if (!cleaned) {
        if (onChunkDone) onChunkDone(i, chunks.length);
        speakChunk(i + 1);
        return;
      }
      const opts: Speech.SpeechOptions = {
        language: locale,
        onDone: () => {
          consecutiveErrors = 0;
          if (onChunkDone) onChunkDone(i, chunks.length);
          setTimeout(() => speakChunk(i + 1), 100);
        },
        onStopped: () => { this.currentlySpeaking = false; },
        onError: (err) => {
          consecutiveErrors++;
          if (consecutiveErrors >= 2) {
            this.currentlySpeaking = false;
            if (onError) onError(err);
          } else {
            setTimeout(() => speakChunk(i + 1), 150);
          }
        },
      };
      if (voiceId) opts.voice = voiceId;
      Speech.speak(cleaned, opts);
    };
    speakChunk(0);
  }

  // ── Stop ────────────────────────────────────────────────────────────────
  public async stop(): Promise<void> {
    this.stopRequested = true;
    try {
      if ((await Speech.isSpeakingAsync()) || this.currentlySpeaking) {
        await Speech.stop();
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (_) {}
    this.currentlySpeaking = false;
  }

  public async isSpeaking(): Promise<boolean> {
    try { return (await Speech.isSpeakingAsync()) || this.currentlySpeaking; }
    catch (_) { return this.currentlySpeaking; }
  }

  public getIsSpeaking(): boolean { return this.currentlySpeaking; }

  // ── Private helpers ─────────────────────────────────────────────────────
  private async _findVoice(locale: string, langCode: string): Promise<string | undefined> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const m = voices.find((v: Speech.Voice) =>
        v.language.toLowerCase() === locale.toLowerCase() ||
        v.language.toLowerCase().startsWith(langCode.toLowerCase())
      );
      return m?.identifier;
    } catch (_) { return undefined; }
  }
}

export const textToSpeechService = new TextToSpeechService();
export default textToSpeechService;
