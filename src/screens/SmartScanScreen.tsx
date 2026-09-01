import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import ARViewport from '../components/ar/ARViewport';
import { recognizeMonumentFromImage, ImageRecognitionResponse } from '../services/monumentService';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList, RecognitionResultData } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'SmartScan'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Calibration Thresholds (Calibrated scores between 0.0 and 1.0)
const HIGH_CONFIDENCE_THRESHOLD = 0.80; // >= 80% confidence is highly reliable
const MEDIUM_CONFIDENCE_THRESHOLD = 0.35; // 35% - 79% is a possible/tentative match

export const SmartScanScreen: React.FC<Props> = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  // Auto-request permission on mount
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // Handle open settings
  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      console.warn('Cannot open settings:', e);
    }
  };

  // Image preprocessing and analysis pipeline
  const processAndRecognize = async (imageUri: string) => {
    setIsAnalyzing(true);
    setScanError(null);
    setStatusMessage('Compressing scan data...');

    try {
      // 1. Resize to 1024px width and compress to 80% JPEG to optimize payload size
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) {
        throw new Error('Image compression did not generate base64 data.');
      }

      setStatusMessage('HERIXA AI identifying monument...');

      // 2. Execute recognition API
      const result: ImageRecognitionResponse = await recognizeMonumentFromImage(manipulated.base64);

      if (!result.success) {
        throw new Error(result.reason || 'AI recognition failed');
      }

      // 3. Evaluate results against calibrated confidence thresholds
      const confidence = result.confidence ?? 0;

      if (result.recognized && confidence >= MEDIUM_CONFIDENCE_THRESHOLD && result.monumentId) {
        // Successful or tentative match
        const matchData: RecognitionResultData = {
          monumentId: result.monumentId,
          monumentName: result.monumentName || 'Unknown Monument',
          confidence: confidence,
          dynasty: result.data?.dynasty,
          architecturalHighlights: result.data?.architecturalHighlights,
          imageUrl: result.data?.image,
        };

        navigation.navigate('RecognitionResult', { result: matchData });
      } else {
        // Low confidence / unrecognized
        setScanError(
          result.reason ||
          'Unable to confidently identify this monument. Please scan the main structure from a clearer angle.'
        );
      }
    } catch (error: any) {
      console.error('[SMART_SCAN] Error processing image:', error);
      setScanError(error.message || 'An error occurred during scanning. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  // Triggered by Capture button
  const handleCapture = async () => {
    if (!cameraRef.current) {
      setScanError('Camera initialization in progress.');
      return;
    }

    try {
      setStatusMessage('Capturing...');
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo && photo.uri) {
        await processAndRecognize(photo.uri);
      } else {
        throw new Error('Failed to capture picture.');
      }
    } catch (e: any) {
      setScanError(e.message || 'Failed to capture image.');
    }
  };

  // Triggered by Gallery button
  const handlePickFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setScanError('Gallery access permission is required to choose images.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        await processAndRecognize(pickerResult.assets[0].uri);
      }
    } catch (e: any) {
      setScanError(e.message || 'Failed to pick image from gallery.');
    }
  };

  // Safe camera permission check for try again button
  const handleTryPermissionAgain = async () => {
    await requestPermission();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Reusable Camera Wrapper */}
      <ARViewport
        permission={permission}
        onRequestPermission={handleTryPermissionAgain}
        isPreviewMode={isPreviewMode}
        onEnterPreviewMode={() => setIsPreviewMode(true)}
        cameraRef={cameraRef}
      >
        <SafeAreaView style={styles.safeContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>HERIXA SMART SCAN</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Scanner Guidance Frame */}
          {!isAnalyzing && !scanError && (
            <View style={styles.scannerOverlay}>
              <View style={styles.guidanceFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <View style={styles.guidanceTextContainer}>
                <Text style={styles.guidanceText}>Align the monument inside the frame</Text>
              </View>
            </View>
          )}

          {/* Loading Indicator Modal */}
          {isAnalyzing && (
            <View style={styles.overlayModal}>
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color={COLORS.gold} />
                <Text style={styles.loaderText}>{statusMessage}</Text>
              </View>
            </View>
          )}

          {/* Error / Failure Modal overlay */}
          {scanError && (
            <View style={styles.overlayModal}>
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={48} color={COLORS.danger} style={styles.errorIcon} />
                <Text style={styles.errorTitle}>Scan Unsuccessful</Text>
                <Text style={styles.errorDescription}>{scanError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => setScanError(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryButtonText}>SCAN AGAIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Control Bar */}
          {!isAnalyzing && !scanError && (
            <View style={styles.controlsBar}>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={26} color={COLORS.textPrimary} />
                <Text style={styles.controlText}>GALLERY</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleCapture}
                activeOpacity={0.8}
              >
                <View style={styles.captureInnerButton} />
              </TouchableOpacity>

              <View style={{ width: 60, alignItems: 'center' }} />
            </View>
          )}
        </SafeAreaView>
      </ARViewport>
    </View>
  );
};

const { width } = Dimensions.get('window');
const frameSize = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidanceFrame: {
    width: frameSize,
    height: frameSize,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.gold,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: BORDER_RADIUS.sm,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: BORDER_RADIUS.sm,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: BORDER_RADIUS.sm,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: BORDER_RADIUS.sm,
  },
  guidanceTextContainer: {
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.sm,
  },
  guidanceText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  overlayModal: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    zIndex: 100,
  },
  loaderBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderColor: COLORS.gold,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  loaderText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderColor: COLORS.border,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  errorIcon: {
    marginBottom: SPACING.md,
  },
  errorTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  errorDescription: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  retryButton: {
    backgroundColor: COLORS.gold,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
  controlsBar: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  galleryButton: {
    alignItems: 'center',
    width: 60,
  },
  controlText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInnerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gold,
  },
});
export default SmartScanScreen;
