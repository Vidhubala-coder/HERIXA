import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

export const TermsAndConditionsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.policyIntroduction}>
          Welcome to HERIXA. Please read these Terms & Conditions carefully before using our mobile application.
        </Text>

        {/* 1. Acceptance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By creating an account or accessing the HERIXA application, you agree to comply with and be bound by these Terms & Conditions.
          </Text>
        </View>

        {/* 2. Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of HERIXA</Text>
          <Text style={styles.sectionText}>
            HERIXA is an augmented reality (AR) cultural exploration platform designed to identify historical monuments, display relevant historical facts, and facilitate conversational learning through an AI Assistant.
          </Text>
        </View>

        {/* 3. User Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.sectionText}>
            To access certain features (such as saved Favorites or historical scan logs), you must register an account using a valid email address. You agree to provide accurate information and maintain the security of your login details.
          </Text>
        </View>

        {/* 4. Account Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Account Security</Text>
          <Text style={styles.sectionText}>
            You are entirely responsible for all activities occurring under your account credentials. You agree to immediately notify us of any unauthorized use or security breaches.
          </Text>
        </View>

        {/* 5. Acceptable Use */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Acceptable Use</Text>
          <Text style={styles.sectionText}>
            You agree not to use the application for any unlawful purpose, or in any way that violates local, state, national, or international regulations.
          </Text>
        </View>

        {/* 6. User-Submitted Images/Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. User-Submitted Images/Content</Text>
          <Text style={styles.sectionText}>
            Images captured through the AR scanner are sent to backend servers solely for in-memory monument recognition and are discarded immediately after identification. You represent that you have the right to capture and process these images.
          </Text>
        </View>

        {/* 7. AI Recognition Disclaimer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. AI Recognition Disclaimer</Text>
          <Text style={styles.sectionText}>
            AI monument recognition is provided solely for informational and educational purposes. While we strive for accuracy, image recognition is subject to lighting, perspective, and technological limitations and may occasionally produce incorrect, incomplete, or inaccurate results.
          </Text>
        </View>

        {/* 8. Cultural Information Disclaimer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Historical & Cultural Information Disclaimer</Text>
          <Text style={styles.sectionText}>
            The historical narratives, architectural data, and cultural information presented within the app are aggregated from public resources and AI synthesis. HERIXA makes no guarantees regarding the chronological or scholarly accuracy of these details.
          </Text>
        </View>

        {/* 9. Intellectual Property */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Intellectual Property</Text>
          <Text style={styles.sectionText}>
            All software, designs, premium historical descriptions, logo iconography, and system assets are the exclusive intellectual property of HERIXA and its licensors.
          </Text>
        </View>

        {/* 10. Third-Party Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Third-Party Services</Text>
          <Text style={styles.sectionText}>
            HERIXA incorporates APIs from Google Gemini and Groq to power its AI Cultural Assistant. By using the AI assistant, you acknowledge that your text queries are processed through these third-party cloud infrastructure endpoints.
          </Text>
        </View>

        {/* 11. Service Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Service Availability</Text>
          <Text style={styles.sectionText}>
            We do not warrant that the application will be uninterrupted, error-free, or perpetually available. Maintenance downtime or network disruptions may occur.
          </Text>
        </View>

        {/* 12. Limitation of Liability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            To the maximum extent permitted by law, HERIXA shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from your use of or inability to use the platform.
          </Text>
        </View>

        {/* 13. Account Suspension/Termination */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Account Suspension/Termination</Text>
          <Text style={styles.sectionText}>
            We reserve the right to suspend or terminate your account access without prior notice if we detect a breach of these Terms & Conditions or patterns of service misuse.
          </Text>
        </View>

        {/* 14. Account Deletion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Account Deletion</Text>
          <Text style={styles.sectionText}>
            You have the right to permanently delete your account and associated personal data at any time via the Delete Account setting. Deletion will invalidate your active login session and erase database records.
          </Text>
        </View>

        {/* 15. Changes to Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Changes to Terms</Text>
          <Text style={styles.sectionText}>
            We may revise these Terms & Conditions from time to time. The latest version will always be posted within the application settings screen.
          </Text>
        </View>

        {/* 16. Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>16. Contact Information</Text>
          <Text style={styles.sectionText}>
            If you have questions regarding these terms, please contact the HERIXA platform administrator.
          </Text>
        </View>

        <Text style={styles.versionText}>Last Updated: August 2026</Text>
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
  versionText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    textAlign: 'center',
    opacity: 0.5,
    marginTop: SPACING.xl,
  },
});

export default TermsAndConditionsScreen;
