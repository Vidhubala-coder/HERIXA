import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MonumentARConfig } from '../../ar/types';

interface ARNativeViewportLoaderProps {
  configs: MonumentARConfig[];
  currentMonumentId?: string;
  onStateChange: (state: 'scanning' | 'recognized' | 'targetLost' | 'modelLoading' | 'modelError' | 'error') => void;
  onMonumentDetected: (monumentId: string) => void;
}

export const ARNativeViewportLoader: React.FC<ARNativeViewportLoaderProps> = (props) => {
  try {
    // Dynamically require the Viro implementation at render time.
    // This is only executed if this component is mounted, i.e., in a Development Build.
    // In Expo Go, this component is never mounted, so this require is never run!
    // @ts-ignore
    const ARNativeViewport = require('./ARNativeViewport').default;
    return <ARNativeViewport {...props} />;
  } catch (error) {
    console.error('Failed to load ARNativeViewport dynamically:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Native AR components could not be initialized.</Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  errorText: {
    color: '#FF3B30',
    fontWeight: '700',
  },
});

export default ARNativeViewportLoader;
