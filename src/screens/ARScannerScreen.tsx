import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Platform, UIManager, Image, Alert } from 'react-native';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { MONUMENTS } from '../data/monuments';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { getMonumentById, ApiMonument, recognizeMonumentFromImage, recognizeMonumentFromMultiView, ImageRecognitionResponse } from '../services/monumentService';
import { ApiError } from '../services/api';
import { useFavorites } from '../context/FavoritesContext';

// AR Module Imports
import { useARState } from '../ar/arState';
import { checkARCapability } from '../ar/arCapabilities';
import { recognizeMonument, RecognitionResult } from '../ar/monumentRecognition';
import { ARCapabilityStatus, MonumentARConfig, ARCapabilityResult } from '../ar/types';
import { ARStatusBar } from '../components/ar/ARStatusBar';
import { ARViewport } from '../components/ar/ARViewport';
import { ARScannerOverlay } from '../components/ar/ARScannerOverlay';
import { ARGuidance } from '../components/ar/ARGuidance';
import { ARBottomSheet } from '../components/ar/ARBottomSheet';
import { ARMonumentInfo } from '../components/ar/ARMonumentInfo';
import { ARNativeViewportLoader } from '../components/ar/ARNativeViewportLoader';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { getARConfig } from '../services/arService';
import { MONUMENT_AR_CONFIGS } from '../ar/arConfig';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { askVoiceAssistant } from '../services/voiceAssistantService';
import { textToSpeechService } from '../services/textToSpeechService';

type ARScannerScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'AR'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type ARScannerScreenRouteProp = RouteProp<MainTabParamList, 'AR'>;

interface ARScannerScreenProps {
  navigation: ARScannerScreenNavigationProp;
  route: ARScannerScreenRouteProp;
}

interface ScanEvidence {
  id: string;
  uri: string;
  base64?: string;
  capturedAt: number;
  viewType?: string;
}

const getFriendlyErrorMessage = (errorDetails: string | undefined, defaultMessage: string = 'Unable to confidently identify this monument. Please scan the main temple structure from a clearer angle.'): string => {
  switch (errorDetails) {
    case 'UNCERTAIN_RECOGNITION':
      return 'Unable to confidently identify this monument. Please scan the main temple structure from a clearer angle.';
    case 'INVALID_IMAGE':
      return 'The captured image is unclear or invalid. Please scan the monument from a clear angle.';
    case 'IMAGE_TOO_LARGE':
      return 'Image size exceeds the maximum limit of 5MB. Please capture a lower-resolution image.';
    case 'UNSUPPORTED_IMAGE_FORMAT':
      return 'Unsupported image format. Please use JPEG, JPG, PNG, or WEBP.';
    case 'MODEL_UNAVAILABLE':
      return 'HERIXA recognition service is temporarily unavailable. Please try again.';
    case 'NETWORK_ERROR':
      return 'Unable to connect to HERIXA server. Please check the backend connection and try again.';
    case 'RECOGNITION_FAILED':
      return 'Recognition request failed. Please try again.';
    default:
      return defaultMessage;
  }
};

type ViroState = 'scanning' | 'recognized' | 'targetLost' | 'modelLoading' | 'modelError' | 'error';

