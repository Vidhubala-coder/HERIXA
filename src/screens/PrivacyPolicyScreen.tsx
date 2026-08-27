import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

export const PrivacyPolicyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.policyIntroduction}>
          This Privacy Policy describes how HERIXA handles your personal details, scanned images, and application preferences.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.sectionText}>
            We collect only the information necessary to provide the platform's features:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Name and Email Address (for account registration).</Text>
            <Text style={styles.bulletItem}>• Password (securely hashed, never stored in plaintext).</Text>
            <Text style={styles.bulletItem}>• User Profile initials and in-app display name.</Text>
            <Text style={styles.bulletItem}>• Favorites and Monument Scan History.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Information</Text>
          <Text style={styles.sectionText}>
            The information is used strictly to power core application workflows:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• User authentication and login verification.</Text>
            <Text style={styles.bulletItem}>• Associating favorites and history entries with your account.</Text>
            <Text style={styles.bulletItem}>• Personalizing monument discovery recommendations.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Image & Recognition Data</Text>
          <Text style={styles.sectionText}>
            Images captured through the AR scanner are sent to our backend services as Base64 strings for processing.
          </Text>
          <Text style={styles.sectionSubText}>
            These images are processed entirely in-memory using our trained monument-recognition AI model to identify monuments. Once identified, the image bytes are discarded. We do NOT save scanned photos on our servers or databases.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Storage</Text>
          <Text style={styles.sectionText}>
            Authenticated account data (favorites, profile settings, and history logs) is stored in a secure MongoDB database. Local tokens are cached on your device using encrypted React Native AsyncStorage.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Account Security</Text>
          <Text style={styles.sectionText}>
            All passwords are encrypted before storage on the server. Active logins are protected using signature-based tokens. You are responsible for keeping your login credentials confidential.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Email Verification</Text>
          <Text style={styles.sectionText}>
            To protect users and secure registration, we utilize standard SMTP email delivery to send registration One-Time Passwords (OTPs) verifying ownership of your email address.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Guest Mode</Text>
          <Text style={styles.sectionText}>
            When using Guest Mode, no data is sent to the cloud databases. Your favorites, history, and preferences are saved offline directly on your device.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Data Retention & User Rights</Text>
          <Text style={styles.sectionText}>
            Account data remains in the database until you request modifications. You have the right to view your profile, update your initials, or log out of your active session.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Contact</Text>
          <Text style={styles.sectionText}>
            Contact information will be provided by the application administrator.
          </Text>
        </View>

        <Text style={styles.versionText}>Last Updated: August 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  policyIntroduction: {
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
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  sectionText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 22,
  },
  sectionSubText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  bulletList: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  bulletItem: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 20,
    paddingLeft: SPACING.sm,
  },
  versionText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    textAlign: 'center',
    opacity: 0.5,
    marginTop: SPACING.xl,
  },
});

export default PrivacyPolicyScreen;
