import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, PermissionResponse, PermissionStatus } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';

interface ARViewportProps {
  permission: PermissionResponse | null;
  onRequestPermission: () => Promise<void>;
  isPreviewMode: boolean;
  onEnterPreviewMode: () => void;
  children?: React.ReactNode;
  cameraRef?: React.RefObject<any>;
}

export const ARViewport: React.FC<ARViewportProps> = ({
  permission,
  onRequestPermission,
  isPreviewMode,
  onEnterPreviewMode,
  children,
  cameraRef,
}) => {
  // 1. Permission status loading
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Initializing camera interface...</Text>
      </View>
    );
  }

  // 2. Live Camera Viewport (rendered when permission is granted)
  if (permission.granted) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <View style={styles.overlayContainer}>
          {children}
        </View>
      </View>
    );
  }

  // 3. Fallback Static Preview Mode (only if they explicitly chose it and we don't have permission)
  if (isPreviewMode) {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.darkFeed}>
          <Feather name="camera-off" size={48} color={COLORS.border} style={styles.cameraOffIcon} />
          <Text style={styles.previewModeText}>CAMERA FEED BYPASSED</Text>
          <Text style={styles.previewModeSubText}>Running in static Preview Mode</Text>
        </View>
        <View style={styles.overlayContainer}>
          {children}
        </View>
      </View>
    );
  }

  // 4. Permission Denied Screen
  if (permission.status === PermissionStatus.DENIED) {
    return (
      <View style={styles.permissionContainer}>
        <Feather name="camera-off" size={54} color={COLORS.danger} style={styles.cameraIcon} />
        <Text style={styles.permissionTitle}>Camera Permission Denied</Text>
        <Text style={styles.permissionDescription}>
          Please allow camera access from Android Settings to use the scanner.
        </Text>
        
        <TouchableOpacity style={styles.primaryButton} onPress={onRequestPermission} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>TRY AGAIN</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onEnterPreviewMode} activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>CONTINUE IN PREVIEW MODE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 5. First Open / Permission Undetermined Screen
  return (
    <View style={styles.permissionContainer}>
      <Feather name="camera" size={54} color={COLORS.gold} style={styles.cameraIcon} />
      <Text style={styles.permissionTitle}>Camera Access Required</Text>
      <Text style={styles.permissionDescription}>
        HERIXA needs camera access to use the AR scanner.
      </Text>
      
      <TouchableOpacity style={styles.primaryButton} onPress={onRequestPermission} activeOpacity={0.8}>
        <Text style={styles.primaryButtonText}>ALLOW CAMERA ACCESS</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onEnterPreviewMode} activeOpacity={0.8}>
        <Text style={styles.secondaryButtonText}>CONTINUE IN PREVIEW MODE</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    marginTop: SPACING.md,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    ...StyleSheet.absoluteFill,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  darkFeed: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOffIcon: {
    marginBottom: SPACING.md,
    opacity: 0.5,
  },
  previewModeText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    letterSpacing: 1,
  },
  previewModeSubText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    marginTop: 4,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  cameraIcon: {
    marginBottom: SPACING.xl,
  },
  permissionTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  permissionDescription: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl * 1.5,
  },
  primaryButton: {
    backgroundColor: COLORS.gold,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  primaryButtonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
});

export default ARViewport;