export const ARScannerScreen: React.FC<ARScannerScreenProps> = ({ navigation, route }) => {
  const monumentId = route.params?.monumentId;
  const [monument, setMonument] = useState<ApiMonument | null>(null);
  const [isMonumentLoading, setIsMonumentLoading] = useState(false);
  const [arCapability, setArCapability] = useState<ARCapabilityStatus>('initializing');
  const [arCapabilityResult, setArCapabilityResult] = useState<ARCapabilityResult | null>(null);
  const [scannerMode, setScannerMode] = useState<'ai' | 'ar'>('ai');
  const [arConfigs, setArConfigs] = useState<MonumentARConfig[]>([]);
  const [recognizedResult, setRecognizedResult] = useState<ImageRecognitionResponse | null>(null);
  const { isFavorite: checkIsFavorite, addFavorite, removeFavorite, addHistory, selectedLanguage, changeLanguage } = useFavorites();
  const safeLanguage = (selectedLanguage && ['en', 'ta', 'hi', 'te', 'ml', 'kn'].includes(selectedLanguage)
    ? selectedLanguage
    : 'en') as 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn';
  const isFavorite = monument ? checkIsFavorite(monument.id) : false;
  const [isAssistantVisible, setIsAssistantVisible] = useState(false);
  const [hasRecognizedOnce, setHasRecognizedOnce] = useState(false);
  
  // Native Viro Tracking State
  const [viroState, setViroState] = useState<ViroState>('scanning');

  // Fallback Camera Recognition States & Refs
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'single' | 'multiview'>('single');
  const [scanEvidence, setScanEvidence] = useState<ScanEvidence[]>([]);
  
  // Voice Tour Guide States
  const [isNarrating, setIsNarrating] = useState(false);
  const [narrationPaused, setNarrationPaused] = useState(false);
  const hasSpokenForMonumentIdRef = useRef<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const isScanningRef = useRef(false);
  const cooldownActiveRef = useRef(false);
  const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Initialize modular AR state management hook
  const {
    arState,
    permission,
    requestPermission,
    isPreviewMode,
    enterPreviewMode,
    cameraError,
  } = useARState();

  // Log camera permission changes and AR diagnostic information
  useEffect(() => {
    if (arCapabilityResult && permission) {
      const isViroAvailable = !!UIManager.getViewManagerConfig('ViroARSceneNavigator');
      
      console.log('[HERITAGEAR] Camera permission: ' + permission.granted);
      console.log('[HERITAGEAR] AR capability: ' + (arCapabilityResult.supported ? 'supported' : 'unsupported'));
      console.log('[HERITAGEAR] Scanner mode: ' + scannerMode.toUpperCase());
    }
  }, [arCapabilityResult, permission, scannerMode]);

  // 1. Detect device and build capability on mount, and load configs
  useEffect(() => {
    const initializeAR = async () => {
      try {
        const result = await checkARCapability();
        setArCapabilityResult(result);
        
        if (!result.supported) {
          console.log('[HERITAGEAR] AR capability: unsupported');
          console.log('[HERITAGEAR] Scanner mode: AI');
          setScannerMode('ai');
          setArCapability('unsupported');
        } else {
          console.log('[HERITAGEAR] AR capability: supported');
          console.log('[HERITAGEAR] Scanner mode: AI');
          setScannerMode('ai');
          setArCapability('nativeARAvailable');
        }

        // Load configs from arService (backend or local fallback)
        const monumentKeys = Object.keys(MONUMENT_AR_CONFIGS);
        const configsPromise = monumentKeys.map((key) => getARConfig(key));
        const loaded = await Promise.all(configsPromise);
        setArConfigs(loaded.filter((c): c is MonumentARConfig => c !== null));
      } catch (err) {
        setArCapability('error');
      }
    };
    initializeAR();
  }, []);



  // Stop speech narration on screen blur (leaving the screen) or unmount
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      handleStopSpeechNarration();
    });
    return () => {
      unsubscribe();
      handleStopSpeechNarration();
    };
  }, [navigation]);

  // Narration Control Handlers
  const handleStartSpeechNarration = async (monumentId: string, forceLanguage?: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn') => {
    try {
      const lang = forceLanguage || safeLanguage;
      setIsNarrating(true);
      setNarrationPaused(false);

      const promptQuestion = "Provide a comprehensive historical tour guide narration for this monument. Format it as a cohesive speech. Speak about the basic information, architecture and construction, historical timeline, cultural importance, present condition, and interesting facts. Maintain a professional, storytelling, heritage-tour guide tone.";
      
      const res = await askVoiceAssistant(monumentId, promptQuestion, lang, false);
      
      // Safety check: if monument was cleared while fetching, do not play
      if (!monumentRef.current) {
        setIsNarrating(false);
        return;
      }

      await textToSpeechService.speak(
        res.answer,
        lang,
        () => {
          setIsNarrating(true);
          setNarrationPaused(false);
        },
        () => {
          setIsNarrating(false);
          setNarrationPaused(false);
        },
        (err) => {
          console.warn('[Voice Tour Guide] TTS speaking failed:', err);
          setIsNarrating(false);
          setNarrationPaused(false);
        }
      );
    } catch (err) {
      console.warn('[Voice Tour Guide] Narration generation failed:', err);
      setIsNarrating(false);
      setNarrationPaused(false);
    }
  };

  const handleStopSpeechNarration = async () => {
    await textToSpeechService.stop();
    setIsNarrating(false);
    setNarrationPaused(false);
  };

  const handlePauseResumeNarration = async () => {
    const Speech = require('expo-speech');
    if (isNarrating) {
      if (narrationPaused) {
        try {
          await Speech.resume();
          setNarrationPaused(false);
        } catch (err) {
          // Fallback: restart
          if (monument) {
            await handleStartSpeechNarration(monument.id);
          }
        }
      } else {
        try {
          await Speech.pause();
          setNarrationPaused(true);
        } catch (err) {
          // Fallback: stop
          await handleStopSpeechNarration();
        }
      }
    } else {
      if (monument) {
        await handleStartSpeechNarration(monument.id);
      }
    }
  };

  const handleReplayNarration = async () => {
    if (monument) {
      await handleStartSpeechNarration(monument.id);
    }
  };

  // Keep a mutable ref of the monument to verify in async callbacks
  const monumentRef = useRef<ApiMonument | null>(null);
  useEffect(() => {
    monumentRef.current = monument;
  }, [monument]);

  // Watch monument to trigger auto-play narration (duplicate prevention check)
  useEffect(() => {
    if (monument && monument.id) {
      if (hasSpokenForMonumentIdRef.current !== monument.id) {
        hasSpokenForMonumentIdRef.current = monument.id;
        handleStartSpeechNarration(monument.id);
      }
    } else {
      hasSpokenForMonumentIdRef.current = null;
      handleStopSpeechNarration();
    }
  }, [monument]);

  // Stop narration if the assistant modal becomes visible
  useEffect(() => {
    if (isAssistantVisible) {
      handleStopSpeechNarration();
    }
  }, [isAssistantVisible]);

  // 2. Load specific monument configurations if a monumentId was passed during navigation
  useEffect(() => {
    if (monumentId) {
      const fetchMonument = async () => {
        setIsMonumentLoading(true);
        try {
          const data = await getMonumentById(monumentId);
          setMonument(data);
        } catch (err) {
          console.warn('ARScannerScreen: Failed to fetch monument details from backend. Using local static fallback.', err);
          const localFallback = MONUMENTS.find((m) => m.id === monumentId);
          if (localFallback) {
            setMonument({
              ...localFallback,
              _id: localFallback.id,
              slug: localFallback.id,
              images: [localFallback.image],
              historicalBackground: localFallback.background,
              culturalSignificance: localFallback.significance,
              preservationStatus: localFallback.preservation,
              interestingFacts: localFallback.facts,
            } as any);
          }
        } finally {
          setIsMonumentLoading(false);
        }
      };
      fetchMonument();
    } else {
      setMonument(null);
    }
  }, [monumentId]);

  // 3. Load dynamic recognized monument metadata if provider successfully matches a target
  useEffect(() => {
    if (recognizedResult?.recognized && recognizedResult?.data && !monument) {
      setMonument(recognizedResult.data);
    }
  }, [recognizedResult]);

  const handleScanAgain = () => {
    setMonument(null);
    setRecognizedResult(null);
    setAnalysisError(null);
    setViroState('scanning');
    setHasRecognizedOnce(false);
    setScanEvidence([]);
    console.log('[HERITAGEAR] Scanner reset for another scan');
  };

  const runLocalFallbackRecognition = async () => {
    console.log('[AR DEBUG] Running local fallback recognition...');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const data = await getMonumentById('brihadeeswarar');
      setMonument(data);
      setRecognizedResult({
        success: true,
        recognized: true,
        status: 'identified',
        confidence: 0.85,
        monumentName: data.name,
        data: data,
      });
      console.log('[AR DEBUG] Local fallback recognition successful: ' + data.name);
    } catch (err) {
      console.error('[AR DEBUG] Local fallback recognition failed:', err);
      setAnalysisError('Local recognition failed.');
    }
  };

  // Helper to safely get GPS coordinates if geolocation is available in the runtime
  const getGPSCoordinates = (): Promise<{ latitude: number; longitude: number } | undefined> => {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.log('[GPS DEBUG] Geolocation error or permission denied:', error);
            resolve(undefined);
          },
          { enableHighAccuracy: true, timeout: 4000, maximumAge: 10000 }
        );
      } else {
        resolve(undefined);
      }
    });
  };

  // 4. Real-time vision-based camera fallback recognition flow when ARCore is unavailable
  const runFallbackRecognition = async () => {
    if (scanMode === 'multiview') {
      await captureMultiView();
      return;
    }

    if (!permission?.granted) {
      console.log('[HERITAGEAR] Camera permission: false. Cannot run recognition.');
      setAnalysisError('Camera permission is denied.');
      return;
    }

    if (isPreviewMode) {
      console.log('[HERITAGEAR] Camera feed is bypassed. Cannot capture image.');
      setAnalysisError('Camera is bypassed in static Preview Mode.');
      return;
    }

    if (isScanningRef.current) {
      console.log('[HERITAGEAR] AI scan request skipped — scan already in progress');
      return;
    }

    if (cooldownActiveRef.current) {
      console.log('[HERITAGEAR] AI scan request skipped — cooldown active');
      setAnalysisError('Cooldown active. Please wait a moment before requesting AI identification again.');
      return;
    }

    isScanningRef.current = true;
    console.log('[HERIXA-RECOGNITION] REQUEST_STARTED RetryAttempt: 0');
    console.log('[HERITAGEAR] Scan started');
    
    setAnalysisError(null);
    setIsAnalyzing(true);

    let uiTimedOut = false;
    const scanStartTime = Date.now();

    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
    }
    recognitionTimeoutRef.current = setTimeout(() => {
      console.log('[HERITAGEAR] Recognition timed out on UI layer');
      uiTimedOut = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 120000); // 120 seconds timeout for single view

    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          base64: false,
        });

        if (!photo || !photo.uri) {
          throw new Error('Image capture failed');
        }
        console.log('[HERITAGEAR] Image captured: ' + photo.uri);

        const manipResult = await manipulateAsync(
          photo.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.8, format: SaveFormat.JPEG, base64: true }
        );

        if (!manipResult || !manipResult.base64 || manipResult.base64.length < 2000) {
          throw new Error('Image compression failed: generated empty frame or corrupt quality');
        }

        const preSizeStr = photo.width && photo.height ? `${photo.width}x${photo.height}` : 'unknown';
        const postSizeBase64 = manipResult.base64.length;
        const postSizeApproxBytes = Math.round((postSizeBase64 * 3) / 4);
        console.log(`[HERIXA-RECOGNITION] IMAGE_PREPARED PreDimensions: ${preSizeStr}, CompressedBase64Length: ${postSizeBase64} chars, ApproxSize: ${postSizeApproxBytes} bytes`);

        console.log('[RECOGNITION] Image prepared');

        console.log('[AR DEBUG] Querying GPS coordinates for context ranking...');
        const coords = await getGPSCoordinates();
        console.log('[AR DEBUG] GPS Coordinates obtained:', coords ? `${coords.latitude}, ${coords.longitude}` : 'Unavailable');

        console.log('[AR DEBUG] Starting recognition request');
        let result: ImageRecognitionResponse | null = null;
        let attempt = 0;
        const maxRetries = 2; // maximum 2 retries (total maximum attempts: 3)

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        while (attempt <= maxRetries) {
          try {
            if (controller.signal.aborted) {
              const cancelError: ApiError = new Error('Recognition request was interrupted. Please try again.');
              cancelError.isCancelled = true;
              throw cancelError;
            }

            if (attempt > 0) {
              console.log(`[HERIXA-RECOGNITION] REQUEST_STARTED RetryAttempt: ${attempt}`);
            }

            result = await recognizeMonumentFromImage(manipResult.base64, {
              signal: controller.signal,
              latitude: coords?.latitude,
              longitude: coords?.longitude,
              preferredLanguage: selectedLanguage,
            });
            if (result && !result.success) {
              const isTransient = result.errorDetails === 'NETWORK_ERROR' || result.errorDetails === 'MODEL_UNAVAILABLE';
              if (isTransient) {
                const transientError: any = new Error(result.reason || 'Transient recognition failure');
                transientError.status = result.errorDetails === 'MODEL_UNAVAILABLE' ? 503 : undefined;
                transientError.isNetworkError = result.errorDetails === 'NETWORK_ERROR';
                transientError.errorDetails = result.errorDetails;
                throw transientError;
              }
            }
            break;
          } catch (err: any) {
            const errStr = String(err.message || err || '');
            const is401 = errStr.includes('401') || errStr.toLowerCase().includes('unauthenticated') || errStr.toLowerCase().includes('authentication failed') || err.status === 401;
            const is403 = errStr.includes('403') || err.status === 403;
            const is429 = errStr.includes('429') || err.status === 429;
            const isTimeout = err.isTimeout || errStr.toLowerCase().includes('timeout') || errStr.toLowerCase().includes('taking too long') || err.status === 408;
            const isCancelled = err.isCancelled || errStr.toLowerCase().includes('cancelled') || errStr.toLowerCase().includes('canceled') || errStr.toLowerCase().includes('interrupted');
            const isModelUnavailable = err.status === 503 || err.errorDetails === 'MODEL_UNAVAILABLE' || errStr.includes('MODEL_UNAVAILABLE');

            const isTransient = (isTimeout || is429 || err.isNetworkError || (err.status >= 500 && err.status <= 599)) && !isModelUnavailable;

            if (!isTransient || isCancelled) {
              throw err;
            }

            attempt++;
            if (attempt > maxRetries) {
              throw err;
            }

            console.log(`[AR DEBUG] Retrying recognition: ${attempt}/${maxRetries}`);
            if (controller.signal.aborted) {
              throw err;
            }

            await new Promise<void>((resolve, reject) => {
              const onAbort = () => {
                clearTimeout(delayId);
                reject(err);
              };
              controller.signal.addEventListener('abort', onAbort);
              const delayId = setTimeout(() => {
                controller.signal.removeEventListener('abort', onAbort);
                resolve();
              }, 1000);
            });
          }
        }

        if (recognitionTimeoutRef.current) {
          clearTimeout(recognitionTimeoutRef.current);
          recognitionTimeoutRef.current = null;
        }

        if (isMountedRef.current) {
          console.log('[HERIXA-RECOGNITION] REQUEST_COMPLETED');
          const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
          if (result && result.success) {
            console.log('[RECOGNITION] Recognition result received');
            if (isDev) {
              console.log(
                `[HERIXA-RECOGNITION]\n` +
                `resultStatus: ${result.status || 'unknown'}\n` +
                `recognized: ${result.recognized}\n` +
                `errorDetails: ${result.errorDetails || 'absent'}\n` +
                `confidence: ${result.confidence || 0}`
              );
            }
            if (result.status === 'identified' && result.recognized && result.data) {
              console.log('[HERITAGEAR] Recognition result: ' + result.data.name);
              addHistory('recognition', result.data._id || result.data.id).catch((err) =>
                console.warn('Failed to add recognition entry to history:', err)
              );
              setMonument(result.data);
              setRecognizedResult(result);
            } else if (result.status === 'ambiguous') {
              setRecognizedResult(result);
              setAnalysisError('We need another view to identify this monument accurately.');
            } else if (result.status === 'unclear') {
              setRecognizedResult(result);
              setAnalysisError('The image is unclear. Please capture the view again.');
            } else {
              setRecognizedResult(result);
              const errorDetails = result.errorDetails || 'UNCERTAIN_RECOGNITION';
              setAnalysisError(getFriendlyErrorMessage(errorDetails, result.reason || 'Unable to confidently identify this monument. Please scan the main temple structure from a clearer angle.'));
            }
          } else {
            console.log('[HERITAGEAR] Recognition completed: not recognized');
            if (isDev) {
              console.log(
                `[HERIXA-RECOGNITION]\n` +
                `errorDetails: ${result?.errorDetails || 'RECOGNITION_FAILED'}`
              );
            }
            const errorDetails = result?.errorDetails || 'RECOGNITION_FAILED';
            setAnalysisError(getFriendlyErrorMessage(errorDetails, result?.reason || result?.message || 'Unable to confidently identify this monument. Please scan the main temple structure from a clearer angle.'));
          }
        }
      }
    } catch (err: any) {
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }

      const errStr = String(err.message || err || '');
      const isCancelled = err.isCancelled || errStr.toLowerCase().includes('cancelled') || errStr.toLowerCase().includes('canceled') || errStr.toLowerCase().includes('interrupted');
      const isTimeout = uiTimedOut || err.isTimeout || errStr.toLowerCase().includes('timeout') || errStr.toLowerCase().includes('taking too long');
      const isUnavailable = err.status === 503 || errStr.includes('503') || errStr.toLowerCase().includes('unavailable');

      if (isCancelled) {
        console.log('[AR DEBUG] Recognition cancelled by user/unmount.');
      } else if (isUnavailable) {
        console.warn('[AR DEBUG] Recognition service temporarily unavailable (503).');
      } else {
        console.error('[AR DEBUG] Recognition error:', err);
      }
      const duration = Date.now() - scanStartTime;

      if (isCancelled || isTimeout) {
        console.log(`[HERIXA-RECOGNITION] REQUEST_ABORTED Duration: ${duration}ms, IsIntentional: ${isCancelled && !uiTimedOut}, IsComponentUnmounted: ${!isMountedRef.current}`);
      } else {
        console.log(`[HERIXA-RECOGNITION] REQUEST_FAILED Duration: ${duration}ms, ErrorName: ${err.name}, Message: ${err.message}, IsComponentUnmounted: ${!isMountedRef.current}`);
      }

      if (isMountedRef.current) {
        if (isCancelled) {
          setAnalysisError('Recognition request was interrupted. Please try again.');
        } else if (isTimeout) {
          setAnalysisError('Recognition is taking longer than expected. Please try again.');
        } else if (err.status === 401 || err.status === 429 || err.status === 502 || err.status === 503 || err.status === 504) {
          setAnalysisError('HERIXA recognition service is temporarily unavailable. Please try again.');
        } else {
          setAnalysisError(err.message || 'Please check your internet connection and try again.');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsAnalyzing(false);
        isScanningRef.current = false;
        
        // Start 5-second cooldown
        cooldownActiveRef.current = true;
        setTimeout(() => {
          if (isMountedRef.current) {
            cooldownActiveRef.current = false;
          }
        }, 5000);
      }
    }
  };

  const captureMultiView = async () => {
    if (!permission?.granted) {
      setAnalysisError('Camera permission is denied.');
      return;
    }

    if (isPreviewMode) {
      setAnalysisError('Camera is bypassed in static Preview Mode.');
      return;
    }

    if (scanEvidence.length >= 5) {
      Alert.alert('Limit Reached', 'You can capture a maximum of 5 views.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          base64: false,
        });

        if (!photo || !photo.uri) {
          throw new Error('Image capture failed');
        }

        const manipResult = await manipulateAsync(
          photo.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.8, format: SaveFormat.JPEG, base64: true }
        );

        if (!manipResult || !manipResult.base64 || manipResult.base64.length < 2000) {
          throw new Error('Image compression failed');
        }

        const viewTypes = [
          'Main Entrance / Front',
          'Side Angle',
          'Distinctive Feature',
          'Sculpture / Inscription / Pillar',
          'Wider Context / Surroundings'
        ];
        const assignedViewType = viewTypes[scanEvidence.length] || 'Detail view';

        const newEvidence: ScanEvidence = {
          id: Math.random().toString(),
          uri: photo.uri,
          base64: manipResult.base64,
          capturedAt: Date.now(),
          viewType: assignedViewType,
        };

        setScanEvidence(prev => [...prev, newEvidence]);
      }
    } catch (err: any) {
      console.error('[AR DEBUG] Capture multi-view failed:', err);
      setAnalysisError(err.message || 'Failed to capture view.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runMultiViewAnalysis = async () => {
    if (scanEvidence.length < 2) {
      setAnalysisError('Please capture at least 2 views.');
      return;
    }

    isScanningRef.current = true;
    console.log('[HERIXA-RECOGNITION] REQUEST_STARTED RetryAttempt: 0');
    setAnalysisError(null);
    setIsAnalyzing(true);

    let uiTimedOut = false;
    const scanStartTime = Date.now();

    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
    }
    recognitionTimeoutRef.current = setTimeout(() => {
      console.log('[HERITAGEAR] Multi-view recognition timed out');
      uiTimedOut = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 120000); // 120 seconds timeout for multi-view

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      console.log('[AR DEBUG] Querying GPS coordinates for multi-view context ranking...');
      const coords = await getGPSCoordinates();

      const validEvidence = scanEvidence.filter(e => typeof e.base64 === 'string' && e.base64.length > 0);

      if (validEvidence.length === 0) {
        throw new Error('No valid captured images found for analysis.');
      }

      console.log('[AR DEBUG] Starting multi-view recognition call');
      let result: ImageRecognitionResponse | null = null;
      let attempt = 0;
      const maxRetries = 2; // maximum 2 retries (total maximum attempts: 3)

      while (attempt <= maxRetries) {
        try {
          if (controller.signal.aborted) {
            const cancelError: ApiError = new Error('Recognition request was interrupted. Please try again.');
            cancelError.isCancelled = true;
            throw cancelError;
          }

          if (attempt > 0) {
            console.log(`[HERIXA-RECOGNITION] REQUEST_STARTED RetryAttempt: ${attempt}`);
          }

          result = await recognizeMonumentFromMultiView(validEvidence, {
            signal: controller.signal,
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            preferredLanguage: selectedLanguage,
          });
          if (result && !result.success) {
            const isTransient = result.errorDetails === 'NETWORK_ERROR' || result.errorDetails === 'MODEL_UNAVAILABLE';
            if (isTransient) {
              const transientError: any = new Error(result.reason || 'Transient recognition failure');
              transientError.status = result.errorDetails === 'MODEL_UNAVAILABLE' ? 503 : undefined;
              transientError.isNetworkError = result.errorDetails === 'NETWORK_ERROR';
              transientError.errorDetails = result.errorDetails;
              throw transientError;
            }
          }
          break;
        } catch (err: any) {
          const errStr = String(err.message || err || '');
          const is401 = errStr.includes('401') || errStr.toLowerCase().includes('unauthenticated') || errStr.toLowerCase().includes('authentication failed') || err.status === 401;
          const is403 = errStr.includes('403') || err.status === 403;
          const is429 = errStr.includes('429') || err.status === 429;
          const isTimeout = err.isTimeout || errStr.toLowerCase().includes('timeout') || errStr.toLowerCase().includes('taking too long') || err.status === 408;
          const isCancelled = err.isCancelled || errStr.toLowerCase().includes('cancelled') || errStr.toLowerCase().includes('canceled') || errStr.toLowerCase().includes('interrupted');
          const isModelUnavailable = err.status === 503 || err.errorDetails === 'MODEL_UNAVAILABLE' || errStr.includes('MODEL_UNAVAILABLE');

          const isTransient = (isTimeout || is429 || err.isNetworkError || (err.status >= 500 && err.status <= 599)) && !isModelUnavailable;

          if (!isTransient || isCancelled) {
            throw err;
          }

          attempt++;
          if (attempt > maxRetries) {
            throw err;
          }

          console.log(`[AR DEBUG] Retrying multi-view recognition: ${attempt}/${maxRetries}`);
          if (controller.signal.aborted) {
            throw err;
          }

          await new Promise<void>((resolve, reject) => {
            const onAbort = () => {
              clearTimeout(delayId);
              reject(err);
            };
            controller.signal.addEventListener('abort', onAbort);
            const delayId = setTimeout(() => {
              controller.signal.removeEventListener('abort', onAbort);
              resolve();
            }, 1000);
          });
        }
      }

      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }

      if (isMountedRef.current) {
        console.log('[HERIXA-RECOGNITION] REQUEST_COMPLETED');
        const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
        if (result && result.success) {
          if (isDev) {
            console.log(
              `[HERIXA-RECOGNITION]\n` +
              `resultStatus: ${result.status || 'unknown'}\n` +
              `recognized: ${result.recognized}\n` +
              `errorDetails: ${result.errorDetails || 'absent'}\n` +
              `confidence: ${result.confidence || 0}`
            );
          }
          if (result.status === 'identified' && result.recognized && result.data) {
            console.log('[HERITAGEAR] Multi-view matched: ' + result.data.name);
            setMonument(result.data);
            setRecognizedResult(result);
            setScanEvidence([]); // Clear session views on success
          } else if (result.status === 'ambiguous') {
            setRecognizedResult(result);
            setAnalysisError('We need another view to identify this monument accurately.');
          } else if (result.status === 'unclear') {
            setRecognizedResult(result);
            setAnalysisError('The image is unclear. Please capture the view again.');
          } else {
            setRecognizedResult(result);
            const errorDetails = result.errorDetails || 'UNCERTAIN_RECOGNITION';
            setAnalysisError(getFriendlyErrorMessage(errorDetails, result.reason || 'Unable to confidently identify this monument. Please scan the main temple structure from a clearer angle.'));
          }
        } else {
          if (isDev) {
            console.log(
              `[HERIXA-RECOGNITION]\n` +
              `errorDetails: ${result?.errorDetails || 'RECOGNITION_FAILED'}`
            );
          }
          const errorDetails = result?.errorDetails || 'RECOGNITION_FAILED';
          setAnalysisError(getFriendlyErrorMessage(errorDetails, result?.reason || result?.message || 'Unable to confidently identify this monument. Please scan the main temple structure from a clearer angle.'));
        }
      }
    } catch (err: any) {
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
      console.error('[AR DEBUG] Multi-view recognition failed:', err);
      const errStr = String(err.message || err || '');
      const isCancelled = err.isCancelled || errStr.toLowerCase().includes('cancelled') || errStr.toLowerCase().includes('canceled') || errStr.toLowerCase().includes('interrupted');
      const isTimeout = uiTimedOut || err.isTimeout || errStr.toLowerCase().includes('timeout') || errStr.toLowerCase().includes('taking too long');
      const duration = Date.now() - scanStartTime;

      if (isCancelled || isTimeout) {
        console.log(`[HERIXA-RECOGNITION] REQUEST_ABORTED Duration: ${duration}ms, IsIntentional: ${isCancelled && !uiTimedOut}, IsComponentUnmounted: ${!isMountedRef.current}`);
      } else {
        console.log(`[HERIXA-RECOGNITION] REQUEST_FAILED Duration: ${duration}ms, ErrorName: ${err.name}, Message: ${err.message}, IsComponentUnmounted: ${!isMountedRef.current}`);
      }

      if (isMountedRef.current) {
        if (isCancelled) {
          setAnalysisError('Recognition request was interrupted. Please try again.');
        } else if (isTimeout) {
          setAnalysisError('Recognition is taking longer than expected. Please try again.');
        } else if (err.status === 401 || err.status === 429 || err.status === 502 || err.status === 503 || err.status === 504) {
          setAnalysisError('HERIXA recognition service is temporarily unavailable. Please try again.');
        } else {
          setAnalysisError(err.message || 'Please check your internet connection and try again.');
        }
      }
    } finally {
      setIsAnalyzing(false);
      isScanningRef.current = false;
    }
  };

  // Clean up params and active tasks on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      navigation.setParams({ monumentId: undefined });
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [navigation]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleExit = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleViewHistory = () => {
    if (monument) {
      navigation.navigate('FullHistory', { monumentId: monument.id });
    }
  };

  const handleFavoriteToggle = async () => {
    if (!monument) return;
    try {
      if (isFavorite) {
        await removeFavorite(monument.id);
      } else {
        await addFavorite(monument.id);
      }
    } catch (err) {
      console.warn('[SAVED HERITAGE] Failed to toggle favorite in scanner screen', err);
    }
  };

  const handleViewDetails = () => {
    if (monument) {
      navigation.navigate('MonumentDetails', { monumentId: monument.id });
    }
  };
  // Viro Real AR callback handlers
  const handleViroStateChange = (state: ViroState) => {
    setViroState(state);
    if (state === 'targetLost') {
      console.log('[AR DEBUG] Target lost');
      console.log('[AR DEBUG] Waiting for target');
      setRecognizedResult(null);
      if (!monumentId) {
        setMonument(null);
      }
    }
  };

  const handleMonumentDetected = async (targetName: string) => {
    if (hasRecognizedOnce) {
      console.log('[AR DEBUG] Target reacquired: ' + targetName);
    }
    setHasRecognizedOnce(true);

    try {
      // 1. Resolve configuration from targetName
      const config = arConfigs.find(
        (cfg) => cfg.slug === targetName || cfg.monumentId === targetName
      );
      
      if (config) {
        console.log('[AR DEBUG] Monument config found');
      } else {
        console.log('[AR DEBUG] Warning: No monument config found for target: ' + targetName);
      }
      
      // 2. Resolve MongoDB monument ID
      const resolvedMonumentId = config ? config.monumentId : targetName;
      console.log('[AR DEBUG] MongoDB monument ID: ' + resolvedMonumentId);
      
      // 3. Fetch monument database record
      const data = await getMonumentById(resolvedMonumentId);
      
      // 4. Update UI with monument data
      setMonument(data);
      
      setRecognizedResult({
        success: true,
        recognized: true,
        status: 'identified',
        confidence: 0.95,
        monumentName: data.name,
        data: data,
      });

      console.log('[AR DEBUG] Monument recognized successfully');
    } catch (err) {
      console.warn('Failed to load detected monument details:', err);
    }
  };

  // Compute scanner status text
  const getStatusText = () => {
    if (arCapability === 'initializing') return 'Checking AR capabilities';
    if (arCapability === 'unsupported') return 'AR Unsupported';
    if (arCapability === 'error') return 'Capability Error';
    if (arCapability === 'permissionDenied') return 'Camera Permission Denied';

    if (arCapability === 'nativeARAvailable' && !isPreviewMode) {
      if (viroState === 'modelLoading') return 'Loading 3D Model';
      if (viroState === 'modelError') return 'Model Load Failed';
      if (viroState === 'recognized') return 'Target Recognized';
      if (viroState === 'targetLost') return 'Target Lost';
      return 'Scanning Environment';
    }

    if (recognizedResult?.recognized) return 'Target Recognized';
    if (isPreviewMode) return 'Preview Mode Active';
    if (arState === 'initializing') return 'Initializing Camera';
    if (arState === 'error') return 'Camera Access Paused';
    return 'Scanning Environment';
  };

  const getGuidanceStatus = () => {
    if (viroState === 'modelError' || viroState === 'error') return 'error';
    if (viroState === 'modelLoading') return 'initializing';
    return 'scanning';
  };

  const isRealARActive = arCapabilityResult?.supported && scannerMode === 'ar' && !isPreviewMode && permission?.granted;
  const activeConfig = arConfigs.find((c) => c.monumentId === monument?.id);

  return (
    <View style={styles.container}>
      {/* Top Header Controls Overlay */}
      <ARStatusBar onBack={handleBack} isPreviewMode={isPreviewMode || arCapability === 'preview'} />

      {/* Mode Selector Row */}
      <View style={styles.modeContainer}>
        <TouchableOpacity
          style={[styles.modeTab, scannerMode === 'ai' && styles.activeModeTab]}
          onPress={() => {
            console.log('[HERITAGEAR] Scanner mode: AI');
            setScannerMode('ai');
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.modeTabText, scannerMode === 'ai' && styles.activeModeTabText]}>AI SCAN</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.modeTab,
            scannerMode === 'ar' && styles.activeModeTab,
            !arCapabilityResult?.supported && styles.disabledModeTab
          ]}
          onPress={() => {
            if (!arCapabilityResult?.supported) {
              console.log('[HERITAGEAR] AR Mode switch rejected: unsupported device');
              alert('AR Mode is not supported on this device. Using AI Scan instead.');
              return;
            }
            console.log('[HERITAGEAR] Scanner mode: AR');
            setScannerMode('ar');
          }}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.modeTabText, 
            scannerMode === 'ar' && styles.activeModeTabText,
            !arCapabilityResult?.supported && styles.disabledModeTabText
          ]}>AR MODE</Text>
        </TouchableOpacity>
      </View>

      {/* AR warning info banner when selected mode is unsupported */}
      {!arCapabilityResult?.supported && (
        <View style={styles.warningBanner}>
          <Feather name="info" size={14} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.warningText}>AR Mode unavailable on this device</Text>
        </View>
      )}

      {isRealARActive ? (
        <View style={styles.viewportContainer}>
          {/* Native Viro Viewport Component */}
          <ARNativeViewportLoader
            configs={arConfigs}
            currentMonumentId={monumentId}
            onStateChange={handleViroStateChange}
            onMonumentDetected={handleMonumentDetected}
          />

          {/* Instructional Guidance Overlay Banner */}
          <ARGuidance
            monumentName={monument?.name}
            status={getGuidanceStatus()}
          />

          {/* Framing brackets & scanning animation */}
          {(viroState === 'scanning' || viroState === 'targetLost') && (
            <ARScannerOverlay isScanning={true} />
          )}

          {/* Explicit "AR TEST MODEL" label if rendering placeholder model */}
          {viroState !== 'scanning' && viroState !== 'targetLost' && activeConfig?.isTestModel && (
            <View style={styles.testModelBadge}>
              <Text style={styles.testModelBadgeText}>AR TEST MODEL</Text>
            </View>
          )}

          {/* Recognized Monument Panel Details or Bottom Sheet instructions */}
          {viroState === 'recognized' && monument ? (
            <View style={styles.monumentInfoOverlay}>
              <ARMonumentInfo
                monument={monument}
                onViewDetails={handleViewDetails}
                onFavoriteToggle={handleFavoriteToggle}
                isFavorite={isFavorite}
                onAskAssistant={() => setIsAssistantVisible(true)}
                confidence={recognizedResult?.confidence}
                onScanAgain={handleScanAgain}
                detectedFeature={recognizedResult?.detectedFeature}
                detectedObjectType={recognizedResult?.detectedObjectType}
                matchedFeatures={recognizedResult?.matchedFeatures}
                onStartAR={() => setScannerMode('ar')}
                onViewGallery={() => navigation.navigate('MonumentDetails', { monumentId: monument.id })}
                isNarrating={isNarrating}
                narrationPaused={narrationPaused}
                onNarratePlayPause={handlePauseResumeNarration}
                onNarrateStop={handleStopSpeechNarration}
                onNarrateReplay={handleReplayNarration}
                selectedLanguage={safeLanguage}
                onLanguageChange={async (lang) => {
                  try {
                    await changeLanguage(lang);
                  } catch (err) {
                    console.warn('Failed to save language setting:', err);
                  }
                  if (monument) {
                    handleStartSpeechNarration(monument.id, lang);
                  }
                }}
              />
            </View>
          ) : (
            <ARBottomSheet
              statusText={getStatusText()}
              monument={monument}
              onExit={handleExit}
              onViewHistory={monument ? handleViewHistory : undefined}
              arCapability={arCapability}
            />
          )}
        </View>
      ) : (
        /* Regular Preview Viewport (CameraView for Expo Go / Fallbacks) */
        <ARViewport
          permission={permission}
          onRequestPermission={requestPermission}
          isPreviewMode={isPreviewMode}
          onEnterPreviewMode={enterPreviewMode}
          cameraRef={cameraRef}
        >
          {/* Instructional Guidance Overlay Banner */}
          <ARGuidance
            monumentName={monument?.name}
            status={isAnalyzing ? 'initializing' : arState === 'error' ? 'error' : 'scanning'}
          />

          {/* Framing brackets & scanning animation */}
          <ARScannerOverlay isScanning={isAnalyzing || (arState === 'scanning' && !recognizedResult?.recognized)} />

          {/* Floating Scan Button & Multi-View controls for AI Mode */}
          {!recognizedResult?.recognized && !isAnalyzing && !analysisError && (
            <View style={styles.actionContainer}>
              {/* Scan Mode Toggle: Single vs Multi-View */}
              {scanEvidence.length === 0 && (
                <View style={styles.modeToggleContainer}>
                  <TouchableOpacity
                    style={[styles.modeToggleBtn, scanMode === 'single' && styles.modeToggleBtnActive]}
                    onPress={() => setScanMode('single')}
                  >
                    <Text style={[styles.modeToggleBtnText, scanMode === 'single' && styles.modeToggleBtnTextActive]}>
                      Single View
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeToggleBtn, scanMode === 'multiview' && styles.modeToggleBtnActive]}
                    onPress={() => setScanMode('multiview')}
                  >
                    <Text style={[styles.modeToggleBtnText, scanMode === 'multiview' && styles.modeToggleBtnTextActive]}>
                      Multi-View
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Sequential Guidance Prompt for Multi-View */}
              {scanMode === 'multiview' && (
                <View style={styles.guidanceBubble}>
                  <Feather name="info" size={14} color={COLORS.gold} style={{ marginRight: 8 }} />
                  <Text style={styles.guidanceBubbleText}>
                    {scanEvidence.length === 0 ? 'Capture the main structure or entrance.' :
                     scanEvidence.length === 1 ? 'Capture another angle or side structure.' :
                     scanEvidence.length === 2 ? 'Capture a distinctive architectural feature.' :
                     scanEvidence.length === 3 ? 'Capture a sculpture, inscription, pillar or structural detail.' :
                     scanEvidence.length === 4 ? 'Capture a wider view for architectural context.' :
                     'All views captured. Ready to analyze.'}
                  </Text>
                </View>
              )}

              {/* Multi-View Thumbnails & Capture Status */}
              {scanMode === 'multiview' && scanEvidence.length > 0 && (
                <View style={styles.multiviewProgressContainer}>
                  <Text style={styles.progressText}>
                    Captured Views: {scanEvidence.length} / 5
                  </Text>
                  <View style={styles.thumbnailsRow}>
                    {scanEvidence.map((evidence, index) => (
                      <View key={evidence.id} style={styles.thumbnailWrapper}>
                        <Image
                          source={{ uri: evidence.base64 ? `data:image/jpeg;base64,${evidence.base64}` : evidence.uri }}
                          style={styles.thumbnailImage}
                        />
                        <TouchableOpacity
                          style={styles.removeThumbnailBtn}
                          onPress={() => {
                            setScanEvidence(prev => prev.filter(item => item.id !== evidence.id));
                          }}
                        >
                          <Feather name="x" size={10} color={COLORS.background} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {Array.from({ length: 5 - scanEvidence.length }).map((_, index) => (
                      <View key={`empty-${index}`} style={styles.emptyThumbnailSlot}>
                        <Feather name="image" size={14} color={COLORS.textSecondary} opacity={0.3} />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action Buttons Row */}
              <View style={styles.buttonsRow}>
                {scanMode === 'multiview' && scanEvidence.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => {
                      setScanEvidence([]);
                      setRecognizedResult(null);
                      setMonument(null);
                      setAnalysisError(null);
                    }}
                  >
                    <Feather name="refresh-cw" size={16} color={COLORS.gold} />
                    <Text style={styles.clearBtnText}>RESET</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.scanBtn,
                    scanMode === 'multiview' && scanEvidence.length >= 5 && { backgroundColor: COLORS.surfaceLight, opacity: 0.5 }
                  ]}
                  onPress={runFallbackRecognition}
                  disabled={scanMode === 'multiview' && scanEvidence.length >= 5}
                  activeOpacity={0.8}
                >
                  <Feather name="camera" size={18} color={COLORS.background} style={{ marginRight: 8 }} />
                  <Text style={styles.scanBtnText}>
                    {scanMode === 'single'
                      ? 'SCAN MONUMENT'
                      : `CAPTURE VIEW (${scanEvidence.length}/5)`}
                  </Text>
                </TouchableOpacity>

                {scanMode === 'multiview' && scanEvidence.length >= 2 && (
                  <TouchableOpacity
                    style={styles.analyzeBtn}
                    onPress={runMultiViewAnalysis}
                    activeOpacity={0.8}
                  >
                    <Feather name="zap" size={16} color={COLORS.background} style={{ marginRight: 6 }} />
                    <Text style={styles.analyzeBtnText}>ANALYZE VIEWS</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Real-time Loading Overlay */}
          {isAnalyzing && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.gold} />
              <Text style={styles.loadingOverlayText}>Analyzing monument...</Text>
            </View>
          )}

          {/* Error & Retry Scan Overlay */}
          {analysisError && !recognizedResult?.recognized && (
            <View style={styles.errorOverlay}>
              <Feather name="alert-circle" size={42} color={COLORS.danger} style={{ marginBottom: 12 }} />
              <Text style={styles.errorOverlayTitle}>Recognition Error</Text>
              <Text style={styles.errorOverlayText}>{analysisError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={runFallbackRecognition} activeOpacity={0.8}>
                <Text style={styles.retryBtnText}>TRY AGAIN</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recognized Monument Panel Details */}
          {recognizedResult?.recognized && monument ? (
            <View style={styles.monumentInfoOverlay}>
              <ARMonumentInfo
                monument={monument}
                onViewDetails={handleViewDetails}
                onFavoriteToggle={handleFavoriteToggle}
                isFavorite={isFavorite}
                onAskAssistant={() => setIsAssistantVisible(true)}
                confidence={recognizedResult?.confidence}
                onScanAgain={handleScanAgain}
                detectedFeature={recognizedResult?.detectedFeature}
                detectedObjectType={recognizedResult?.detectedObjectType}
                matchedFeatures={recognizedResult?.matchedFeatures}
                onStartAR={() => {
                  if (arCapabilityResult?.supported) {
                    setScannerMode('ar');
                  } else {
                    Alert.alert('AR Unsupported', 'Native AR Mode is not supported on this device.');
                  }
                }}
                onViewGallery={() => navigation.navigate('MonumentDetails', { monumentId: monument.id })}
                isNarrating={isNarrating}
                narrationPaused={narrationPaused}
                onNarratePlayPause={handlePauseResumeNarration}
                onNarrateStop={handleStopSpeechNarration}
                onNarrateReplay={handleReplayNarration}
                selectedLanguage={safeLanguage}
                onLanguageChange={async (lang) => {
                  try {
                    await changeLanguage(lang);
                  } catch (err) {
                    console.warn('Failed to save language setting:', err);
                  }
                  if (monument) {
                    handleStartSpeechNarration(monument.id, lang);
                  }
                }}
              />
            </View>
          ) : (
            /* Premium Bottom Sheet instructions panel */
            (!isAnalyzing && !analysisError) && (
              <ARBottomSheet
                statusText={getStatusText()}
                monument={monument}
                onExit={handleExit}
                onViewHistory={monument ? handleViewHistory : undefined}
                arCapability={arCapability}
              />
            )
          )}
        </ARViewport>
      )}

      {/* Voice Assistant Modal */}
      {monument && (
        <VoiceAssistant
          isVisible={isAssistantVisible}
          onClose={() => setIsAssistantVisible(false)}
          monumentId={monument.id}
          monumentName={monument.name}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  viewportContainer: {
    flex: 1,
    position: 'relative',
  },
  monumentInfoOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    zIndex: 110,
  },
  testModelBadge: {
    position: 'absolute',
    top: 200,
    alignSelf: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  testModelBadgeText: {
    color: COLORS.background,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 150,
  },
  loadingOverlayText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    marginTop: SPACING.md,
    letterSpacing: 0.5,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    zIndex: 150,
  },
  errorOverlayTitle: {
    color: COLORS.danger,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  errorOverlayText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.xl,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  retryBtnText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 130,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  activeModeTab: {
    backgroundColor: COLORS.gold,
  },
  disabledModeTab: {
    opacity: 0.5,
  },
  modeTabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    ...TYPOGRAPHY.button,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  activeModeTabText: {
    color: COLORS.background,
  },
  disabledModeTabText: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217, 83, 79, 0.2)',
    paddingVertical: 6,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(217, 83, 79, 0.3)',
    zIndex: 130,
  },
  warningText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 120,
  },
  scanBtn: {
    backgroundColor: COLORS.gold,
    flexDirection: 'row',
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  scanBtnText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.md,
    padding: 3,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  modeToggleBtnActive: {
    backgroundColor: COLORS.gold,
  },
  modeToggleBtnText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  modeToggleBtnTextActive: {
    color: COLORS.background,
    fontWeight: '700',
  },
  multiviewProgressContainer: {
    width: '100%',
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gold,
    alignItems: 'center',
  },
  progressText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    justifyContent: 'center',
    width: '100%',
    marginTop: SPACING.xs,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    overflow: 'visible',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.sm - 1.5,
  },
  removeThumbnailBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.gold,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  emptyThumbnailSlot: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  clearBtnText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  analyzeBtn: {
    backgroundColor: COLORS.gold,
    flexDirection: 'row',
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  analyzeBtnText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  guidanceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginBottom: SPACING.md,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  guidanceBubbleText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
});

export default ARScannerScreen;
