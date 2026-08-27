import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { ApiMonument, getImageUrl, getWikimediaFallback } from '../../services/monumentService';
import { SafeImage } from '../SafeImage';
import { LANGUAGES } from '../../config/languages';

interface ARMonumentInfoProps {
  monument: ApiMonument | null;
  onViewDetails: () => void;
  onFavoriteToggle: () => void;
  isFavorite: boolean;
  onAskAssistant: () => void;
  confidence?: number;
  onScanAgain?: () => void;
  detectedFeature?: string | null;
  detectedObjectType?: string | null;
  matchedFeatures?: string[];
  onStartAR?: () => void;
  onViewGallery?: () => void;
  
  // Voice Tour Guide narration props
  isNarrating?: boolean;
  narrationPaused?: boolean;
  onNarratePlayPause?: () => void;
  onNarrateStop?: () => void;
  onNarrateReplay?: () => void;
  selectedLanguage?: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn';
  onLanguageChange?: (lang: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn') => void;
}

export const ARMonumentInfo: React.FC<ARMonumentInfoProps> = ({
  monument,
  onViewDetails,
  onFavoriteToggle,
  isFavorite,
  onAskAssistant,
  confidence,
  onScanAgain,
  detectedFeature,
  detectedObjectType,
  matchedFeatures,
  onStartAR,
  onViewGallery,
  
  isNarrating = false,
  narrationPaused = false,
  onNarratePlayPause,
  onNarrateStop,
  onNarrateReplay,
  selectedLanguage = 'en',
  onLanguageChange,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!monument) return null;

  const isImageUnavailable = !monument.image || imageError;

  // Determine user-friendly confidence representation
  const getConfidenceLevel = (val: number | undefined): { label: string; color: string } => {
    if (val === undefined) return { label: 'High', color: COLORS.gold };
    if (val >= 0.80) return { label: 'High', color: '#34C759' }; // iOS Green
    if (val >= 0.60) return { label: 'Possible Match', color: COLORS.gold }; // Gold
    return { label: 'Low', color: '#FF3B30' }; // iOS Red
  };

  const confLevel = getConfidenceLevel(confidence);

  return (
    <View style={styles.container}>
      {/* Premium Verification Status Banner */}
      <View style={styles.verificationBanner}>
        <Feather name="check-circle" size={14} color={COLORS.gold} style={{ marginRight: 6 }} />
        <Text style={styles.verificationBannerText}>✓ Heritage Site Recognized</Text>
      </View>

      {/* Real Photograph Display */}
      <View style={styles.imageWrapper}>
        <SafeImage
          source={getImageUrl(monument?.image)}
          fallbackSource={getWikimediaFallback(monument)}
          style={styles.cardImage}
          resizeMode="cover"
        />
      </View>

      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{monument.name}</Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.confidenceText, { color: confLevel.color }]}>
              Confidence: {confLevel.label}
            </Text>
            {detectedFeature && (
              <Text style={styles.detectedText}>
                • Detected: {detectedObjectType ? detectedObjectType.charAt(0).toUpperCase() + detectedObjectType.slice(1) : 'Heritage'} / {detectedFeature}
              </Text>
            )}
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {monument.location}, {monument.state} • {monument.constructionPeriod || monument.period || 'Ancient'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.favoriteButton} onPress={onFavoriteToggle} activeOpacity={0.8}>
          <Ionicons
            name={isFavorite ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isFavorite ? COLORS.gold : COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Matched Features Checklist */}
      {matchedFeatures && matchedFeatures.length > 0 && (
        <View style={styles.featuresList}>
          <Text style={styles.featuresListTitle}>Matched Features:</Text>
          {matchedFeatures.map((feat, idx) => (
            <Text key={idx} style={styles.featureItem}>
              • {feat}
            </Text>
          ))}
        </View>
      )}

