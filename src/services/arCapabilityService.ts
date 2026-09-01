import { Platform } from 'react-native';
import { checkARCapability } from '../ar/arCapabilities';

export type ARCapability = 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN';

/**
 * Reusable service to safely detect AR capability on the current device.
 * Enforces standard mapping: SUPPORTED, UNSUPPORTED, UNKNOWN.
 */
export const detectARCapability = async (): Promise<ARCapability> => {
  try {
    // Platform checking
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.log('[AR-CAPABILITY] Non-mobile platform detected. Mapping to UNSUPPORTED.');
      return 'UNSUPPORTED';
    }

    // Call underlying Viro modules / platform hardware checks
    const result = await checkARCapability();
    if (result.supported) {
      console.log('[AR-CAPABILITY] Native AR tracking supported.');
      return 'SUPPORTED';
    } else {
      console.log(`[AR-CAPABILITY] AR capability unsupported. Reason: ${result.reason}`);
      if (result.reason === 'UNSUPPORTED_DEVICE' || result.reason === 'NATIVE_MODULE_UNAVAILABLE') {
        return 'UNSUPPORTED';
      }
      return 'UNKNOWN';
    }
  } catch (error) {
    console.error('[AR-CAPABILITY] Capability check encountered an error:', error);
    return 'UNKNOWN'; // Safe fallback
  }
};
