import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { MONUMENTS } from '../data/monuments';
import { RootStackParamList } from '../navigation/types';
import { getMonumentById, ApiMonument } from '../services/monumentService';

type FullHistoryScreenRouteProp = RouteProp<RootStackParamList, 'FullHistory'>;
type FullHistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FullHistory'>;

interface FullHistoryScreenProps {
  route: FullHistoryScreenRouteProp;
  navigation: FullHistoryScreenNavigationProp;
}

export const FullHistoryScreen: React.FC<FullHistoryScreenProps> = ({ route, navigation }) => {
  const { monumentId } = route.params;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const [monument, setMonument] = useState<ApiMonument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getMonumentById(monumentId);
        setMonument(data);
      } catch (err) {
        console.warn(`FullHistoryScreen: Failed to fetch chronicle details for ${monumentId} from backend. Trying local fallback.`, err);
        // Offline Fallback
        const localMon = MONUMENTS.find((m) => m.id === monumentId);
        if (localMon) {
          const mappedLocal = {
            ...localMon,
            _id: localMon.id,
            slug: localMon.id,
            images: [localMon.image],
            historicalBackground: localMon.background,
            culturalSignificance: localMon.significance,
            preservationStatus: localMon.preservation,
            interestingFacts: localMon.facts,
          };
          setMonument(mappedLocal as any);
        } else {
          setError('Chronicle details not found.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [monumentId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={[styles.errorText, { marginTop: 10 }]}>Loading chronicle details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !monument) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color={COLORS.danger} style={{ marginBottom: SPACING.md }} />
        <Text style={styles.errorText}>{error || 'Chronicle details not found.'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>GO BACK</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderBannerImage = () => {
    if (!monument.image || imageError) {
      return (
        <View style={styles.imagePlaceholder}>
          <Feather name="image" size={48} color={COLORS.bronze} style={{ marginBottom: 8 }} />
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>
            Real image unavailable
          </Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: monument.image }}
        style={styles.image}
        onLoadStart={() => setImageLoading(true)}
        onLoadEnd={() => setImageLoading(false)}
        onError={() => setImageError(true)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {`${monument.name} - Chronicle`}
        </Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.imageContainer}>
          {renderBannerImage()}

          {imageLoading && !imageError ? (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator color={COLORS.gold} />
            </View>
          ) : null}
          <View style={styles.imageGradient} />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTag}>{monument.dynasty.toUpperCase()}</Text>
            <Text style={styles.bannerTitle}>Historical Chronicle</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Historical Background</Text>
            <Text style={styles.paragraph}>{monument.background}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Chronology Timeline</Text>
            <View style={styles.timelineContainer}>
              {monument.timeline.map((event, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <Text style={styles.timelineYear}>{event.year}</Text>
                    <View style={styles.dotRing}>
                      <View style={styles.timelineDot} />
                    </View>
                    {index < monument.timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.timelineRight}>
                    <Text style={styles.timelineEventText}>{event.event}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Architectural Craft</Text>
            <Text style={styles.paragraph}>{monument.architecture}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Cultural & Religious Significance</Text>
            <Text style={styles.paragraph}>{monument.significance}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Preservation Challenges</Text>
            <Text style={styles.paragraph}>{monument.preservation}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Key Discoveries & Facts</Text>
            {monument.facts.map((fact, index) => (
              <View key={index} style={styles.factItem}>
                <View style={styles.factIconContainer}>
                  <Feather name="award" size={14} color={COLORS.gold} />
                </View>
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </View>

        </View>

        <View style={styles.footerSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  errorText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
  },
  backButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    zIndex: 10,
    marginTop: 30, // Account for translucent status bar
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  imageContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(18, 18, 18, 0.7)',
  },
  bannerTextContainer: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.lg,
  },
  bannerTag: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 2,
  },
  bannerTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  sectionHeader: {
    color: COLORS.gold,
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
  },
  paragraph: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 22,
  },
  timelineContainer: {
    paddingLeft: SPACING.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: SPACING.md,
    width: 65,
    position: 'relative',
  },
  timelineYear: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  dotRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: COLORS.border,
    position: 'absolute',
    top: 36,
    bottom: -10,
    left: 32, // align with the dot center
  },
  timelineRight: {
    flex: 1,
    paddingTop: 18,
    paddingBottom: SPACING.md,
  },
  timelineEventText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 18,
  },
  factItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  factIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  factText: {
    flex: 1,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 20,
  },
  footerSpacing: {
    height: 40,
  },
});
export default FullHistoryScreen;
