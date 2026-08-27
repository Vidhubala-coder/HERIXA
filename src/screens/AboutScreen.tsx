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

export const AboutScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>About HERIXA</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Feather name="compass" size={48} color={COLORS.gold} style={styles.heroIcon} />
          <Text style={styles.heroTitle}>HERIXA</Text>
          <Text style={styles.heroSubtitle}>AR-Based Cultural Heritage Platform</Text>
        </View>

        {/* Content Cards */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our Platform</Text>
          <Text style={styles.cardText}>
            HERIXA is an advanced digital cultural heritage platform designed to help users discover, recognize, explore, and learn about historically significant monuments through modern technologies such as AI-powered image recognition and immersive digital experiences.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our Mission</Text>
          <Text style={styles.cardText}>
            To bridge the gap between ancient history and modern audiences by making cultural heritage interactive, accessible, and digitally preserved for future generations.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our Vision</Text>
          <Text style={styles.cardText}>
            To become the premier companion for heritage tourism, educational exploration, and historical monument cataloging, powered by cutting-edge neural models and immersive spatial visualization.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI-Powered Recognition</Text>
          <Text style={styles.cardText}>
            Leveraging our custom-trained neural classification models, HERIXA recognizes complex architectural features and monument structures, providing historical insights and identification with high precision.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Digital Preservation</Text>
          <Text style={styles.cardText}>
            Every scanned monument is compiled into a personal exploration log, turning physical visits into persistent digital discoveries, cataloging local histories, and facilitating architectural study.
          </Text>
        </View>

        {/* Version Info */}
        <Text style={styles.versionText}>HERIXA v1.0.0</Text>
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
  heroSection: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  heroIcon: {
    marginBottom: SPACING.sm,
  },
  heroTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.h1,
    fontWeight: '800',
    letterSpacing: 2,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  cardText: {
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

export default AboutScreen;
