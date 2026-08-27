import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { LANGUAGES, LanguageConfig } from '../config/languages';

interface LanguageSelectorProps {
  selectedLanguage: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn';
  onLanguageChange: (langCode: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn') => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>LANGUAGE / மொழி / भाषा</Text>
      <View style={styles.selectorRow}>
        {LANGUAGES.map((lang) => {
          const isSelected = lang.code === selectedLanguage;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.langButton,
                isSelected && styles.langButtonSelected,
              ]}
              onPress={() => onLanguageChange(lang.code)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.langText,
                  isSelected && styles.langTextSelected,
                ]}
              >
                {lang.nativeName}
              </Text>
              {isSelected && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
    width: '100%',
  },
  label: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
  },
  selectorRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langButton: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md - 2,
    position: 'relative',
    flexDirection: 'row',
    gap: 4,
  },
  langButtonSelected: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  langText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  langTextSelected: {
    color: COLORS.gold,
    fontWeight: '700',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.gold,
    position: 'absolute',
    bottom: 4,
  },
});

export default LanguageSelector;
