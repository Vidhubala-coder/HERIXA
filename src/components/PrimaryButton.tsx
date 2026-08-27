import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  variant = 'solid',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outline;
      case 'ghost':
        return styles.ghost;
      case 'danger':
        return styles.danger;
      case 'solid':
      default:
        return styles.solid;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.textOutline;
      case 'ghost':
        return styles.textGhost;
      case 'danger':
        return styles.textDanger;
      case 'solid':
      default:
        return styles.textSolid;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.baseButton, getButtonStyle(), disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'solid' ? COLORS.background : COLORS.gold} size="small" />
      ) : (
        <Text style={[styles.baseText, getTextStyle(), disabled && styles.textDisabled, textStyle]}>
          {title.toUpperCase()}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  solid: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: COLORS.gold,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  disabled: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: 'transparent',
    opacity: 0.5,
  },
  baseText: {
    ...TYPOGRAPHY.button,
  },
  textSolid: {
    color: COLORS.background,
  },
  textOutline: {
    color: COLORS.gold,
  },
  textGhost: {
    color: COLORS.textSecondary,
  },
  textDanger: {
    color: COLORS.textPrimary,
  },
  textDisabled: {
    color: COLORS.textSecondary,
  },
});
