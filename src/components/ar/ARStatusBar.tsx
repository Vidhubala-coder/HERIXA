import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';

interface ARStatusBarProps {
  onBack: () => void;
  isPreviewMode?: boolean;
}

export const ARStatusBar: React.FC<ARStatusBarProps> = ({ onBack, isPreviewMode = false }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>HERIXA</Text>
          <View style={styles.badge}>
            <View style={[styles.badgeDot, isPreviewMode && styles.previewDot]} />
            <Text style={styles.badgeText}>
              {isPreviewMode ? 'PREVIEW MODE' : 'AR LIVE FEED'}
            </Text>
          </View>
        </View>
        
        <View style={styles.placeholder} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 18, 0.9)',
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  previewDot: {
    backgroundColor: COLORS.gold,
  },
  badgeText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.caption,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
  placeholder: {
    width: 40,
  },
});
