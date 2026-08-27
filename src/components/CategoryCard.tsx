import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

interface CategoryCardProps {
  label: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  label,
  icon,
  isSelected,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        isSelected ? styles.selectedCard : styles.unselectedCard
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[
        styles.label,
        isSelected ? styles.selectedLabel : styles.unselectedLabel
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginRight: SPACING.sm,
    gap: SPACING.xs,
  },
  selectedCard: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.gold,
  },
  unselectedCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '500',
  },
  selectedLabel: {
    color: COLORS.gold,
  },
  unselectedLabel: {
    color: COLORS.textSecondary,
  },
});
