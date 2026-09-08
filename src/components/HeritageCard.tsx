import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { Monument } from '../data/monuments';
import { useFavorites } from '../context/FavoritesContext';
import { SafeImage } from './SafeImage';
import { getImageUrl, getWikimediaFallback } from '../services/monumentService';

interface HeritageCardProps {
  monument: Monument;
  onPress: () => void;
  horizontal?: boolean;
}

const HeritageCardComponent: React.FC<HeritageCardProps> = ({
  monument,
  onPress,
  horizontal = false,
}) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const favorited = isFavorite(monument.id);

  const handleFavoritePress = (e: any) => {
    e.stopPropagation(); // Prevent card navigation trigger
    if (favorited) {
      removeFavorite(monument.id);
    } else {
      addFavorite(monument.id);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.card,
        horizontal ? styles.cardHorizontal : styles.cardVertical
      ]}
    >
      <View style={styles.imageContainer}>
        <SafeImage
          source={getImageUrl(monument.image)}
          fallbackSource={getWikimediaFallback(monument)}
          style={[
            styles.image,
            horizontal ? styles.imageHorizontal : styles.imageVertical
          ]}
          resizeMode="cover"
        />

        {/* Favorite Icon Toggle */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          activeOpacity={0.8}
        >
          <Ionicons
            name={favorited ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={favorited ? COLORS.gold : COLORS.textPrimary}
          />
        </TouchableOpacity>

        {/* Category Label Overlay */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{monument.category.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {monument.name}
        </Text>
        <View style={styles.locationContainer}>
          <Feather name="map-pin" size={12} color={COLORS.gold} />
          <Text style={styles.location} numberOfLines={1}>
            {monument.location}, {monument.state}
          </Text>
        </View>
        {!horizontal && (
          <View style={styles.metaContainer}>
            <Text style={styles.metaText} numberOfLines={1}>
              {monument.period} • {monument.dynasty}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
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
  cardHorizontal: {
    width: 240,
    marginRight: SPACING.md,
  },
  cardVertical: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: COLORS.surfaceIvory,
  },
  image: {
    resizeMode: 'cover',
  },
  imageHorizontal: {
    height: 140,
    width: '100%',
  },
  imageVertical: {
    height: 190,
    width: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceIvory,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  placeholderText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  categoryText: {
    color: COLORS.white,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  detailsContainer: {
    padding: SPACING.md,
  },
  name: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  location: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '500',
  },
  metaContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  metaText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
});

export const HeritageCard = React.memo(HeritageCardComponent);
