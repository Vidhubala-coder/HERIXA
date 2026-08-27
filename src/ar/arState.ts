import { useState, useEffect, useCallback } from 'react';
import { useCameraPermissions, PermissionStatus } from 'expo-camera';
import { ARState } from './types';

export const useARState = () => {
  const [arState, setArState] = useState<ARState>('idle');
  const [permission, requestPermission] = useCameraPermissions();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Synchronize state with camera permissions
  useEffect(() => {
    if (!permission) {
      setArState('initializing');
      return;
    }

    if (permission.status === PermissionStatus.UNDETERMINED) {
      setArState('idle');
    } else if (permission.status === PermissionStatus.GRANTED) {
      setArState('scanning');
    } else if (permission.status === PermissionStatus.DENIED) {
      // If permission was denied, let user choose to retry or enter Preview Mode
      if (!isPreviewMode) {
        setArState('error');
      }
    }
  }, [permission, isPreviewMode]);

  const handleRequestPermission = useCallback(async () => {
    try {
      setArState('initializing');
      const response = await requestPermission();
      if (response.granted) {
        setArState('scanning');
      } else {
        setArState('error');
      }
    } catch (err: any) {
      setCameraError(err.message || 'Permission request failed');
      setArState('error');
    }
  }, [requestPermission]);

  const enterPreviewMode = useCallback(() => {
    setIsPreviewMode(true);
    setArState('scanning');
    setCameraError(null);
  }, []);

  return {
    arState,
    setArState,
    permission,
    requestPermission: handleRequestPermission,
    isPreviewMode,
    enterPreviewMode,
    cameraError,
    setCameraError,
  };
};