      {/* Voice Tour Guide Narration Controls */}
      <View style={styles.voiceControlBar}>
        <View style={styles.voiceTitleRow}>
          <Feather name="volume-2" size={14} color={COLORS.gold} />
          <Text style={styles.voiceTitleText}>Voice Tour Guide</Text>
        </View>
        <View style={styles.voiceButtonsRow}>
          <TouchableOpacity style={styles.voiceControlBtn} onPress={onNarratePlayPause} activeOpacity={0.7}>
            <Feather name={isNarrating && !narrationPaused ? "pause" : "play"} size={14} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.voiceControlBtn} onPress={onNarrateStop} activeOpacity={0.7}>
            <Feather name="square" size={12} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.voiceControlBtn} onPress={onNarrateReplay} activeOpacity={0.7}>
            <Feather name="rotate-ccw" size={12} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.voiceLangSelector}>
          {LANGUAGES.map((lang) => {
            const isSel = lang.code === selectedLanguage;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.voiceLangBtn, isSel && styles.voiceLangBtnActive]}
                onPress={() => onLanguageChange && onLanguageChange(lang.code)}
                activeOpacity={0.8}
              >
                <Text style={[styles.voiceLangText, isSel && styles.voiceLangTextActive]}>
                  {lang.code.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      {/* CTAs Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.detailsButton} onPress={onViewDetails} activeOpacity={0.8}>
          <Feather name="compass" size={13} color={COLORS.gold} style={{ marginRight: 4 }} />
          <Text style={styles.detailsText}>Explore</Text>
        </TouchableOpacity>

        {onStartAR && (
          <TouchableOpacity style={styles.arButton} onPress={onStartAR} activeOpacity={0.8}>
            <Feather name="layers" size={13} color={COLORS.background} style={{ marginRight: 4 }} />
            <Text style={styles.arText}>AR Experience</Text>
          </TouchableOpacity>
        )}

        {onViewGallery && (
          <TouchableOpacity style={styles.galleryButton} onPress={onViewGallery} activeOpacity={0.8}>
            <Feather name="image" size={13} color={COLORS.gold} style={{ marginRight: 4 }} />
            <Text style={styles.galleryText}>Gallery</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mic/Ask Assistant Row */}
      <View style={styles.secondaryActionsRow}>
        <TouchableOpacity style={styles.askButton} onPress={onAskAssistant} activeOpacity={0.8}>
          <Text style={styles.askText}>ASK HERIXA VOICE ASSISTANT</Text>
          <Ionicons name="mic" size={14} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {onScanAgain && (
        <TouchableOpacity style={styles.scanAgainButton} onPress={onScanAgain} activeOpacity={0.8}>
          <Feather name="rotate-ccw" size={13} color={COLORS.textSecondary} />
          <Text style={styles.scanAgainText}>SCAN AGAIN</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    width: '100%',
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  verificationBannerText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  title: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  detectedText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  subtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    marginTop: 4,
    opacity: 0.8,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featuresList: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  featuresListTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureItem: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailsButton: {
    flex: 1,
    borderColor: COLORS.gold,
    borderWidth: 1,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.button,
    fontSize: 11,
    fontWeight: '700',
  },
  arButton: {
    flex: 1.2,
    backgroundColor: COLORS.gold,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontSize: 11,
    fontWeight: '800',
  },
  galleryButton: {
    flex: 1,
    borderColor: COLORS.gold,
    borderWidth: 1,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.button,
    fontSize: 11,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  askButton: {
    flex: 1,
    backgroundColor: COLORS.gold,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  askText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontSize: 11,
    fontWeight: '800',
  },
  confidenceText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  scanAgainButton: {
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    height: 36,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  scanAgainText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.button,
    fontSize: 11,
    fontWeight: '700',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 120,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLight,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  placeholderText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 18, 0.4)',
  },
  voiceControlBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  voiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceTitleText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  voiceButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  voiceControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voiceLangSelector: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  voiceLangBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm - 2,
  },
  voiceLangBtnActive: {
    backgroundColor: COLORS.gold,
  },
  voiceLangText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '700',
  },
  voiceLangTextActive: {
    color: COLORS.background,
    fontWeight: '800',
  },
});
