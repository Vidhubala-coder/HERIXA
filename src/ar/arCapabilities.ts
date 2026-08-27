import { Platform, UIManager } from 'react-native';
import { ARCapabilityResult } from './types';

/**
 * Reusable capability checker to determine native AR modules and camera availability.
 */
export const checkARCapability = async (): Promise<ARCapabilityResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        console.log('[HERITAGEAR] Starting capability check...');
        console.log('[HERITAGEAR] Platform: ' + Platform.OS);
        
        // 1. Platform check
        if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
          console.log('[HERITAGEAR] AR capability: unsupported (non-mobile device)');
          resolve({ supported: false, reason: 'UNSUPPORTED_DEVICE' });
          return;
        }

        // 2. Viro Native Module Check
        const isViroAvailable = !!UIManager.getViewManagerConfig('ViroARSceneNavigator');
        console.log('[HERITAGEAR] Native AR module available: ' + isViroAvailable);

        if (!isViroAvailable) {
          console.log('[HERITAGEAR] AR capability: unsupported (Native module not compiled)');
          resolve({ supported: false, reason: 'NATIVE_MODULE_UNAVAILABLE' });
          return;
        }

        // 3. Android ARCore assumption & runtime check fallback
        if (Platform.OS === 'android') {
          console.log('[HERITAGEAR] AR capability: supported (module present, awaiting runtime verification)');
          resolve({ supported: true, reason: 'SUPPORTED' });
        } else {
          // iOS has ARKit built-in
          resolve({ supported: true, reason: 'SUPPORTED' });
        }
      } catch (err) {
        console.error('[HERITAGEAR] AR capability check error:', err);
        resolve({ supported: false, reason: 'UNKNOWN' });
      }
    }, 100);
  });
};

