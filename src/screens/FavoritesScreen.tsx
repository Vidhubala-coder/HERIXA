import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { MONUMENTS } from '../data/monuments';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useFavorites } from '../context/FavoritesContext';
import { HeritageCard } from '../components/HeritageCard';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { getFavorites } from '../services/favoriteService';
import { getConnectivityState } from '../services/api';
import { ApiMonument } from '../services/monumentService';

type FavoritesScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList, 'Favorites'>,
  BottomTabNavigationProp<MainTabParamList>
>;

interface FavoritesScreenProps {
  navigation: FavoritesScreenNavigationProp;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
  const { favorites, isLoading: contextLoading, activeUserId, authToken, refreshFavorites } = useFavorites();
  const [savedMonuments, setSavedMonuments] = useState<ApiMonument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocalFallback = () => {
    const matchedLocal = MONUMENTS.filter((monument) =>
      favorites.includes(monument.id)
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
    setSavedMonuments(matchedLocal as any);
  };

  const fetchPopulatedFavorites = async (showLoadingIndicator = true) => {
    const userIdForRequest = activeUserId;
    if (showLoadingIndicator) {
      setIsLoading(true);
    }
    setError(null);
    setSavedMonuments([]); // Reset previous user's favorite monuments immediately

    if (getConnectivityState() === 'unavailable') {
      loadLocalFallback();
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      if (userIdForRequest && authToken) {
        const data = await getFavorites(userIdForRequest, authToken);
        if (userIdForRequest !== activeUserId) return;
        setSavedMonuments(data);
      } else {
        loadLocalFallback();
      }
    } catch (err: any) {
      if (userIdForRequest !== activeUserId) return;
      console.warn('FavoritesScreen: Failed to fetch populated favorites. Falling back to local data matching.', err);
      
      if (err.status && err.status >= 400 && err.status !== 503) {
        setError('Unable to load your saved heritage sites. Please try again.');
      } else {
        setError(null);
      }

      loadLocalFallback();
    } finally {
      if (userIdForRequest === activeUserId) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  // Sync savedMonuments list dynamically when global favorites context is modified
  useEffect(() => {
    setSavedMonuments((prev) => {
      if (!activeUserId || !authToken) {
        return MONUMENTS.filter((monument) =>
          favorites.includes(monument.id)
        ).map(m => ({
          ...m,
          _id: m.id,
          slug: m.id,
          images: [m.image],
          historicalBackground: m.background,
          culturalSignificance: m.significance,
          preservationStatus: m.preservation,
          interestingFacts: m.facts,
        })) as any;
      }
      return prev.filter((monument) => favorites.includes(monument.id));
    });
  }, [favorites, activeUserId, authToken]);

  // Refresh saved collection when focus returns to the screen
  useFocusEffect(
    useCallback(() => {
      fetchPopulatedFavorites(true);
    }, [activeUserId, authToken])
  );

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (refreshFavorites) {
        await refreshFavorites();
      }
      await fetchPopulatedFavorites(false);
    } catch (err) {
      console.warn('[SAVED HERITAGE] Failed refreshing favorites on pull-down', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNavigateToExplore = () => {
    navigation.navigate('Main', { screen: 'Explore' });
  };

  const handleMonumentPress = (id: string) => {
    navigation.navigate('MonumentDetails', { monumentId: id });
  };

  const handleRetry = () => {
    fetchPopulatedFavorites(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Saved Heritage</Text>
        <Text style={styles.subtitle}>Your personalized preservation museum</Text>
      </View>

      {/* Loading & Favorites List */}
      {isLoading || contextLoading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading saved collection...</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredContainer}>
          <Feather name="alert-circle" size={48} color={COLORS.danger} style={styles.errorIcon} />
          <Text style={styles.errorText}>{error}</Text>
          <PrimaryButton title="Retry" onPress={handleRetry} style={styles.retryButton} />
        </View>
      ) : savedMonuments.length === 0 ? (
        <EmptyState
          title="Your heritage collection is empty."
          description="Save monuments while browsing to build your personal collection and explore them later."
          icon="bookmark"
          actionLabel="Explore Monuments"
          onActionPress={handleNavigateToExplore}
        />
      ) : (
        <FlatList
          data={savedMonuments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.gold}
              colors={[COLORS.gold]}
            />
          }
          renderItem={({ item }) => (
            <HeritageCard
              monument={item}
              onPress={() => handleMonumentPress(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodySmall,
    marginTop: 2,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    marginTop: SPACING.md,
  },
  errorIcon: {
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  retryButton: {
    minWidth: 120,
  },
  listContent: {
    padding: SPACING.lg,
  },
});
