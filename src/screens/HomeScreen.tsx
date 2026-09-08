import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { MONUMENTS } from '../data/monuments';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { getMonuments, ApiMonument, getImageUrl, getWikimediaFallback } from '../services/monumentService';
import { SafeImage } from '../components/SafeImage';
import { getConnectivityState } from '../services/api';
import { useFavorites } from '../context/FavoritesContext';

import { HerixaLogo, HerixaSymbol } from '../components/HerixaLogo';

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
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();

  useEffect(() => {
    const controller = new AbortController();

    const loadLocalFallback = () => {
      const localFallback = MONUMENTS.filter((m) =>
        ['brihadeeswarar', 'mahabalipuram', 'meenakshi-amman'].includes(m.id)
      ).map(m => ({
        ...m,
        _id: m.id,
        slug: m.id,
        images: [m.image],
        historicalBackground: m.background,
        culturalSignificance: m.significance,
        preservationStatus: m.preservation,
        interestingFacts: m.facts,
      }));
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
          setFeaturedMonuments(response.data.slice(0, 4));
          setIsLoading(false);
        }
      } catch (error: any) {
        if (controller.signal.aborted) return;
        console.warn('HomeScreen: Using local fallback monuments.', error.message || error);
        loadLocalFallback();
      }
    };

    fetchFeatured();

    return () => {
      controller.abort();
    };
  }, []);

  const handleStartExploring = () => {
    navigation.navigate('Main', { screen: 'SmartScan' });
  };

  const handleExploreHeritage = () => {
    navigation.navigate('Explore');
  };

  const handleMonumentPress = (id: string) => {
    navigation.navigate('MonumentDetails', { monumentId: id });
  };

  const handleProfilePress = () => {
    navigation.navigate('Main', { screen: 'Profile' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* 1. TOP HEADER WITH OFFICIAL HERIXA LOGO */}
      <View style={styles.header}>
        <HerixaLogo size={36} showText={true} />

        <TouchableOpacity
          style={styles.profileIconButton}
          onPress={handleProfilePress}
          activeOpacity={0.8}
        >
          <Feather name="user" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. HERO SECTION */}
        <View style={styles.heroCard}>
          <View style={styles.heroImageContainer}>
            <SafeImage
              source={getImageUrl(featuredMonuments[0]?.image || 'brihadeeswarar.jpg')}
              fallbackSource={featuredMonuments[0] ? getWikimediaFallback(featuredMonuments[0]) : undefined}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlayGradient} />
            <View style={styles.badgeRow}>
              <View style={styles.goldBadge}>
                <Feather name="cpu" size={12} color={COLORS.white} style={{ marginRight: 4 }} />
                <Text style={styles.goldBadgeText}>AI-POWERED HERITAGE</Text>
              </View>

              <View style={styles.aiReadyIndicator}>
                <View style={styles.statusDot} />
                <Text style={styles.aiReadyText}>AI Recognition Ready</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Experience India's Heritage in a New Dimension</Text>
            <Text style={styles.heroSubtitle}>
              Discover historic monuments, uncover their stories and explore India's cultural heritage with intelligent AI-powered discovery.
            </Text>

            <View style={styles.heroActionRow}>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={handleStartExploring}
              >
                <Feather name="aperture" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Start Exploring</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.85}
                onPress={handleExploreHeritage}
              >
                <Text style={styles.secondaryButtonText}>Explore Heritage</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. FEATURE HIGHLIGHTS (4 Elegant Cards) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Platform Capabilities</Text>
          <Text style={styles.sectionHeaderSubtitle}>Intelligent tools designed for heritage lovers and travellers</Text>

          <View style={styles.featuresGrid}>
            {/* Card 1: AI Recognition */}
            <View style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: COLORS.primaryLight }]}>
                <Feather name="aperture" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.featureTitle}>AI Recognition</Text>
              <Text style={styles.featureDesc}>Identify heritage monuments intelligently from photos.</Text>
            </View>

            {/* Card 2: Digital Heritage */}
            <View style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: COLORS.goldLight }]}>
                <Feather name="book-open" size={22} color={COLORS.gold} />
              </View>
              <Text style={styles.featureTitle}>Digital Heritage</Text>
              <Text style={styles.featureDesc}>Explore history, architecture and cultural significance.</Text>
            </View>

            {/* Card 3: Smart Tourism */}
            <View style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: COLORS.terracottaLight }]}>
                <Feather name="compass" size={22} color={COLORS.terracotta} />
              </View>
              <Text style={styles.featureTitle}>Smart Tourism</Text>
              <Text style={styles.featureDesc}>Discover destinations and plan meaningful heritage journeys.</Text>
            </View>

            {/* Card 4: AI Heritage Assistant */}
            <TouchableOpacity
              style={styles.featureCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('HeritageAssistant' as any)}
            >
              <View style={[styles.featureIconBox, { backgroundColor: COLORS.primaryLight }]}>
                <Feather name="message-square" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.featureTitle}>AI Assistant</Text>
              <Text style={styles.featureDesc}>Get intelligent answers about monuments and history.</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. FEATURED HERITAGE */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionHeaderTitle}>Featured Heritage</Text>
            <Text style={styles.sectionHeaderSubtitle}>Curated archaeological landmarks</Text>
          </View>
          <TouchableOpacity onPress={handleExploreHeritage} activeOpacity={0.8}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading heritage collection...</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScrollView}
          >
            {featuredMonuments.map((monument) => {
              const favorited = isFavorite(monument.id);
              return (
                <TouchableOpacity
                  key={monument.id}
                  style={styles.featuredCard}
                  activeOpacity={0.9}
                  onPress={() => handleMonumentPress(monument.id)}
                >
                  <View style={styles.featuredImageWrapper}>
                    <SafeImage
                      source={getImageUrl(monument.image)}
                      fallbackSource={getWikimediaFallback(monument)}
                      style={styles.featuredImage}
                      resizeMode="cover"
                    />

                    <TouchableOpacity
                      style={styles.bookmarkButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        favorited ? removeFavorite(monument.id) : addFavorite(monument.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={favorited ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={favorited ? COLORS.gold : COLORS.textPrimary}
                      />
                    </TouchableOpacity>

                    <View style={styles.dynastyBadge}>
                      <Text style={styles.dynastyBadgeText}>{(monument.dynasty || monument.category).toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredTitle} numberOfLines={1}>{monument.name}</Text>
                    
                    <View style={styles.locationRow}>
                      <Feather name="map-pin" size={13} color={COLORS.gold} style={{ marginRight: 4 }} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {monument.location}, {monument.state}
                      </Text>
                    </View>

                    <Text style={styles.featuredSnippet} numberOfLines={2}>
                      {monument.historicalBackground || monument.culturalSignificance || 'Historic landmark of cultural and architectural excellence.'}
                    </Text>

                    <TouchableOpacity
                      style={styles.cardExploreButton}
                      onPress={() => handleMonumentPress(monument.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cardExploreText}>Explore</Text>
                      <Feather name="arrow-right" size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 5. PLAN YOUR HERITAGE JOURNEY (Smart Tourism Section) */}
        <View style={styles.tourismCard}>
          <View style={styles.tourismHeaderRow}>
            <View style={styles.tourismBadge}>
              <Feather name="map" size={14} color={COLORS.white} style={{ marginRight: 4 }} />
              <Text style={styles.tourismBadgeText}>SMART TOURISM</Text>
            </View>
            <Text style={styles.tourismTag}>Intelligent Itinerary</Text>
          </View>

          <Text style={styles.tourismTitle}>Plan Your Heritage Journey</Text>
          <Text style={styles.tourismDesc}>
            Discover nearby archaeological monuments, curated cultural trails, visit durations, and optimal travel routes.
          </Text>

          <View style={styles.journeyMetricsRow}>
            <View style={styles.metricItem}>
              <Feather name="navigation" size={16} color={COLORS.primary} />
              <Text style={styles.metricValue}>Thanjavur Trail</Text>
              <Text style={styles.metricLabel}>Recommended Route</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Feather name="clock" size={16} color={COLORS.primary} />
              <Text style={styles.metricValue}>3 - 4 Hours</Text>
              <Text style={styles.metricLabel}>Avg. Duration</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.tourismCTA}
            onPress={handleExploreHeritage}
            activeOpacity={0.85}
          >
            <Text style={styles.tourismCTAText}>Explore Nearby Trails</Text>
            <Feather name="arrow-right" size={16} color={COLORS.white} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* 6. FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerLogoRow}>
            <HerixaSymbol size={26} />
            <Text style={styles.footerTitle}>HERIXA</Text>
          </View>
          <Text style={styles.footerTagline}>AI-Powered Heritage Discovery & Smart Tourism Platform</Text>
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
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadgeText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 18,
  },
  brandTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandTagline: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontSize: 10,
  },
  profileIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  heroCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  heroImageContainer: {
    height: 200,
    position: 'relative',
    backgroundColor: COLORS.surfaceIvory,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlayGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  badgeRow: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goldBadge: {
    backgroundColor: COLORS.gold,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  goldBadgeText: {
    color: COLORS.white,
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  aiReadyIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  aiReadyText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  heroContent: {
    padding: SPACING.lg,
  },
  heroTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  primaryButton: {
    flex: 1,
    height: 46,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: COLORS.white,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
  sectionContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xxl,
  },
  sectionHeaderTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: '800',
  },
  sectionHeaderSubtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  featureCard: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  viewAllText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
  },
  featuredScrollView: {
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.md,
    gap: SPACING.md,
  },
  featuredCard: {
    width: 270,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  featuredImageWrapper: {
    position: 'relative',
    height: 150,
    backgroundColor: COLORS.surfaceIvory,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  bookmarkButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dynastyBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  dynastyBadgeText: {
    color: COLORS.white,
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  featuredContent: {
    padding: SPACING.md,
  },
  featuredTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  locationText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '500',
  },
  featuredSnippet: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    lineHeight: 16,
    marginBottom: SPACING.md,
  },
  cardExploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardExploreText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  tourismCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xxl,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surfaceIvory,
    borderWidth: 1,
    borderColor: COLORS.borderWarm,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  tourismHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tourismBadge: {
    backgroundColor: COLORS.terracotta,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  tourismBadgeText: {
    color: COLORS.white,
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  tourismTag: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  tourismTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  tourismDesc: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  journeyMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    marginTop: 2,
  },
  metricLabel: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontSize: 10,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  tourismCTA: {
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tourismCTAText: {
    color: COLORS.white,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
  footer: {
    marginTop: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  footerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  footerBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerBadgeText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 12,
  },
  footerTitle: {
    color: COLORS.primary,
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
    height: 160,
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
