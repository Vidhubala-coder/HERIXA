import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

export const PrivacyPreferencesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>Privacy Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introduction}>
          Manage how HERIXA processes your application details. We do not sell your personal data or use tracking cookies.
        </Text>

        {/* 1. Essential Services */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.labelWrapper}>
              <Feather name="shield" size={18} color={COLORS.gold} />
              <Text style={styles.preferenceLabel}>Essential Services</Text>
            </View>
            <Text style={styles.statusText}>ALWAYS ON</Text>
          </View>
          <Text style={styles.descText}>
            Required for core features, including user registration, session authentication, and database synchronizations for your Favorites list and Monument History.
          </Text>
        </View>

        {/* 2. Optional Analytics & Personalization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optional Data Processing</Text>
          
          <View style={styles.inactiveWrapper}>
            <Feather name="info" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.infoText}>
              No optional tracking, marketing cookies, or third-party analytics are integrated or active in this version of HERIXA.
            </Text>
          </View>
        </View>

        <Text style={styles.footerText}>
          Your choices are stored locally on this device.
        </Text>
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
  introduction: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 20,
    marginBottom: SPACING.xl,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  labelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  preferenceLabel: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  statusText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '800',
  },
  descText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    lineHeight: 18,
    marginTop: 4,
  },
  inactiveWrapper: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  infoText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    flex: 1,
    lineHeight: 18,
  },
  footerText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    textAlign: 'center',
    opacity: 0.5,
    marginTop: SPACING.xl,
  },
});

export default PrivacyPreferencesScreen;
