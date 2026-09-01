/**
 * HERIXA HeritageVisualsScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure image-based heritage visual exploration screen.
 * Replaces the old Monument3DViewerScreen — no 3D, no WebView, no AR.
 *
 * Features:
 *  - Category filter chips (horizontal scroll)
 *  - Image gallery grid/list
 *  - Fullscreen image viewer with swipe, counter, caption
 *  - Cover image hero area
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  FlatList,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { getMonumentById, getImageUrl, getMonumentVisuals } from '../services/monumentService';
import { textToSpeechService } from '../services/textToSpeechService';
import { SafeImage } from '../components/SafeImage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HeritageVisuals'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_GAP = SPACING.sm;
const COLUMN_COUNT = 2;
const IMAGE_WIDTH = (SCREEN_WIDTH - SPACING.md * 2 - IMAGE_GAP) / COLUMN_COUNT;

const CATEGORIES = [
  'All',
  'Exterior',
  'Entrance',
  'Gopuram',
  'Vimana',
  'Mandapam',
  'Sculptures',
  'Inscriptions',
  'Interior',
  'Courtyard',
  'Architecture',
  'Historical View',
  'Cultural Detail',
  'Other',
];

interface HeritageImage {
  _id?: string;
  id?: string;
  uri: string;
  title: string;
  description?: string;
  caption?: string;
  category?: string;
  viewType?: string;
  order: number;
  enabled: boolean;
  featured?: boolean;
  visible?: boolean;
}

export const HeritageVisualsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { monumentId } = route.params;
  const [monument, setMonument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Fullscreen viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const viewerRef = useRef<FlatList>(null);

  const [liveVisuals, setLiveVisuals] = useState<any[]>([]);

  useEffect(() => {
    const loadMonument = async () => {
      try {
        setIsLoading(true);
        const data = await getMonumentById(monumentId);
        setMonument(data);
        const visRes = await getMonumentVisuals(monumentId).catch(() => null);
        if (visRes && visRes.success && Array.isArray(visRes.data)) {
          setLiveVisuals(visRes.data);
        }
      } catch (err: any) {
        console.error('[HeritageVisuals] Failed to load:', err);
        setError('Failed to load heritage visuals.');
      } finally {
        setIsLoading(false);
      }
    };
    loadMonument();
  }, [monumentId]);

  const navigateBack = () => {
    textToSpeechService.stop().catch(() => {});
    navigation.goBack();
  };

  const handleViewHeritage = () => {
    textToSpeechService.stop().catch(() => {});
    navigation.navigate('MonumentDetails', { monumentId });
  };

  // Filter and merge visible images from monument and liveVisuals API
  const staticVisible = (monument?.heritagePreviewImages || []).filter(
    (img: HeritageImage) => img.enabled !== false && img.visible !== false
  );

  const combinedMap = new Map();
  staticVisible.forEach((v: any) => {
    const key = v._id || v.id || v.uri;
    if (key) combinedMap.set(key, v);
  });
  liveVisuals.forEach((v: any) => {
    const key = v._id || v.id || v.uri;
    if (key) combinedMap.set(key, v);
  });

  const allVisibleImages: HeritageImage[] = Array.from(combinedMap.values());

  // Apply category filter
  const filteredImages = selectedCategory === 'All'
    ? allVisibleImages
    : allVisibleImages.filter(
        (img: HeritageImage) =>
          (img.category || img.viewType || 'Other') === selectedCategory
      );

  // Get available categories from actual data
  const availableCategories = ['All', ...new Set(
    allVisibleImages.map((img: HeritageImage) => img.category || img.viewType || 'Other')
  )];

  // Cover image
  const coverUrl = monument?.coverImageUrl
    ? getImageUrl(monument.coverImageUrl)
    : allVisibleImages[0]
      ? getImageUrl(allVisibleImages[0].uri)
      : null;

  // Featured images first
  const sortedImages = [...filteredImages].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return (a.order || 0) - (b.order || 0);
  });

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  // ── Loading State ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading heritage visuals...</Text>
      </View>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────
  if (error || !monument) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{error || 'Heritage site not found.'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={navigateBack} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>GO BACK</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Empty State ────────────────────────────────────────────────────────
  if (allVisibleImages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={navigateBack} activeOpacity={0.8}>
            <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>HERITAGE VISUALS</Text>
          <TouchableOpacity style={styles.iconButton} onPress={handleViewHeritage} activeOpacity={0.8}>
            <Feather name="book-open" size={22} color={COLORS.gold} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Feather name="image" size={72} color={COLORS.gold} />
          </View>
          <Text style={styles.emptyTitle}>No Heritage Visuals Yet</Text>
          <Text style={styles.emptyDescription}>
            More historical visuals will be added soon.
          </Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={handleViewHeritage} activeOpacity={0.8}>
              <Feather name="book-open" size={20} color={COLORS.gold} style={styles.btnIcon} />
              <Text style={styles.btnOutlineText}>VIEW HERITAGE INFORMATION</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Fullscreen Image Viewer ────────────────────────────────────────────
  const renderFullscreenViewer = () => {
    const currentImage = sortedImages[viewerIndex];
    if (!currentImage) return null;

    return (
      <Modal
        visible={viewerVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setViewerVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.viewerContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />

          {/* Viewer Header */}
          <View style={styles.viewerHeader}>
            <TouchableOpacity
              style={styles.viewerCloseBtn}
              onPress={() => setViewerVisible(false)}
              activeOpacity={0.8}
            >
              <Feather name="x" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.viewerCounter}>
              {viewerIndex + 1} / {sortedImages.length}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Image Swiper */}
          <FlatList
            ref={viewerRef}
            data={sortedImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setViewerIndex(newIndex);
            }}
            keyExtractor={(item) => item._id || item.id || item.uri}
            renderItem={({ item }) => (
              <View style={styles.viewerSlide}>
                <ScrollView
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.viewerZoomContainer}
                >
                  <SafeImage
                    source={{ uri: getImageUrl(item.uri) }}
                    style={styles.viewerImage}
                    resizeMode="contain"
                  />
                </ScrollView>
              </View>
            )}
          />

          {/* Caption Overlay */}
          <View style={styles.viewerCaption}>
            <Text style={styles.viewerCategory}>
              {currentImage.category || currentImage.viewType || 'Heritage Visual'}
            </Text>
            <Text style={styles.viewerTitle}>{currentImage.title}</Text>
            {(currentImage.caption || currentImage.description) ? (
              <Text style={styles.viewerDescription}>
                {currentImage.caption || currentImage.description}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    );
  };

  // ── Main Gallery ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={navigateBack} activeOpacity={0.8}>
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>HERITAGE VISUALS</Text>
        <TouchableOpacity style={styles.iconButton} onPress={handleViewHeritage} activeOpacity={0.8}>
          <Feather name="book-open" size={22} color={COLORS.gold} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover / Hero Image */}
        {coverUrl && (
          <TouchableOpacity
            style={styles.coverContainer}
            onPress={() => openViewer(0)}
            activeOpacity={0.9}
          >
            <SafeImage
              source={{ uri: coverUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            <View style={styles.coverOverlay}>
              <Text style={styles.coverName}>{monument.name}</Text>
              <Text style={styles.coverCount}>
                {allVisibleImages.length} Heritage {allVisibleImages.length === 1 ? 'Image' : 'Images'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {availableCategories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results count */}
        <Text style={styles.resultsCount}>
          {sortedImages.length} {sortedImages.length === 1 ? 'image' : 'images'}
          {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
        </Text>

        {/* Image Grid */}
        {sortedImages.length === 0 ? (
          <View style={styles.noResults}>
            <Feather name="image" size={32} color={COLORS.textSecondary} />
            <Text style={styles.noResultsText}>No images in this category</Text>
          </View>
        ) : (
          <View style={styles.imageGrid}>
            {sortedImages.map((img, index) => (
              <TouchableOpacity
                key={img._id || img.id || `img-${index}`}
                style={styles.gridItem}
                onPress={() => openViewer(index)}
                activeOpacity={0.85}
              >
                <SafeImage
                  source={{ uri: getImageUrl(img.uri) }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
                {img.featured && (
                  <View style={styles.featuredBadge}>
                    <Feather name="star" size={10} color={COLORS.background} />
                  </View>
                )}
                <View style={styles.gridInfo}>
                  <Text style={styles.gridCategory} numberOfLines={1}>
                    {img.category || img.viewType || 'Heritage'}
                  </Text>
                  <Text style={styles.gridTitle} numberOfLines={1}>{img.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Fullscreen Viewer Modal */}
      {renderFullscreenViewer()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    letterSpacing: 1.5,
    flex: 1,
    textAlign: 'center',
  },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xl * 2 },

  // Cover
  coverContainer: {
    height: 200,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  coverImage: { width: '100%', height: '100%' },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: SPACING.md,
  },
  coverName: { color: COLORS.textPrimary, ...TYPOGRAPHY.h3, fontWeight: '700' },
  coverCount: { color: COLORS.gold, ...TYPOGRAPHY.bodySmall, fontWeight: '600', marginTop: 2 },

  // Category chips
  categoryScroll: { marginTop: SPACING.md },
  categoryScrollContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginRight: SPACING.xs,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderColor: COLORS.gold,
  },
  categoryChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },
  categoryChipTextActive: { color: COLORS.gold, fontWeight: '700' },

  // Results count
  resultsCount: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  // Image Grid
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: IMAGE_GAP,
  },
  gridItem: {
    width: IMAGE_WIDTH,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: IMAGE_GAP,
  },
  gridImage: {
    width: '100%',
    height: IMAGE_WIDTH * 0.75,
    backgroundColor: '#111',
  },
  gridInfo: {
    padding: SPACING.sm,
  },
  gridCategory: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  featuredBadge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // No results
  noResults: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.sm,
  },
  noResultsText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium },

  // Loading / Error / Empty
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium, marginTop: SPACING.md },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  errorText: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, textAlign: 'center' },
  backButton: {
    backgroundColor: COLORS.gold,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  backButtonText: { color: COLORS.background, ...TYPOGRAPHY.button, fontWeight: '700' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: { color: COLORS.textPrimary, ...TYPOGRAPHY.h2, fontWeight: '700', textAlign: 'center', marginBottom: SPACING.md },
  emptyDescription: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl * 1.2 },
  emptyActions: { width: '100%', gap: SPACING.md },
  btn: { height: 48, borderRadius: BORDER_RADIUS.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.md },
  btnIcon: { marginRight: SPACING.xs },
  btnOutline: { borderColor: COLORS.gold, borderWidth: 1 },
  btnOutlineText: { color: COLORS.gold, ...TYPOGRAPHY.button, fontWeight: '700' },

  // ── Fullscreen Viewer ──────────────────────────────────────────────────
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.lg,
    paddingBottom: SPACING.sm,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  viewerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCounter: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
  },
  viewerSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerZoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  viewerCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl + 20 : SPACING.xl,
  },
  viewerCategory: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  viewerTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  viewerDescription: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    lineHeight: 18,
    marginTop: 4,
  },
});

export default HeritageVisualsScreen;
