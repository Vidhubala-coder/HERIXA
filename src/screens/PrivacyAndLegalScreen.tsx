import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

export const PrivacyAndLegalScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={COLORS.gold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Legal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.menuSection}>
          {/* Privacy Policy */}
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <View style={styles.menuItemLeft}>
              <Feather name="lock" size={18} color={COLORS.gold} />
              <View style={styles.menuItemTextWrapper}>
                <Text style={styles.menuItemText}>Privacy Policy</Text>
                <Text style={styles.menuItemDesc}>Read how HERIXA handles your information.</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Terms & Conditions */}
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => navigation.navigate('TermsAndConditions')}>
            <View style={styles.menuItemLeft}>
              <Feather name="file-text" size={18} color={COLORS.gold} />
              <View style={styles.menuItemTextWrapper}>
                <Text style={styles.menuItemText}>Terms & Conditions</Text>
                <Text style={styles.menuItemDesc}>Understand the rules for using HERIXA.</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Privacy Preferences */}
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => navigation.navigate('PrivacyPreferences')}>
            <View style={styles.menuItemLeft}>
              <Feather name="shield" size={18} color={COLORS.gold} />
              <View style={styles.menuItemTextWrapper}>
                <Text style={styles.menuItemText}>Privacy Preferences</Text>
                <Text style={styles.menuItemDesc}>Manage optional privacy and tracking preferences.</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Delete Account */}
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => navigation.navigate('DeleteAccount')}>
            <View style={styles.menuItemLeft}>
              <Feather name="trash-2" size={18} color={COLORS.danger} />
              <View style={styles.menuItemTextWrapper}>
                <Text style={[styles.menuItemText, { color: COLORS.danger }]}>Delete Account</Text>
                <Text style={styles.menuItemDesc}>Permanently delete your HERIXA account.</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  menuSection: { gap: SPACING.md },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  menuItemTextWrapper: { flex: 1, gap: 2 },
  menuItemText: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, fontWeight: '600' },
  menuItemDesc: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, fontSize: 12 },
});

export default PrivacyAndLegalScreen;
