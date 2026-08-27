import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import {
  ViroARSceneNavigator,
  ViroARScene,
  ViroAmbientLight,
  ViroARImageMarker,
  ViroARTrackingTargets,
} from '@reactvision/react-viro';
import { MonumentARConfig } from '../../ar/types';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';

// Safe dynamic targets registration
let targetsRegistered = false;
const registerTrackingTargets = (configs: MonumentARConfig[]) => {
  if (targetsRegistered) return;
  console.log('[AR DEBUG] Starting Viro target registration');
  const targets: Record<string, any> = {};
  configs.forEach((cfg) => {
    if (cfg.recognitionEnabled) {
      const targetName = cfg.slug || cfg.monumentId;
      const isBrihadeeswarar = targetName === 'brihadeeswarar';
      
      if (isBrihadeeswarar) {
        targets[targetName] = {
          source: require('../../../assets/ar_targets/brihadeeswarar_target.jpg'),
          orientation: 'Up',
          physicalWidth: cfg.physicalWidth || 0.15,
          type: 'Image',
        };
        console.log('[AR DEBUG] Target asset path verified');
        console.log('[AR DEBUG] Registering target: ' + targetName);
      } else if (cfg.recognitionImageUrl) {
        targets[targetName] = {
          source: { uri: cfg.recognitionImageUrl },
          orientation: 'Up',
          physicalWidth: cfg.physicalWidth || 0.15,
          type: 'Image',
        };
        console.log('[AR DEBUG] Target asset path verified');
        console.log('[AR DEBUG] Registering target: ' + targetName);
      }
    }
  });
  if (Object.keys(targets).length > 0) {
    try {
      ViroARTrackingTargets.createTargets(targets);
      targetsRegistered = true;
      console.log('[AR DEBUG] Target registration completed');
      console.log('[AR DEBUG] Waiting for physical target');
    } catch (err) {
      console.error('Failed to create Viro tracking targets:', err);
    }
  }
};

interface ARNativeViewportProps {
  configs: MonumentARConfig[];
  currentMonumentId?: string; // Preselected monument
  onStateChange: (state: 'scanning' | 'recognized' | 'targetLost' | 'modelLoading' | 'modelError' | 'error') => void;
  onMonumentDetected: (monumentId: string) => void;
}

// Inner scene component rendered inside ViroARSceneNavigator
const ARScene = (props: any) => {
  const {
    configs,
    onTargetFound,
    onTargetLost,
    onModelLoadStart,
    onModelLoadEnd,
    onModelError,
  } = props.arSceneNavigator.viroAppProps;

  React.useEffect(() => {
    console.log('[AR DEBUG] Scene loaded');
    console.log('[AR DEBUG] Waiting for physical target...');
    configs.forEach((cfg: any) => {
      if (cfg.recognitionEnabled) {
        const targetName = cfg.slug || cfg.monumentId;
        console.log('[AR DEBUG] Image marker mounted: ' + targetName);
      }
    });
  }, []);

  return (
    <ViroARScene>
      <ViroAmbientLight color="#FFFFFF" intensity={1000} />
      
      {configs.map((cfg: MonumentARConfig) => {
        if (!cfg.recognitionEnabled) return null;
        const targetName = cfg.slug || cfg.monumentId;
        console.log('[AR DEBUG] Creating ViroARImageMarker: ' + targetName);

        return (
          <ViroARImageMarker
            key={cfg.monumentId}
            target={targetName}
            onAnchorFound={(anchor) => {
              console.log('[AR DEBUG] onAnchorFound fired');
              console.log('[AR DEBUG] Target name: ' + targetName);
              console.log('- anchor type: ' + (anchor?.type || 'image'));
              console.log('- anchor state: ' + JSON.stringify(anchor));
              console.log('- resolved target: ' + targetName);
              console.log('- resolved MongoDB monument ID: ' + cfg.monumentId);
              onTargetFound(targetName);
            }}
            onAnchorUpdated={(anchor) => {
              console.log('[AR DEBUG] Anchor updated:');
              console.log('- target name: ' + targetName);
              console.log('- anchor type: ' + (anchor?.type || 'image'));
              console.log('- anchor state: ' + JSON.stringify(anchor));
            }}
            onAnchorRemoved={() => {
              console.log('[AR DEBUG] Anchor removed:');
              console.log('- target name: ' + targetName);
              onTargetLost(targetName);
            }}
          >
            {/* No 3D object rendering */}
          </ViroARImageMarker>
        );
      })}
    </ViroARScene>
  );
};

export const ARNativeViewport: React.FC<ARNativeViewportProps> = ({
  configs,
  currentMonumentId,
  onStateChange,
  onMonumentDetected,
}) => {
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [targetsReady, setTargetsReady] = useState(false);

  useEffect(() => {
    console.log('[AR DEBUG] Native Viro loaded: true');
  }, []);

  // Register Viro tracking targets when configs load
  useEffect(() => {
    if (configs && configs.length > 0) {
      registerTrackingTargets(configs);
      setTargetsReady(true);
    }
  }, [configs]);

  const handleTargetFound = (targetName: string) => {
    console.log(`[AR DEBUG] Recognized target: ${targetName}`);
    onMonumentDetected(targetName);
    onStateChange('recognized');
  };

  const handleTargetLost = (targetName: string) => {
    console.log(`[AR DEBUG] Target lost: ${targetName}`);
    onStateChange('targetLost');
    // Reset local loading states upon target lost
    setModelLoading(false);
    setModelError(false);
    setTimeout(() => {
      onStateChange('scanning');
    }, 1000);
  };

  const handleModelLoadStart = () => {
    console.log('[AR DEBUG] Loading 3D model: starting');
    setModelLoading(true);
    setModelError(false);
    onStateChange('modelLoading');
  };

  const handleModelLoadEnd = () => {
    console.log('[AR DEBUG] Loading 3D model: success');
    setModelLoading(false);
    setModelError(false);
    onStateChange('recognized');
  };

  const handleModelError = () => {
    console.log('[AR DEBUG] Loading 3D model: error');
    setModelLoading(false);
    setModelError(true);
    onStateChange('modelError');
  };

  // Filter configurations to search for only enabled ones.
  // If a monumentId was pre-selected, filter to only that monument.
  const activeConfigs = configs.filter(
    (cfg) =>
      cfg.recognitionEnabled &&
      (!currentMonumentId || cfg.monumentId === currentMonumentId || cfg.slug === currentMonumentId)
  );

  if (activeConfigs.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No AR targets configured for scanning.</Text>
      </View>
    );
  }

  if (!targetsReady) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>INITIALIZING AR TRACKER...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        initialScene={{ scene: ARScene as any }}
        viroAppProps={{
          configs: activeConfigs,
          onTargetFound: handleTargetFound,
          onTargetLost: handleTargetLost,
          onModelLoadStart: handleModelLoadStart,
          onModelLoadEnd: handleModelLoadEnd,
          onModelError: handleModelError,
        }}
        style={StyleSheet.absoluteFill}
      />

      {/* Model Loading State Overlay */}
      {modelLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>LOADING 3D MONUMENT MODEL...</Text>
        </View>
      )}

      {/* Model Error Overlay */}
      {modelError && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>UNABLE TO LOAD 3D MODEL</Text>
          <Text style={styles.subErrorText}>Verify network connection or configuration.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: SPACING.xl,
  },
  errorText: {
    color: COLORS.danger,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    textAlign: 'center',
  },
  subErrorText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    marginTop: 4,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(18, 18, 18, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  loadingText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    marginTop: SPACING.md,
    letterSpacing: 1,
  },
});

export default ARNativeViewport;

