import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';

interface ARGuidanceProps {
  monumentName?: string | null;
  status: 'scanning' | 'initializing' | 'idle' | 'error';
}

export const ARGuidance: React.FC<ARGuidanceProps> = ({ monumentName, status }) => {
  const getGuidanceText = () => {
    if (status === 'initializing') {
      return 'Starting camera system...';
    }
    if (status === 'error') {
      return 'Scanning paused';
    }
    if (monumentName) {
      return `Align frame with:\n${monumentName}`;
    }
    return 'Point your camera at a heritage monument';
  };

  const getIconName = () => {
    if (status === 'initializing') return 'loader';
    if (status === 'error') return 'alert-circle';
    return 'aperture';
  };

  return (
    <View style={styles.container}>
      <View style={styles.promptBox}>
        <Feather
          name={getIconName()}
          size={18}
          color={status === 'error' ? COLORS.danger : COLORS.gold}
          style={styles.icon}
        />
        <Text style={styles.text}>{getGuidanceText()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 140,
    left: SPACING.xl,
    right: SPACING.xl,
    alignItems: 'center',
    zIndex: 10,
  },
  promptBox: {
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  text: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },
});
