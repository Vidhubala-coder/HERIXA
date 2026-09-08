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
  getHowToExperienceGuide,
  HowToExperienceGuideData,
  VoiceGuideLanguage,
} from '../services/monumentVoiceGuideService';
import { textToSpeechService } from '../services/textToSpeechService';
import { splitIntoChunks } from '../utils/narrationBuilder';

interface Props {
  monumentId: string;
  monumentName: string;
  initialLanguage?: VoiceGuideLanguage;
  onOpenFullProtocol?: () => void;
  /** Called when this guide starts speaking, so parent can stop other audio */
  onPlaybackStart?: () => void;
  /** Parent passes a ref; we assign a stop function so parent can stop us */
  stopSignalRef?: React.MutableRefObject<(() => void) | null>;
}

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped';

export const HowToExperienceVoiceGuide: React.FC<Props> = ({
  monumentId,
  monumentName,
  initialLanguage = 'en',
  onOpenFullProtocol,
  onPlaybackStart,
  stopSignalRef,
}) => {
  const [selectedLang, setSelectedLang] = useState<VoiceGuideLanguage>(initialLanguage);
  const [guideData, setGuideData] = useState<HowToExperienceGuideData>(() =>
    getHowToExperienceGuide(monumentId, monumentName, initialLanguage)
  );
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [hasAudioError, setHasAudioError] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Unconditional hook setup
  useEffect(() => {
    isMountedRef.current = true;
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

  // Update guide data when language or monument changes
  useEffect(() => {
    const updated = getHowToExperienceGuide(monumentId, monumentName, selectedLang);
    setGuideData(updated);
    setHasAudioError(false);

    if (playbackState === 'playing') {
      // Re-start narration in new language
      textToSpeechService.stop().then(() => {
        if (isMountedRef.current) {
          startSpeech(updated.fullNarrationText, selectedLang);
        }
      });
    }
  }, [monumentId, monumentName, selectedLang]);

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

  const startSpeech = useCallback(async (text: string, lang: VoiceGuideLanguage) => {
    if (!text) return;
    setHasAudioError(false);
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
        console.warn('[HowToExperienceVoiceGuide] TTS playback error:', err);
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
      startSpeech(guideData.fullNarrationText, selectedLang);
    }
  };

  const handleStop = async () => {
    await textToSpeechService.stop();
    if (isMountedRef.current) setPlaybackState('stopped');
  };

  const langLabelMap: Record<VoiceGuideLanguage, string> = {
    en: 'EN',
    ta: 'தமிழ்',
    hi: 'हिंदी',
    te: 'తెలుగు',
    ml: 'മലയാളം',
    kn: 'ಕನ್ನಡ',
  };

  return (
    <View style={styles.container}>
      {/* Section Header & Subtitle */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={{ fontSize: 18, marginRight: 6 }}>🎧</Text>
          <Text style={styles.headerTitle}>How to Experience</Text>
          <View style={styles.voiceBadge}>
            <Ionicons name="mic-outline" size={10} color={COLORS.white} style={{ marginRight: 3 }} />
            <Text style={styles.voiceBadgeText}>VOICE GUIDE</Text>
          </View>
        </View>

        {/* 6-Language Selection Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langSelector}>
          {(['en', 'ta', 'hi', 'te', 'ml', 'kn'] as VoiceGuideLanguage[]).map((l) => (
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
        Your voice-guided heritage experience for {guideData.monumentName}
      </Text>

      {/* Audio Error Banner */}
      {hasAudioError && (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => startSpeech(guideData.fullNarrationText, selectedLang)}
          activeOpacity={0.85}
        >
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.terracotta} style={{ marginRight: 6 }} />
          <Text style={styles.errorBannerText}>
            Audio engine warning for {langLabelMap[selectedLang]} — Tap to Retry
          </Text>
        </TouchableOpacity>
      )}

      {/* Voice Instruction Control Player Card */}
      <View style={styles.playerCard}>
        <Animated.View style={[styles.micBox, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons
            name={playbackState === 'playing' ? 'volume-high' : 'headset'}
            size={22}
            color={playbackState === 'playing' ? COLORS.gold : COLORS.primary}
          />
        </Animated.View>

        <View style={styles.playerInfo}>
          <Text style={styles.playerTitle}>
            {playbackState === 'playing'
              ? `Speaking in ${langLabelMap[selectedLang]}...`
              : playbackState === 'paused'
              ? 'Voice Guide Paused'
              : 'Voice-Guided Visitor Instructions'}
          </Text>
          <Text style={styles.playerSubtitle}>
            {playbackState === 'playing' && progress.total > 0
              ? `Section ${progress.current} of ${progress.total}`
              : `Listen to audio tour in ${langLabelMap[selectedLang]}`}
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

      {/* 7 Structured Guidance Cards */}
      <View style={styles.guidanceCardsContainer}>
        {/* 1. Start Here */}
        <View style={styles.guideCard}>
          <View style={styles.cardHeader}>
            <Feather name="navigation" size={16} color={COLORS.gold} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>1. Start Here</Text>
          </View>
          <Text style={styles.routeText}>{guideData.startHere}</Text>
        </View>

        {/* 2. Don't Miss */}
        <View style={styles.guideCard}>
          <View style={styles.cardHeader}>
            <Feather name="star" size={16} color={COLORS.gold} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>2. Don't Miss</Text>
          </View>
          {guideData.dontMiss.map((item: string, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.dot} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* 3. Look Closely */}
        <View style={styles.guideCard}>
          <View style={styles.cardHeader}>
            <Feather name="eye" size={16} color={COLORS.gold} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>3. Look Closely</Text>
          </View>
          {guideData.lookClosely.map((item: string, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Ionicons name="sparkles-outline" size={14} color={COLORS.gold} style={{ marginRight: 6 }} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* 4. Experience the Space */}
        <View style={styles.guideCard}>
          <View style={styles.cardHeader}>
            <Feather name="box" size={16} color={COLORS.gold} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>4. Experience the Space</Text>
          </View>
          <Text style={styles.routeText}>{guideData.experienceTheSpace}</Text>
        </View>

        {/* 5. Photography Tips */}
        <View style={styles.guideCard}>
          <View style={styles.cardHeader}>
            <Feather name="camera" size={16} color={COLORS.gold} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>5. Photography Tips</Text>
          </View>
          <Text style={styles.routeText}>{guideData.photographyTips}</Text>
        </View>

        {/* 6. Respect the Heritage */}
        <View style={styles.guideCardAccent}>
          <View style={styles.cardHeader}>
            <Feather name="shield" size={16} color={COLORS.gold} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitleGold}>6. Respect the Heritage</Text>
          </View>
          <Text style={styles.preservationText}>{guideData.respectHeritage}</Text>
        </View>

        {/* 7. Before You Leave */}
        <View style={styles.guideCard}>
          <View style={styles.cardHeader}>
            <Feather name="check-circle" size={16} color={COLORS.gold} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>7. Before You Leave</Text>
          </View>
          <Text style={styles.routeText}>{guideData.beforeYouLeave}</Text>
        </View>
      </View>

      {/* Optional link to open full protocol screen / modal */}
      {onOpenFullProtocol && (
        <TouchableOpacity style={styles.fullProtocolBtn} onPress={onOpenFullProtocol} activeOpacity={0.8}>
          <Feather name="file-text" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.fullProtocolBtnText}>View Source-Verified Protocol Records</Text>
          <Feather name="chevron-right" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      )}
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
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  voiceBadgeText: {
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
    backgroundColor: COLORS.surfaceIvory,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderWarm,
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
    backgroundColor: COLORS.white,
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
  guidanceCardsContainer: {
    gap: SPACING.md,
  },
  guideCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guideCardAccent: {
    backgroundColor: COLORS.surfaceIvory,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderWarm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.bodyMedium.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardTitleGold: {
    fontSize: TYPOGRAPHY.bodyMedium.fontSize,
    fontWeight: '700',
    color: COLORS.gold,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginTop: 6,
    marginRight: 8,
  },
  itemText: {
    flex: 1,
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  routeText: {
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  preservationText: {
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
    color: COLORS.textPrimary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  fullProtocolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullProtocolBtnText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '700',
    color: COLORS.primary,
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
