import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, StyleProp, ImageStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface SafeImageProps {
  source: any; // Can be { uri: string } or require() reference
  fallbackSource?: any;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export const SafeImage: React.FC<SafeImageProps> = ({
  source,
  fallbackSource,
  style,
  resizeMode = 'cover',
}) => {
  const [currentSource, setCurrentSource] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [attempt, setAttempt] = useState<number>(0); // 0 = primary, 1 = fallback, 2 = failed/placeholder

  const lastSourceKeyRef = React.useRef<string>('');

  // Helper to construct a stable key for comparison
  const getSourceKey = (src: any): string => {
    if (!src) return '';
    if (typeof src === 'string') return src;
    if (typeof src === 'number') return String(src);
    if (typeof src === 'object') {
      if (src.uri) return src.uri;
      try {
        return JSON.stringify(src);
      } catch (_) {
        return '';
      }
    }
    return String(src);
  };

  // Normalize source formats to React Native Image source structures
  const normalizeSource = (src: any) => {
    if (!src) return null;
    if (typeof src === 'string') {
      if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('file://') || src.startsWith('content://')) {
        return { uri: src };
      }
      return null;
    }
    if (typeof src === 'object' && src.uri) {
      if (typeof src.uri === 'string' && src.uri.trim() !== '' && src.uri !== 'undefined' && src.uri !== 'null') {
        return src;
      }
      return null;
    }
    return src; // Require reference
  };

  useEffect(() => {
    const key = getSourceKey(source);
    if (key === lastSourceKeyRef.current && lastSourceKeyRef.current !== '') {
      return;
    }
    lastSourceKeyRef.current = key;

    const normalized = normalizeSource(source);
    setCurrentSource(normalized);
    setLoading(!!normalized);
    setAttempt(0);
    if (normalized && normalized.uri) {
      console.log(`[HERIXA-IMAGE] Loading: ${normalized.uri}`);
    }
  }, [source]);

  const handleLoad = () => {
    setLoading(false);
    if (currentSource && currentSource.uri) {
      console.log(`[HERIXA-IMAGE] Loaded: ${currentSource.uri}`);
    }
  };

  const handleError = () => {
    const failedUri = currentSource?.uri || 'unknown';
    console.log(`[HERIXA-IMAGE] Failed: ${failedUri}`);

    if (attempt === 0 && fallbackSource) {
      const normalizedFallback = normalizeSource(fallbackSource);
      const fallbackKey = getSourceKey(normalizedFallback);
      const primaryKey = getSourceKey(source);

      // Only attempt fallback if it is different from the primary source and not empty
      if (normalizedFallback && fallbackKey !== primaryKey && fallbackKey !== '') {
        setAttempt(1);
        setCurrentSource(normalizedFallback);
        setLoading(true);
        console.log(`[HERIXA-IMAGE] Trying fallback: ${normalizedFallback.uri || 'local-asset'}`);
        return;
      }
    }

    // Fallback also failed or not provided
    setAttempt(2);
    setLoading(false);
    console.log('[HERIXA-IMAGE] All image sources failed');
  };

  // Render placeholder if failed
  if (attempt === 2 || !currentSource) {
    return (
      <View style={[styles.placeholderContainer, style]}>
        <Feather name="image" size={32} color={COLORS.textSecondary || '#888888'} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={currentSource}
        style={style}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
      {loading && (
        <View style={[styles.loaderContainer, StyleSheet.absoluteFill]}>
          <ActivityIndicator size="small" color={COLORS.gold || '#FFD700'} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E1E1E1',
  },
});
