import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
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
      console.warn('FavoritesScreen: Falling back to local data matching.', err);
      setError(null);
      loadLocalFallback();
    } finally {
      if (userIdForRequest === activeUserId) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

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
      console.warn('[SAVED HERITAGE] Failed refreshing favorites', err);
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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Heritage Collection</Text>
        <Text style={styles.subtitle}>Saved archaeological monuments and landmarks</Text>
      </View>

      {/* Favorites List */}
      {isLoading || contextLoading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading saved collection...</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredContainer}>
          <Feather name="alert-circle" size={44} color={COLORS.danger} style={styles.errorIcon} />
          <Text style={styles.errorText}>{error}</Text>
          <PrimaryButton title="Retry" onPress={handleRetry} style={styles.retryButton} />
        </View>
      ) : savedMonuments.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <EmptyState
            title="Your heritage journey starts here."
            description="Save monuments you want to explore later."
            icon="bookmark"
            actionLabel="Explore Heritage"
            onActionPress={handleNavigateToExplore}
          />
        </View>
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
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h1,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    marginTop: 2,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
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

export default FavoritesScreen;
