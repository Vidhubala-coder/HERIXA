import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { MONUMENTS } from '../data/monuments';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { getMonuments, ApiMonument, getImageUrl, getWikimediaFallback } from '../services/monumentService';
import { SafeImage } from '../components/SafeImage';
import { getConnectivityState } from '../services/api';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const { width } = Dimensions.get('window');

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [featuredMonuments, setFeaturedMonuments] = useState<ApiMonument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load featured monuments from backend with fallback
  useEffect(() => {
    const controller = new AbortController();

    const loadLocalFallback = () => {
      const localFallback = MONUMENTS.filter((m) =>
        ['brihadeeswarar', 'mahabalipuram', 'meenakshi-amman'].includes(m.id)
      ).map(m => ({ ...m, _id: m.id, slug: m.id, images: [m.image], historicalBackground: m.background, culturalSignificance: m.significance, preservationStatus: m.preservation, interestingFacts: m.facts }));
      if (!controller.signal.aborted) {
        setFeaturedMonuments(localFallback as any);
        setIsLoading(false);
      }
    };

    const fetchFeatured = async () => {
      if (getConnectivityState() === 'unavailable') {
        loadLocalFallback();
        return;
      }

      try {
        const response = await getMonuments({ limit: 10 }, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setFeaturedMonuments(response.data.slice(0, 3));
          setIsLoading(false);
        }
      } catch (error: any) {
        if (controller.signal.aborted) {
          return;
        }
        if (
          error.name === 'AbortError' || 
          error.message?.includes('canceled') || 
          error.message?.includes('aborted')
        ) {
          return;
        }
        console.warn('HomeScreen: Failed to fetch featured monuments from backend API. Falling back to local data.', error.message || error);
        loadLocalFallback();
      }
    };

    fetchFeatured();

    return () => {
      controller.abort();
    };
  }, []);

  const handleSearchPress = () => {
    navigation.navigate('Explore');
  };

  const handleMonumentPress = (id: string) => {
    navigation.navigate('MonumentDetails', { monumentId: id });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* 1. TOP HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Feather name="aperture" size={24} color={COLORS.gold} />
          <Text style={styles.headerTitle}>HERIXA</Text>
        </View>
        <TouchableOpacity
          style={styles.headerARButton}
          onPress={() => navigation.navigate('AR')}
          activeOpacity={0.8}
        >
          <Feather name="aperture" size={16} color={COLORS.background} style={{ marginRight: 6 }} />
          <Text style={styles.headerARButtonText}>SCAN IN AR</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. HERO SECTION */}
        <View style={styles.heroCard}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTagline}>PRESERVE & EXPLORE</Text>
            <Text style={styles.heroTitle}>Discover India's Heritage</Text>
            <Text style={styles.heroSubtitle}>
              Explore ancient monuments through immersive Augmented Reality and intelligent digital assistance.
            </Text>
          </View>
          
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={styles.heroPrimaryCTA}
              activeOpacity={0.8}
              onPress={handleSearchPress}
            >
              <Text style={styles.heroPrimaryCTAText}>Explore Heritage</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroSecondaryCTA}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AR')}
            >
              <Feather name="aperture" size={16} color={COLORS.gold} style={{ marginRight: 6 }} />
              <Text style={styles.heroSecondaryCTAText}>Scan in AR</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. ABOUT HERITAGEAR SECTION */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>About HERIXA</Text>
          <Text style={styles.aboutText}>
            HERIXA is an interactive platform designed to preserve, explore, and experience India's cultural heritage using Augmented Reality and intelligent digital technology.
          </Text>
        </View>

        {/* 4. WHAT THE APP OFFERS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Experience Heritage Differently</Text>
        </View>

        <View style={styles.offersGrid}>
          {/* Card 1 */}
          <View style={styles.offerCard}>
            <View style={styles.offerIconWrapper}>
              <Feather name="aperture" size={20} color={COLORS.gold} />
            </View>
            <Text style={styles.offerCardTitle}>AR Exploration</Text>
            <Text style={styles.offerCardDesc}>
              Experience historical monuments through immersive augmented reality.
            </Text>
          </View>

          {/* Card 2 */}
          <View style={styles.offerCard}>
            <View style={styles.offerIconWrapper}>
              <Feather name="compass" size={20} color={COLORS.gold} />
            </View>
            <Text style={styles.offerCardTitle}>Discover Monuments</Text>
            <Text style={styles.offerCardDesc}>
              Explore India's historic temples, monuments, and cultural landmarks.
            </Text>
          </View>

          {/* Card 3 */}
          <View style={styles.offerCard}>
            <View style={styles.offerIconWrapper}>
              <Feather name="cpu" size={20} color={COLORS.gold} />
            </View>
            <Text style={styles.offerCardTitle}>AI Heritage Assistant</Text>
            <Text style={styles.offerCardDesc}>
              Ask questions and learn more about India's cultural heritage with intelligent assistance.
            </Text>
          </View>

          {/* Card 4 */}
          <View style={styles.offerCard}>
            <View style={styles.offerIconWrapper}>
              <Feather name="eye" size={20} color={COLORS.gold} />
            </View>
            <Text style={styles.offerCardTitle}>Preserve History</Text>
            <Text style={styles.offerCardDesc}>
              Connect with heritage through a modern digital experience designed for preservation and education.
            </Text>
          </View>
        </View>

        {/* 5. FEATURED HERITAGE */}
        <View style={styles.sectionHeaderWithLink}>
          <Text style={styles.sectionTitle}>Featured Heritage</Text>
          <TouchableOpacity onPress={handleSearchPress} activeOpacity={0.8}>
            <Text style={styles.sectionHeaderLinkText}>View All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.gold} />
            <Text style={styles.loadingText}>Loading featured sites...</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScrollView}
          >
            {featuredMonuments.map((monument) => {
              const hasImage = !!monument.image;
              return (
                <TouchableOpacity
                  key={monument.id}
                  style={styles.monumentCard}
                  activeOpacity={0.9}
                  onPress={() => handleMonumentPress(monument.id)}
                >
                  <View style={styles.monumentImageWrapper}>
                    <SafeImage
                      source={getImageUrl(monument.image)}
                      fallbackSource={getWikimediaFallback(monument)}
                      style={styles.monumentImage}
                      resizeMode="cover"
                    />

                    {/* Removed 3D badge */}
                  </View>

                  <View style={styles.monumentDetails}>
                    <Text style={styles.monumentName} numberOfLines={1}>{monument.name}</Text>
                    
                    <View style={styles.monumentLocationRow}>
                      <Feather name="map-pin" size={12} color={COLORS.gold} style={{ marginRight: 4 }} />
                      <Text style={styles.monumentLocation} numberOfLines={1}>
                        {monument.location}, {monument.state}
                      </Text>
                    </View>

                    {/* Removed 3D button */}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 6. WHY HERITAGEAR */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Why HERIXA?</Text>
        </View>

        <View style={styles.whyContainer}>
          <View style={styles.whyItem}>
            <Feather name="aperture" size={18} color={COLORS.gold} />
            <Text style={styles.whyText}>AR Powered</Text>
          </View>
          <View style={styles.whyDivider} />
          <View style={styles.whyItem}>
            <Feather name="cpu" size={18} color={COLORS.gold} />
            <Text style={styles.whyText}>AI Assisted</Text>
          </View>
          <View style={styles.whyDivider} />
          <View style={styles.whyItem}>
            <Feather name="award" size={18} color={COLORS.gold} />
            <Text style={styles.whyText}>Heritage Focused</Text>
          </View>
        </View>

        {/* 7. CALL TO ACTION CARD */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Start Your Heritage Journey</Text>
          <Text style={styles.ctaSubtitle}>
            Discover the stories, architecture, and culture behind India's timeless monuments.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSearchPress}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Explore Monuments</Text>
          </TouchableOpacity>
        </View>

        {/* 8. FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>HERIXA</Text>
          <Text style={styles.footerTagline}>Preserving the past. Experiencing it in the future.</Text>
        </View>

        <View style={styles.bottomSpacing} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerARButton: {
    backgroundColor: COLORS.gold,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  headerARButtonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  heroCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  heroTextContainer: {
    gap: SPACING.xs,
  },
  heroTagline: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 2,
  },
  heroTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h1,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 22,
    marginTop: 4,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  heroPrimaryCTA: {
    flex: 1,
    backgroundColor: COLORS.gold,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPrimaryCTAText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '800',
  },
  heroSecondaryCTA: {
    flex: 1,
    borderColor: COLORS.gold,
    borderWidth: 1,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  heroSecondaryCTAText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.button,
    fontWeight: '800',
  },
  aboutCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  aboutTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  aboutText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 22,
  },
  sectionHeader: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionHeaderWithLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
  },
  sectionHeaderLinkText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  offersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  offerCard: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  offerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  offerCardTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
  },
  offerCardDesc: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    lineHeight: 16,
  },
  featuredScrollView: {
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.md,
    gap: SPACING.md,
  },
  monumentCard: {
    width: 260,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  monumentImageWrapper: {
    position: 'relative',
    height: 140,
    backgroundColor: COLORS.surfaceLight,
  },
  monumentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  monumentImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monumentImagePlaceholderText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  badge3d: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.gold,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  badge3dText: {
    color: COLORS.background,
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: '800',
  },
  monumentDetails: {
    padding: SPACING.md,
    gap: 4,
  },
  monumentName: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
  },
  monumentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monumentLocation: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    flex: 1,
  },
  cardView3dButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  cardView3dButtonText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  whyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  whyItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  whyText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  whyDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  ctaCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    textAlign: 'center',
    gap: SPACING.sm,
  },
  ctaTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    textAlign: 'center',
  },
  ctaSubtitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.xl,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  ctaButtonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '800',
  },
  footer: {
    marginTop: SPACING.xxl,
    alignItems: 'center',
    gap: 4,
  },
  footerTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    letterSpacing: 2,
  },
  footerTagline: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 40,
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
  },
});

export default HomeScreen;
