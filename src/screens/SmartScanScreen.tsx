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
import {
  recognizeMonumentFromImage,
  ImageRecognitionResponse,
  checkAiReadiness,
  waitForAiReady
} from '../services/monumentService';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList, RecognitionResultData } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'SmartScan'> &
  NativeStackScreenProps<RootStackParamList>;

const MEDIUM_CONFIDENCE_THRESHOLD = 0.35;

export const SmartScanScreen: React.FC<Props> = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanErrorTitle, setScanErrorTitle] = useState<string>('Recognition Unsuccessful');
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const processAndRecognize = async (imageUri: string) => {
    setIsAnalyzing(true);
    setScanError(null);
    setScanErrorTitle('Recognition Unsuccessful');
    setStatusMessage('Compressing image data...');

    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) {
        throw new Error('Image processing failed.');
      }

      // Check AI readiness before sending heavy recognition request
      setStatusMessage('Checking AI service readiness...');
      const initialReadiness = await checkAiReadiness(3000);

      if (!initialReadiness.isReady) {
        // AI is cold / asleep on cloud: enter "Warming Up" state and poll until ready
        setStatusMessage('AI Service Warming Up...');
        const isReady = await waitForAiReady((elapsedSec) => {
          setStatusMessage(`AI Service Warming Up (${elapsedSec}s)...`);
        }, 75000, 2500);

        if (!isReady) {
          setScanErrorTitle('AI Service Warming Up');
          setScanError('HERIXA AI service took too long to wake up. Please tap SCAN AGAIN in a few moments.');
          return;
        }
      }

      // AI is ready: automatically proceed to recognition
      setStatusMessage('Analyzing Heritage...');

      let result: ImageRecognitionResponse = await recognizeMonumentFromImage(manipulated.base64);

      // If backend returned cold-start gateway status during recognition, wait and auto-retry once
      if (!result.success) {
        const errorMsg = result.reason || result.message || '';
        const isWarmingOrCold =
          result.errorDetails === 'MODEL_INITIALIZING' ||
          result.errorDetails === 'GATEWAY_ERROR' ||
          result.errorDetails === 'MODEL_UNAVAILABLE' ||
          errorMsg.includes('waking up') ||
          errorMsg.includes('initializing') ||
          errorMsg.includes('unavailable') ||
          errorMsg.includes('502') ||
          errorMsg.includes('503');

        if (isWarmingOrCold) {
          setStatusMessage('AI Service Warming Up...');
          const isReady = await waitForAiReady((elapsedSec) => {
            setStatusMessage(`AI Service Warming Up (${elapsedSec}s)...`);
          }, 60000, 2500);

          if (isReady) {
            setStatusMessage('Analyzing Heritage...');
            result = await recognizeMonumentFromImage(manipulated.base64);
          }
        }
      }

      if (!result.success) {
        const errorMsg = result.reason || result.message || 'AI heritage recognition service is initializing.';
        if (result.errorDetails === 'MODEL_INITIALIZING') {
          setScanErrorTitle('AI Initializing');
          setScanError('HERIXA AI model is initializing. Please tap SCAN again in a few moments.');
        } else if (result.errorDetails === 'GATEWAY_ERROR' || errorMsg.includes('gateway') || errorMsg.includes('502')) {
          setScanErrorTitle('AI Waking Up');
          setScanError('HERIXA AI service is waking up from cold start. Please tap SCAN again in 10 seconds.');
        } else if (result.errorDetails === 'REQUEST_TIMEOUT' || errorMsg.includes('Timeout') || errorMsg.includes('timeout')) {
          setScanErrorTitle('Request Timeout');
          setScanError('The scan request timed out. Please tap SCAN again.');
        } else if (
          result.errorDetails === 'MODEL_UNAVAILABLE' ||
          errorMsg.includes('unavailable') ||
          errorMsg.includes('503') ||
          errorMsg.includes('warming')
        ) {
          setScanErrorTitle('AI Service Warming Up');
          setScanError('HERIXA AI service is warming up (cloud cold start). Please try scanning again in 10 seconds.');
        } else if (result.errorDetails === 'NETWORK_UNAVAILABLE' || errorMsg.includes('Connection')) {
          setScanErrorTitle('Network Error');
          setScanError('Unable to connect to HERIXA server. Please check your internet connection and try again.');
        } else {
          setScanErrorTitle('Recognition Unsuccessful');
          setScanError(errorMsg);
        }
        return;
      }

      const confidence = result.confidence ?? 0;

      if (result.recognized && confidence >= MEDIUM_CONFIDENCE_THRESHOLD && result.monumentId) {
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
        if (result.status === 'unclear' || result.reason === 'IMAGE_QUALITY') {
          setScanErrorTitle('Image Unclear');
          setScanError('The captured image was unclear or blurry. Please hold steady and capture the monument clearly.');
        } else {
          setScanErrorTitle('Recognition Unsuccessful');
          setScanError('Unable to identify monument with high confidence. Please ensure the main temple structure is clearly visible in the frame.');
        }
      }
    } catch (error: any) {
      console.error('[AI_SCAN] Error identifying monument:', error);
      const errMsg = error.message || '';
      if (error.isNetworkError || errMsg.includes('Network') || errMsg.includes('fetch failed')) {
        setScanErrorTitle('Network Error');
        setScanError('Network Connection Error: Please check your internet connection and ensure HERIXA backend is reachable.');
      } else if (error.isTimeout || errMsg.includes('timeout') || errMsg.includes('Timeout')) {
        setScanErrorTitle('Request Timeout');
        setScanError('The scan request timed out. Please tap SCAN again.');
      } else if (errMsg.includes('MODEL_INITIALIZING')) {
        setScanErrorTitle('AI Initializing');
        setScanError('HERIXA AI model is initializing. Please tap SCAN again in a few moments.');
      } else if (errMsg.includes('502') || errMsg.includes('gateway')) {
        setScanErrorTitle('AI Waking Up');
        setScanError('HERIXA cloud AI is starting up. Please wait a moment and tap SCAN again.');
      } else if (errMsg.includes('503') || errMsg.includes('unavailable') || errMsg.includes('MODEL_UNAVAILABLE')) {
        setScanErrorTitle('AI Service Warming Up');
        setScanError('HERIXA AI service is warming up (cloud cold start). Please tap SCAN AGAIN in a few seconds.');
      } else {
        setScanErrorTitle('Recognition Unsuccessful');
        setScanError(errMsg || 'An error occurred during recognition. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) {
      setScanError('Camera initializing. Please try again.');
      return;
    }

    try {
      setStatusMessage('Analyzing Heritage...');
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo && photo.uri) {
        await processAndRecognize(photo.uri);
      } else {
        throw new Error('Failed to capture photo.');
      }
    } catch (e: any) {
      setScanError(e.message || 'Failed to capture photo.');
    }
  };

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ARViewport
        permission={permission}
        onRequestPermission={async () => { await requestPermission(); }}
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
              <Feather name="arrow-left" size={22} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>AI Heritage Scan</Text>
              <Text style={styles.headerSubtitle}>Identify a heritage monument using AI</Text>
            </View>

            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>AI Ready</Text>
            </View>
          </View>

          {/* Clean Frame Viewfinder (NO AR reticles or scanning lines) */}
          {!isAnalyzing && !scanError && (
            <View style={styles.viewfinderContainer}>
              <View style={styles.cleanFrame}>
                <Text style={styles.guidanceHint}>Point your camera at a heritage monument</Text>
              </View>
            </View>
          )}

          {/* Loading Indicator Overlay */}
          {isAnalyzing && (
            <View style={styles.overlayModal}>
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loaderTitle}>
                  {statusMessage.toLowerCase().includes('warming') ? 'AI Service Warming Up' : 'Analyzing Heritage...'}
                </Text>
                <Text style={styles.loaderText}>
                  {statusMessage.toLowerCase().includes('warming')
                    ? `${statusMessage}\nRecognition will start automatically once ready.`
                    : statusMessage}
                </Text>
              </View>
            </View>
          )}

          {/* Error Overlay */}
          {scanError && (
            <View style={styles.overlayModal}>
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={44} color={COLORS.danger} style={{ marginBottom: 12 }} />
                <Text style={styles.errorTitle}>{scanErrorTitle}</Text>
                <Text style={styles.errorDescription}>{scanError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => setScanError(null)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.retryButtonText}>SCAN AGAIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Controls Bar */}
          {!isAnalyzing && !scanError && (
            <View style={styles.controlsBar}>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={handlePickFromGallery}
                activeOpacity={0.85}
              >
                <Ionicons name="images-outline" size={22} color={COLORS.white} />
                <Text style={styles.galleryText}>Upload Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.scanActionButton}
                onPress={handleCapture}
                activeOpacity={0.85}
              >
                <Feather name="aperture" size={22} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.scanActionText}>Scan Monument</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </ARViewport>
    </View>
  );
};

const { width } = Dimensions.get('window');
const frameWidth = width * 0.82;
const frameHeight = width * 1.05;

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    ...TYPOGRAPHY.caption,
    fontSize: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  statusText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cleanFrame: {
    width: frameWidth,
    height: frameHeight,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: SPACING.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.1)',
  },
  guidanceHint: {
    color: COLORS.white,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  overlayModal: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    zIndex: 100,
  },
  loaderBox: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  loaderTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    marginTop: SPACING.md,
  },
  loaderText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    width: '100%',
  },
  errorTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  errorDescription: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    height: 46,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: COLORS.white,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
  controlsBar: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  galleryButton: {
    height: 48,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  galleryText: {
    color: COLORS.white,
    ...TYPOGRAPHY.button,
    fontWeight: '600',
  },
  scanActionButton: {
    flex: 1,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.gold,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanActionText: {
    color: COLORS.white,
    ...TYPOGRAPHY.button,
    fontWeight: '800',
  },
});

export default SmartScanScreen;
