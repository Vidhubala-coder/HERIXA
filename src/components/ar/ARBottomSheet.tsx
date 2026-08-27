import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { ApiMonument } from '../../services/monumentService';

import { ARCapabilityStatus } from '../../ar/types';

interface ARBottomSheetProps {
  statusText: string;
  monument: ApiMonument | null;
  onExit: () => void;
  onViewHistory?: () => void;
  arCapability?: ARCapabilityStatus;
  onAIIdentify?: () => void;
}

export const ARBottomSheet: React.FC<ARBottomSheetProps> = ({
  statusText,
  monument,
  onExit,
  onViewHistory,
  arCapability = 'preview',
  onAIIdentify,
}) => {
  const getExplanation = () => {
    if (arCapability === 'unsupported' || arCapability === 'preview') {
      return 'Real Viro image-target recognition requires a native development build and cannot be validated through standard Expo Go. Switching to camera-based image recognition fallback instead. Point your camera at a monument (or its photo) to identify it and view details.';
    }
    if (arCapability === 'nativeARAvailable') {
      return 'AR Scanner is active. Point your camera at the physical Brihadeeswarar Temple reference image to scan it and view the monument details.';
    }
    return 'Real-time camera preview is active. Real monument recognition and 3D model overlays will be enabled in a future AR integration phase.';
  };

  return (
    <View style={styles.container}>
      <View style={styles.handle} />
      
      <Text style={styles.statusLabel}>{statusText.toUpperCase()}</Text>
      
      <Text style={styles.infoTitle}>
        {arCapability === 'unsupported' ? 'Device Unsupported' : 'AR Preview Mode'}
      </Text>
      <Text style={styles.infoText}>
        {getExplanation()}
      </Text>

      {monument && (
        <View style={styles.monumentShortcut}>
          <Feather name="info" size={16} color={COLORS.gold} />
          <Text style={styles.shortcutText} numberOfLines={1}>
            Target site: {monument.name}
          </Text>
        </View>
      )}
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.exitButton} onPress={onExit} activeOpacity={0.8}>
          <Text style={styles.exitButtonText}>EXIT SCANNER</Text>
        </TouchableOpacity>

        {!monument && onAIIdentify && (
          <TouchableOpacity style={styles.aiButton} onPress={onAIIdentify} activeOpacity={0.8}>
            <Text style={styles.aiButtonText}>AI IDENTIFY SITE</Text>
            <Feather name="cpu" size={14} color={COLORS.background} />
          </TouchableOpacity>
        )}

        {monument && onViewHistory && (
          <TouchableOpacity style={styles.historyButton} onPress={onViewHistory} activeOpacity={0.8}>
            <Text style={styles.historyButtonText}>VIEW HISTORY</Text>
            <Feather name="book-open" size={14} color={COLORS.gold} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 10,
    zIndex: 100,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  statusLabel: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
    alignSelf: 'center',
  },
  infoTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  monumentShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  shortcutText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  exitButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: COLORS.border,
    borderWidth: 1,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButtonText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
  aiButton: {
    flex: 1.2,
    backgroundColor: COLORS.gold,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  aiButtonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
  historyButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderColor: COLORS.gold,
    borderWidth: 1,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  historyButtonText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
});
