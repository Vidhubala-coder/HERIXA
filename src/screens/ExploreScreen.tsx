import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { MONUMENTS } from '../data/monuments';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { SearchBar } from '../components/SearchBar';
import { CategoryCard } from '../components/CategoryCard';
import { HeritageCard } from '../components/HeritageCard';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { getMonuments, ApiMonument } from '../services/monumentService';
import { getConnectivityState, getApiUrl } from '../services/api';
import { useFavorites } from '../context/FavoritesContext';
import { HerixaLogo } from '../components/HerixaLogo';

type ExploreScreenRouteProp = RouteProp<MainTabParamList, 'Explore'>;
type ExploreScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Explore'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface ExploreScreenProps {
  route: ExploreScreenRouteProp;
  navigation: ExploreScreenNavigationProp;
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({ route, navigation }) => {
  const { addHistory } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(route.params?.category || null);
  
  const [monuments, setMonuments] = useState<ApiMonument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.category && route.params.category !== selectedCategory) {
      setSelectedCategory(route.params.category);
    }
  }, [route.params?.category]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const loadLocalFallback = () => {
    try {
      let result = MONUMENTS;
      
      if (selectedCategory && selectedCategory !== 'All') {
        const cat = selectedCategory.toLowerCase();
        result = result.filter(
          (m) =>
            m.category.toLowerCase().includes(cat) ||
            m.dynasty.toLowerCase().includes(cat) ||
            m.name.toLowerCase().includes(cat)
        );
      }

      if (debouncedSearchQuery.trim().length > 0) {
        const query = debouncedSearchQuery.toLowerCase().trim();
        result = result.filter(
          (m) =>
            m.name.toLowerCase().includes(query) ||
            m.location.toLowerCase().includes(query) ||
            m.state.toLowerCase().includes(query) ||
            m.dynasty.toLowerCase().includes(query) ||
            m.period.toLowerCase().includes(query)
        );
      }

      const fallbackData = result.map((m) => ({
        ...m,
        _id: m.id,
        slug: m.id,
        images: [m.image],
        historicalBackground: m.background,
        culturalSignificance: m.significance,
        preservationStatus: m.preservation,
        interestingFacts: m.facts,
      }));
      setMonuments(fallbackData as any);
    } catch (localErr) {
      setError('Unable to load heritage data. Please try again.');
    }
  };

  const fetchMonuments = async (isRetry = false) => {
    if (!isRetry) setIsLoading(true);
    setError(null);

    if (getConnectivityState() === 'unavailable') {
      loadLocalFallback();
      setIsLoading(false);
      return;
    }

    try {
      const categoryFilter = (selectedCategory && selectedCategory !== 'All') ? selectedCategory : undefined;
      const response = await getMonuments({
        search: debouncedSearchQuery,
        category: categoryFilter,
      });
      setMonuments(response.data);
    } catch (err: any) {
      console.log('[Explore] API request failed');
      console.log(`[Explore] Base URL: ${getApiUrl()}`);
      console.log(`[Explore] Error type: ${err.isTimeout ? 'timeout' : err.isNetworkError ? 'network' : 'http'}`);
      console.log('[Explore] Falling back to local dataset');
      console.warn('ExploreScreen: API call failed. Using local dataset fallback.', err?.message || err);
      loadLocalFallback();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonuments();
    if (debouncedSearchQuery.trim().length > 0) {
      addHistory('search', undefined, debouncedSearchQuery.trim()).catch((err) =>
        console.warn('Failed to save search history entry:', err)
      );
    }
  }, [debouncedSearchQuery, selectedCategory]);

  const categories = ['All', 'Temples', 'Palaces', 'Historical Sites', 'Chola Heritage', 'South Indian Heritage'];

  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category || category === 'All') {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const handleRetry = () => {
    setIsLoading(true);
    fetchMonuments(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* 1. Header */}
      <View style={styles.header}>
        <HerixaLogo size={32} showText={true} style={{ marginBottom: SPACING.xs }} />
        <Text style={styles.title}>Explore India's Heritage</Text>
        <Text style={styles.subtitle}>Discover monuments, architecture and stories from India's rich cultural past.</Text>
      </View>

      {/* 2. Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search monuments, cities or dynasties"
        />
      </View>

      {/* 3. Category Filter Chips */}
      <View style={styles.filterBar}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => {
            const isSelected = (!selectedCategory && item === 'All') || selectedCategory === item;
            return (
              <CategoryCard
                label={item}
                icon={
                  item === 'All' ? '🏛️' :
                  item === 'Temples' ? '🛕' :
                  item === 'Palaces' ? '🏰' :
                  item === 'Historical Sites' ? '🗿' :
                  item === 'Chola Heritage' ? '👑' : '🚩'
                }
                isSelected={isSelected}
                onPress={() => handleCategoryPress(item)}
              />
            );
          }}
        />
      </View>

      {/* 4. Monument Cards */}
      {isLoading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Searching heritage sites...</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredContainer}>
          <Feather name="alert-circle" size={48} color={COLORS.danger} style={styles.errorIcon} />
          <Text style={styles.errorText}>{error}</Text>
          <PrimaryButton title="Retry" onPress={handleRetry} style={styles.retryButton} />
        </View>
      ) : monuments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="No heritage sites found."
            description="We couldn't find any results matching your search or filters. Try adjusting your query."
            icon="search"
            actionLabel="Reset Filters"
            onActionPress={handleClearFilters}
          />
        </View>
      ) : (
        <FlatList
          data={monuments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <HeritageCard
              monument={item}
              onPress={() => navigation.navigate('MonumentDetails', { monumentId: item.id })}
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
    paddingBottom: SPACING.xs,
  },
  title: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h1,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    marginTop: 4,
    lineHeight: 20,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  filterBar: {
    marginVertical: SPACING.md,
  },
  categoriesList: {
    paddingHorizontal: SPACING.lg,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
  },
  errorIcon: {
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyLarge,
    textAlign: 'center',
  },
  retryButton: {
    width: 140,
    marginTop: SPACING.sm,
  },
});

export default ExploreScreen;
