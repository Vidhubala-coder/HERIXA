import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import {
  getHeritageHistory,
  splitIntoChunks,
  SupportedLanguage,
  NarrationContext,
} from '../utils/narrationBuilder';
import { textToSpeechService } from '../services/textToSpeechService';
import { getLanguageByCode } from '../config/languages';

interface Props {
  monumentId: string;
  monumentName: string;
  dynasty?: string;
  confidence?: number;
  initialLanguage?: SupportedLanguage;
  /** Auto-start narration when the component mounts */
  autoPlay?: boolean;
  /** Called when this card starts speaking, so parent can stop other audio */
  onPlaybackStart?: () => void;
  /** Parent passes a ref; we assign a stop function to it so parent can stop us */
  stopSignalRef?: React.MutableRefObject<(() => void) | null>;
}

type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped';

export const HeritageHistoryVoiceCard: React.FC<Props> = ({
  monumentId,
  monumentName,
  dynasty,
  confidence = 0.95,
  initialLanguage = 'en',
  autoPlay = false,
  onPlaybackStart,
  stopSignalRef,
}) => {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(initialLanguage);
  const [historyText, setHistoryText] = useState<string>('');
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [hasAudioError, setHasAudioError] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Unconditional hook setup
  useEffect(() => {
    isMountedRef.current = true;
    // Register stop function with parent
    if (stopSignalRef) {
      stopSignalRef.current = () => {
        textToSpeechService.stop().catch(() => {});
        if (isMountedRef.current) setPlaybackState('stopped');
      };
    }
    return () => {
      isMountedRef.current = false;
      textToSpeechService.stop().catch(() => {});
      if (stopSignalRef) stopSignalRef.current = null;
    };
  }, []);

  // Update narration text when language or monument changes
  useEffect(() => {
    const ctx: NarrationContext = {
      monumentId,
      monumentName,
      confidence,
      dynasty,
    };
    const text = getHeritageHistory(ctx, selectedLang);
    setHistoryText(text);
    setHasAudioError(false);

    if (playbackState === 'playing') {
      textToSpeechService.stop().then(() => {
        if (isMountedRef.current) {
          startSpeech(text, selectedLang);
        }
      });
    }
  }, [monumentId, monumentName, selectedLang]);

  // Auto-play on mount (if requested)
  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (!autoPlay || autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    const ctx: NarrationContext = { monumentId, monumentName, confidence, dynasty };
    const text = getHeritageHistory(ctx, selectedLang);
    if (text) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) startSpeech(text, selectedLang);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoPlay]);

  // Pulse animation during voice playback
  useEffect(() => {
    if (playbackState === 'playing') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [playbackState]);

  const startSpeech = useCallback(async (text: string, lang: SupportedLanguage) => {
    if (!text) return;
    setHasAudioError(false);
    // Notify parent so it can stop other audio players
    onPlaybackStart?.();
    const chunks = splitIntoChunks(text, 450);
    if (isMountedRef.current) {
      setProgress({ current: 0, total: chunks.length });
      setPlaybackState('playing');
    }

    await textToSpeechService.speakChunked(
      chunks,
      lang,
      () => {
        if (isMountedRef.current) setPlaybackState('playing');
      },
      (idx, total) => {
        if (isMountedRef.current) setProgress({ current: idx + 1, total });
      },
      () => {
        if (isMountedRef.current) setPlaybackState('stopped');
      },
      (err) => {
        console.warn('[HeritageHistoryVoiceCard] TTS playback error:', err);
        if (isMountedRef.current) {
          setPlaybackState('stopped');
          setHasAudioError(true);
        }
      }
    );
  }, [onPlaybackStart]);

  const handlePlayPauseToggle = async () => {
    if (playbackState === 'playing') {
      await textToSpeechService.stop();
      if (isMountedRef.current) setPlaybackState('paused');
    } else {
      startSpeech(historyText, selectedLang);
    }
  };

  const handleStop = async () => {
    await textToSpeechService.stop();
    if (isMountedRef.current) setPlaybackState('stopped');
  };

  const langLabelMap: Record<SupportedLanguage, string> = {
    en: 'EN',
    ta: 'தமிழ்',
    hi: 'हिंदी',
    te: 'తెలుగు',
    ml: 'മലയാളം',
    kn: 'ಕನ್ನಡ',
  };

  return (
    <View style={styles.container}>
      {/* Header & 6-Language Selector */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={{ fontSize: 18, marginRight: 6 }}>🎙️</Text>
          <Text style={styles.headerTitle}>Heritage History</Text>
          <View style={styles.historyBadge}>
            <Text style={styles.historyBadgeText}>HISTORICAL STORY</Text>
          </View>
        </View>

        {/* 6-Language Selection Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langSelector}>
          {(['en', 'ta', 'hi', 'te', 'ml', 'kn'] as SupportedLanguage[]).map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.langChip, selectedLang === l && styles.langChipActive]}
              onPress={() => setSelectedLang(l)}
              activeOpacity={0.8}
            >
              <Text style={[styles.langChipText, selectedLang === l && styles.langChipTextActive]}>
                {langLabelMap[l]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.subtitle}>
        Listen to the story behind {monumentName}
      </Text>

      {/* Audio Error Banner */}
      {hasAudioError && (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => startSpeech(historyText, selectedLang)}
          activeOpacity={0.85}
        >
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.terracotta} style={{ marginRight: 6 }} />
          <Text style={styles.errorBannerText}>
            Audio engine warning for {langLabelMap[selectedLang]} — Tap to Retry
          </Text>
        </TouchableOpacity>
      )}

      {/* Audio Player Card */}
      <View style={styles.playerCard}>
        <Animated.View style={[styles.micBox, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons
            name={playbackState === 'playing' ? 'volume-high' : 'book-outline'}
            size={22}
            color={playbackState === 'playing' ? COLORS.gold : COLORS.primary}
          />
        </Animated.View>

        <View style={styles.playerInfo}>
          <Text style={styles.playerTitle}>
            {playbackState === 'playing'
              ? `Narrating History in ${langLabelMap[selectedLang]}...`
              : playbackState === 'paused'
              ? 'Heritage History Paused'
              : 'Narrative Heritage History'}
          </Text>
          <Text style={styles.playerSubtitle}>
            {playbackState === 'playing' && progress.total > 0
              ? `Section ${progress.current} of ${progress.total}`
              : `Historical origin, dynasty & cultural legacy`}
          </Text>
        </View>

        <View style={styles.playerControls}>
          <TouchableOpacity style={styles.playBtn} onPress={handlePlayPauseToggle} activeOpacity={0.85}>
            <Ionicons
              name={playbackState === 'playing' ? 'pause' : 'play'}
              size={18}
              color={COLORS.white}
            />
          </TouchableOpacity>

          {playbackState === 'playing' && (
            <TouchableOpacity style={styles.stopBtn} onPress={handleStop} activeOpacity={0.85}>
              <Ionicons name="stop" size={14} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* History Prose Display */}
      <View style={styles.historyCard}>
        <Text style={styles.historyText}>{historyText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginRight: 6,
  },
  historyBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  historyBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  langChipActive: {
    backgroundColor: COLORS.gold,
  },
  langChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  langChipTextActive: {
    color: COLORS.background,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  micBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surfaceIvory,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderWarm,
  },
  playerInfo: {
    flex: 1,
  },
  playerTitle: {
    fontSize: TYPOGRAPHY.bodyMedium.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  playerSubtitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.terracotta,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyCard: {
    backgroundColor: COLORS.surfaceIvory,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderWarm,
  },
  historyText: {
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0ED',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.terracotta,
    marginBottom: SPACING.sm,
  },
  errorBannerText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '700',
    color: COLORS.terracotta,
  },
});
