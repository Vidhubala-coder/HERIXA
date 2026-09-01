import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { getMonuments, getImageUrl } from '../services/monumentService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { HERITAGE_MAP_HTML } from '../utils/heritageMapHtml';

export const HeritageMapScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const webViewRef = useRef<WebView>(null);
  const [monuments, setMonuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapEngineReady, setIsMapEngineReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payload Sent Deduplication Guard Ref
  const lastSentPayloadRef = useRef<string>('');

  // Runtime Diagnostic Stage Tracking
  const [currentStage, setCurrentStage] = useState<string>('SCREEN_MOUNTED');
  const [renderedMarkersCount, setRenderedMarkersCount] = useState<number>(0);
  const [layoutBounds, setLayoutBounds] = useState<string>('INIT');

  const addLog = useCallback((stage: string, detail?: string) => {
    const formatted = detail ? `[HERITAGE_MAP] ${stage}: ${detail}` : `[HERITAGE_MAP] ${stage}`;
    if (__DEV__) console.log(formatted);
    setCurrentStage(stage);
  }, []);

  useEffect(() => {
    addLog('SCREEN_MOUNTED');
  }, [addLog]);

  const fetchMonuments = useCallback(async () => {
    setErrorMsg(null);
    try {
      addLog('MONUMENTS_FETCH_STARTED');
      const res = await getMonuments({ limit: 100 });
      if (res && res.data) {
        setMonuments(res.data);
        addLog('MONUMENTS_FETCHED', `${res.data.length} total monuments`);
      }
    } catch (err: any) {
      addLog('MONUMENTS_FETCH_FAILED', err?.message || String(err));
      setErrorMsg('Heritage Map is temporarily unavailable. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    fetchMonuments();
  }, [fetchMonuments]);

  // 10s MAP_READY Timeout Guard to eliminate permanent WAITING
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (!isMapEngineReady && !errorMsg) {
      timeoutId = setTimeout(() => {
        if (!isMapEngineReady) {
          addLog('MAP_READY_TIMEOUT', 'Map initialization timed out after 10s');
          setErrorMsg('Heritage Map engine initialization timed out. Please tap retry.');
        }
      }, 10000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isMapEngineReady, errorMsg, addLog]);

  const handleRefresh = () => {
    setIsLoading(true);
    setIsMapEngineReady(false);
    lastSentPayloadRef.current = '';
    setErrorMsg(null);
    addLog('SCREEN_REFRESHED');
    fetchMonuments();
  };

  const getMonumentCoverImage = useCallback((m: any): string => {
    if (!m) return getImageUrl('');
    if (m.coverImageUrl) return getImageUrl(m.coverImageUrl);
    if (m.heritagePreviewImages && Array.isArray(m.heritagePreviewImages)) {
      const featured = m.heritagePreviewImages.find(
        (img: any) => (img.featured === true || img.featured === 'true') && img.enabled !== false && img.visible !== false
      );
      if (featured && featured.uri) return getImageUrl(featured.uri);
      const first = m.heritagePreviewImages.find(
        (img: any) => img.enabled !== false && img.visible !== false
      );
      if (first && first.uri) return getImageUrl(first.uri);
    }
    const existing = m.imageUrl || m.image || m.coverImage;
    if (existing) return getImageUrl(existing);
    return getImageUrl('');
  }, []);

  // Filter valid geographic coordinates (-90 to 90 lat, -180 to 180 lng) - Memoized
  const validMonuments = useMemo(() => {
    return monuments.filter((m) => {
      const lat = Number(m.latitude);
      const lng = Number(m.longitude);
      const isValid = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      if (!isValid && __DEV__) {
        console.warn(`[HERITAGE_MAP] Invalid coordinates ignored for monument "${m.name}": lat=${m.latitude}, lng=${m.longitude}`);
      }
      return isValid;
    });
  }, [monuments]);

  // Memoize markers payload object to maintain reference stability across renders
  const markersData = useMemo(() => {
    return validMonuments.map((m) => {
      const rawDesc = m.shortHistory || m.description || m.background || m.culturalSignificance || 'Ancient heritage monument in India.';
      const cleanDesc = rawDesc.replace(/\r?\n|\r/g, ' ').trim();
      const descExcerpt = cleanDesc.length > 110 ? cleanDesc.substring(0, 110) + '...' : cleanDesc;
      const nameStr = (m.name || 'Heritage Site').trim();
      const locStr = ([m.district, m.state || m.location].filter(Boolean).join(', ') || 'Tamil Nadu').trim();
      const categoryStr = (m.category || 'Temple / Heritage Site').trim();

      return {
        monumentId: m._id || m.id,
        name: nameStr,
        location: locStr,
        category: categoryStr,
        lat: Number(m.latitude),
        lng: Number(m.longitude),
        image: getMonumentCoverImage(m),
        description: descExcerpt,
      };
    });
  }, [validMonuments, getMonumentCoverImage]);

  // Send monuments to WebView with strict payload & map instance deduplication
  const sendMonumentsToWebView = useCallback(() => {
    if (!webViewRef.current || !isMapEngineReady || markersData.length === 0) {
      return;
    }

    const payloadStr = JSON.stringify(markersData);
    if (lastSentPayloadRef.current === payloadStr) {
      // Prevent redundant SET_MONUMENTS postMessage execution when data is unchanged
      return;
    }

    lastSentPayloadRef.current = payloadStr;
    addLog('SET_MONUMENTS_SENT', `${markersData.length} monuments payload`);
    webViewRef.current.postMessage(
      JSON.stringify({
        type: 'SET_MONUMENTS',
        monuments: markersData,
      })
    );
  }, [isMapEngineReady, markersData, addLog]);

  useEffect(() => {
    if (isMapEngineReady) {
      sendMonumentsToWebView();
    }
  }, [isMapEngineReady, sendMonumentsToWebView]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>HERITAGE MAP</Text>
          <Text style={styles.headerSubtitle}>Discover living monuments across India</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.badgeText}>{validMonuments.length} MAPPED</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} activeOpacity={0.8}>
            <Feather name="refresh-cw" size={14} color={COLORS.gold} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Development Status Pill in __DEV__ */}
      {__DEV__ && (
        <View style={styles.devPill}>
          <Text style={styles.devPillText}>
            [HERITAGE_MAP] {currentStage} ({renderedMarkersCount}/{validMonuments.length}) | Size: {layoutBounds}
          </Text>
        </View>
      )}

      {/* Floating empty state overlay if valid monuments is 0 */}
      {validMonuments.length === 0 && !isLoading && !errorMsg && (
        <View style={styles.emptyOverlayBanner}>
          <Feather name="info" size={14} color={COLORS.gold} />
          <Text style={styles.emptyOverlayText}>No Heritage Sites Available</Text>
        </View>
      )}

      {/* Map Body */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loaderText}>Loading Heritage Map...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.errorContainer}>
          <Feather name="wifi-off" size={40} color={COLORS.gold} style={{ marginBottom: SPACING.md }} />
          <Text style={styles.errorTitle}>Heritage Map Unavailable</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>RETRY CONNECTION</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={styles.mapWrap}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            const sizeStr = `${Math.round(width)}x${Math.round(height)}`;
            setLayoutBounds(sizeStr);
            addLog('LAYOUT_SIZE', sizeStr);
          }}
        >
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: HERITAGE_MAP_HTML, baseUrl: 'about:blank' }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            allowFileAccessFromFileURLs={true}
            javaScriptCanOpenWindowsAutomatically={true}
            scalesPageToFit={false}
            androidLayerType="none"
            onLoadStart={() => addLog('WEBVIEW_LOADING')}
            onLoadEnd={() => addLog('WEBVIEW_LOADED')}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              addLog('WEBVIEW_ERROR', nativeEvent.description || 'Unknown error');
              setErrorMsg('Heritage Map is temporarily unavailable. Please check your connection and try again.');
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              addLog('WEBVIEW_HTTP_ERROR', `Status ${nativeEvent.statusCode}`);
            }}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'MAP_READY') {
                  addLog('MAP_READY_RECEIVED');
                  setIsMapEngineReady(true);
                } else if (data.type === 'MARKERS_READY') {
                  setRenderedMarkersCount(data.count);
                  addLog('MARKERS_READY_RECEIVED', `${data.count} markers rendered`);
                } else if (data.type === 'NAVIGATE_DETAILS' && data.monumentId) {
                  addLog('NAVIGATE_DETAILS', data.monumentId);
                  navigation.navigate('MonumentDetails', { monumentId: data.monumentId });
                } else if (data.type === 'LOG' && data.text) {
                  if (__DEV__) console.log(data.text);
                } else if (data.type === 'HTML_ERROR' || data.type === 'MAP_RUNTIME_ERROR') {
                  addLog('JS_ERROR', `${data.message} (${data.line}:${data.column})`);
                  setErrorMsg('Heritage Map is temporarily unavailable. Please check your connection and try again.');
                }
              } catch (e) {
                if (__DEV__) console.warn('[HERITAGE_MAP] Message parse error:', e);
              }
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
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
  headerTitle: { color: COLORS.textPrimary, ...TYPOGRAPHY.h3, fontWeight: '800', letterSpacing: 1.2 },
  headerSubtitle: { color: COLORS.textSecondary, ...TYPOGRAPHY.caption, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  badgeText: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devPill: {
    backgroundColor: '#1A1A18',
    paddingVertical: 3,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  devPillText: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyOverlayBanner: {
    position: 'absolute',
    top: 75,
    alignSelf: 'center',
    zIndex: 100,
    backgroundColor: 'rgba(26, 26, 24, 0.92)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  emptyOverlayText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '700',
  },
  mapWrap: { flex: 1, width: '100%', height: '100%', backgroundColor: COLORS.background },
  webView: { flex: 1, width: '100%', height: '100%', backgroundColor: COLORS.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.background },
  loaderText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.xs },
  errorTitle: { color: COLORS.textPrimary, ...TYPOGRAPHY.h3, fontWeight: '700', marginTop: SPACING.xs },
  errorText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.md },
  retryBtn: { backgroundColor: COLORS.gold, paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.xl, borderRadius: BORDER_RADIUS.md },
  retryBtnText: { color: COLORS.background, ...TYPOGRAPHY.button, fontWeight: '800' },
});
