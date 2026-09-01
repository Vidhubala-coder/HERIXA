import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { getMonumentById, getImageUrl } from '../services/monumentService';
import { textToSpeechService } from '../services/textToSpeechService';
import { SafeImage } from '../components/SafeImage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = { route: any; navigation: any };
type ActiveViewMode = '3d' | 'views';
const { width } = Dimensions.get('window');

export const Monument3DViewerScreen: React.FC<Props> = ({ route, navigation }) => {
  const { monumentId } = route.params;
  const [monument, setMonument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout Tab toggles: '3d' or 'views'
  const [activeMode, setActiveMode] = useState<ActiveViewMode>('3d');
  
  // Interactive preview gallery index
  const [selectedViewIndex, setSelectedViewIndex] = useState(0);

  useEffect(() => {
    const loadMonument = async () => {
      try {
        setIsLoading(true);
        const data = await getMonumentById(monumentId);
        setMonument(data);

        const has3D = !!(data.modelUrl && data.modelUrl.trim());
        const hasPreviews = !!(data.heritagePreviewImages && data.heritagePreviewImages.filter((img: any) => img.enabled !== false).length > 0 && data.interactivePreviewEnabled !== false);

        if (!has3D && hasPreviews) {
          setActiveMode('views');
        } else {
          setActiveMode('3d');
        }
      } catch (err: any) {
        console.error('[3D_VIEWER] Failed to load monument details:', err);
        setError('Failed to load monument metadata.');
      } finally {
        setIsLoading(false);
      }
    };

    loadMonument();
  }, [monumentId]);

  const handleViewHeritage = () => {
    textToSpeechService.stop().catch(() => {});
    navigation.navigate('MonumentDetails', { monumentId });
  };

  const handleScanAnother = () => {
    textToSpeechService.stop().catch(() => {});
    navigation.navigate('Main', { screen: 'SmartScan' });
  };

  const navigateBack = () => {
    textToSpeechService.stop().catch(() => {});
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading heritage assets pipeline...</Text>
      </View>
    );
  }

  if (error || !monument) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{error || 'Monument details not found.'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={navigateBack} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>GO BACK</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const has3D = !!(monument.modelUrl && monument.modelUrl.trim());
  
  // Filter active heritage views
  const activeViews = (monument.heritagePreviewImages || []).filter(
    (img: any) => img.enabled !== false && monument.interactivePreviewEnabled !== false
  );
  const hasPreviews = activeViews.length > 0;

  // Google model-viewer HTML Injectable Template
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <style>
          body, html {
            margin: 0; padding: 0; width: 100%; height: 100%; background-color: #121212;
            overflow: hidden; display: flex; justify-content: center; align-items: center;
          }
          model-viewer {
            width: 100%; height: 100%; background-color: #121212; --poster-color: transparent;
          }
          .loading-label {
            position: absolute; color: #D4AF37; font-family: sans-serif; font-size: 14px; font-weight: bold; z-index: 10;
          }
        </style>
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
      </head>
      <body>
        <model-viewer
          src="${monument.modelUrl}"
          alt="3D representation of ${monument.name}"
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          auto-rotate
          interaction-prompt="auto"
          shadow-intensity="1.5"
          exposure="1.2"
          shadow-softness="1"
        >
          <div slot="poster" class="loading-label">Loading 3D mesh model...</div>
        </model-viewer>
      </body>
    </html>
  `;

  // Render Interactive Heritage Preview Gallery
  const renderHeritagePreviewGallery = () => {
    if (!hasPreviews) return null;
    const currentView = activeViews[selectedViewIndex];

    return (
      <View style={styles.galleryContainer}>
        {/* Large Selected View */}
        <View style={styles.mainViewWrapper}>
          <SafeImage
            source={{ uri: getImageUrl(currentView.uri) }}
            style={styles.mainImage}
            resizeMode="contain"
          />
          
          {/* Overlay view info */}
          <View style={styles.overlayInfo}>
            <Text style={styles.overlayTitle}>{currentView.title}</Text>
            <Text style={styles.overlayType}>{currentView.viewType}</Text>
            {currentView.description ? (
              <Text style={styles.overlayDesc}>{currentView.description}</Text>
            ) : null}
          </View>
        </View>

        {/* Thumbnail views list */}
        <View style={styles.thumbnailsWrapper}>
          <Text style={styles.thumbnailHeader}>SELECT HERITAGE VIEW</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailsScroll}
          >
            {activeViews.map((v: any, idx: number) => {
              const isSelected = selectedViewIndex === idx;
              return (
                <TouchableOpacity
                  key={v._id || v.id}
                  style={[styles.thumbBtn, isSelected && styles.thumbBtnActive]}
                  onPress={() => setSelectedViewIndex(idx)}
                  activeOpacity={0.8}
                >
                  <SafeImage source={{ uri: getImageUrl(v.uri) }} style={styles.thumbImg} resizeMode="cover" />
                  <Text style={[styles.thumbLabel, isSelected && styles.thumbLabelActive]} numberOfLines={1}>
                    {v.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent={false} backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={navigateBack} activeOpacity={0.8}>
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{monument.name.toUpperCase()}</Text>
        <TouchableOpacity style={styles.iconButton} onPress={handleViewHeritage} activeOpacity={0.8}>
          <Feather name="book-open" size={22} color={COLORS.gold} />
        </TouchableOpacity>
      </View>

      {/* Case 3: Dual visual tabs (3D Model | Heritage Views) */}
      {has3D && hasPreviews ? (
        <View style={styles.dualTabs}>
          <TouchableOpacity
            style={[styles.modeTab, activeMode === '3d' && styles.modeTabActive]}
            onPress={() => setActiveMode('3d')}
          >
            <Ionicons name="cube-outline" size={16} color={activeMode === '3d' ? COLORS.gold : COLORS.textSecondary} />
            <Text style={[styles.modeTabText, activeMode === '3d' && styles.modeTabTextActive]}>3D MODEL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, activeMode === 'views' && styles.modeTabActive]}
            onPress={() => setActiveMode('views')}
          >
            <Feather name="image" size={16} color={activeMode === 'views' ? COLORS.gold : COLORS.textSecondary} />
            <Text style={[styles.modeTabText, activeMode === 'views' && styles.modeTabTextActive]}>HERITAGE VIEWS</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Content Rendering based on mode */}
      {activeMode === '3d' && has3D ? (
        <View style={styles.webviewWrapper}>
          <WebView
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webviewLoader}>
                <ActivityIndicator size="large" color={COLORS.gold} />
              </View>
            )}
          />
        </View>
      ) : activeMode === 'views' && hasPreviews ? (
        renderHeritagePreviewGallery()
      ) : (
        /* Case 4 Fallback if neither assets configured */
        <View style={styles.fallbackContent}>
          <View style={styles.fallbackIconContainer}>
            <Ionicons name="cube-outline" size={72} color={COLORS.gold} />
          </View>
          <Text style={styles.fallbackTitle}>Assets Currently Offline</Text>
          <Text style={styles.fallbackDescription}>
            Heritage visualization assets for {monument.name} are currently being processed. Tap below to read the comprehensive heritage guide.
          </Text>

          <View style={styles.fallbackActions}>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={handleViewHeritage} activeOpacity={0.8}>
              <Feather name="book-open" size={20} color={COLORS.gold} style={styles.btnIcon} />
              <Text style={styles.btnOutlineText}>VIEW HERITAGE INFORMATION</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnGold]} onPress={handleScanAnother} activeOpacity={0.8}>
              <Feather name="refresh-cw" size={20} color={COLORS.background} style={styles.btnIcon} />
              <Text style={styles.btnGoldText}>SCAN ANOTHER MONUMENT</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, fontWeight: '700', letterSpacing: 1.5, flex: 1, textAlign: 'center' },
  
  // Dual tabs
  dualTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  modeTab: { flex: 1, paddingVertical: SPACING.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent', height: 48 },
  modeTabActive: { borderBottomColor: COLORS.gold },
  modeTabText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  modeTabTextActive: { color: COLORS.gold },

  webviewWrapper: { flex: 1, backgroundColor: '#121212' },
  webview: { flex: 1, backgroundColor: '#121212' },
  webviewLoader: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  
  // Interactive Heritage Preview styles
  galleryContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  mainViewWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  mainImage: { width: width, height: '100%' },
  overlayInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,10,10,0.85)', padding: SPACING.md,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)'
  },
  overlayTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  overlayType: { color: COLORS.gold, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },
  overlayDesc: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },

  thumbnailsWrapper: { height: 130, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: SPACING.sm },
  thumbnailHeader: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, paddingHorizontal: SPACING.md, marginBottom: 8 },
  thumbnailsScroll: { paddingHorizontal: SPACING.md, gap: 10 },
  thumbBtn: { width: 75, alignItems: 'center', gap: 4 },
  thumbBtnActive: { opacity: 0.9 },
  thumbImg: { width: 75, height: 52, borderRadius: BORDER_RADIUS.sm, borderWidth: 1.5, borderColor: 'transparent' },
  thumbBtnActive_border: { borderColor: COLORS.gold }, // Custom logic helper
  thumbLabel: { color: COLORS.textSecondary, fontSize: 9, textAlign: 'center', fontWeight: '500' },
  thumbLabelActive: { color: COLORS.gold, fontWeight: '700' },

  // Loader / Fallbacks
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium, marginTop: SPACING.md },
  errorContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
  errorText: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, textAlign: 'center' },
  backButton: { backgroundColor: COLORS.gold, height: 48, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl, marginTop: SPACING.lg },
  backButtonText: { color: COLORS.background, ...TYPOGRAPHY.button, fontWeight: '700' },
  fallbackContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  fallbackIconContainer: { width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(212, 175, 55, 0.08)', borderColor: 'rgba(212, 175, 55, 0.2)', borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xl },
  fallbackTitle: { color: COLORS.textPrimary, ...TYPOGRAPHY.h2, fontWeight: '700', textAlign: 'center', marginBottom: SPACING.md },
  fallbackDescription: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl * 1.2 },
  fallbackActions: { width: '100%', gap: SPACING.md },
  btn: { height: 48, borderRadius: BORDER_RADIUS.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.md },
  btnIcon: { marginRight: SPACING.xs },
  btnOutline: { borderColor: COLORS.gold, borderWidth: 1 },
  btnOutlineText: { color: COLORS.gold, ...TYPOGRAPHY.button, fontWeight: '700' },
  btnGold: { backgroundColor: COLORS.gold },
  btnGoldText: { color: COLORS.background, ...TYPOGRAPHY.button, fontWeight: '700' },
});

export default Monument3DViewerScreen;
