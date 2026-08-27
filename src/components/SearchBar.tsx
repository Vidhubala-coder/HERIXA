import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  showFilterButton?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search monuments, temples, forts...',
  onFilterPress,
  showFilterButton = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Feather name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          style={styles.input}
          keyboardAppearance="dark"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearIcon}>
            <Feather name="x" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {showFilterButton && onFilterPress && (
        <TouchableOpacity onPress={onFilterPress} style={styles.filterButton} activeOpacity={0.8}>
          <Feather name="sliders" size={20} color={COLORS.gold} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '100%',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
  },
  clearIcon: {
    padding: SPACING.xs,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
