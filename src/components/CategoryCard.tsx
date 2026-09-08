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
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    marginRight: SPACING.sm,
    gap: SPACING.xs,
  },
  selectedCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unselectedCard: {
    backgroundColor: COLORS.surfaceIvory,
    borderColor: COLORS.borderWarm,
  },
  icon: {
    fontSize: 15,
  },
  label: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    fontSize: 13,
  },
  selectedLabel: {
    color: COLORS.white,
  },
  unselectedLabel: {
    color: COLORS.textSecondary,
  },
});
