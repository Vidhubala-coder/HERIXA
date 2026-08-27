import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../constants/theme';

interface ARScannerOverlayProps {
  isScanning?: boolean;
}

export const ARScannerOverlay: React.FC<ARScannerOverlayProps> = ({ isScanning = true }) => {
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const bracketPulseAnim = useRef(new Animated.Value(1)).current;

  // Horizontal scanline loop
  useEffect(() => {
    if (!isScanning) return;
    const scanAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    scanAnimation.start();
    return () => scanAnimation.stop();
  }, [scanLineAnim, isScanning]);

  // Brackets pulsing loop
  useEffect(() => {
    if (!isScanning) return;
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bracketPulseAnim, {
          toValue: 1.03,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(bracketPulseAnim, {
          toValue: 0.97,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [bracketPulseAnim, isScanning]);

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 252], // Height of scanning frame (260 - line height)
  });

  return (
    <View style={styles.viewport}>
      {/* Camera Grid Lines */}
      <View style={styles.gridContainer}>
        <View style={styles.gridRow} />
        <View style={styles.gridRow} />
        <View style={[styles.gridColumn, { left: '33.3%' }]} />
        <View style={[styles.gridColumn, { left: '66.6%' }]} />
      </View>

      {/* Center Scanner Frame */}
      <Animated.View
        style={[
          styles.scannerFrame,
          { transform: [{ scale: bracketPulseAnim }] }
        ]}
      >
        {/* Frame Corners */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />

        {/* Laser Scanning Line */}
        {isScanning && (
          <Animated.View style={[styles.scanningLine, { transform: [{ translateY }] }]} />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  viewport: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.08,
  },
  gridRow: {
    height: '33.3%',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textPrimary,
  },
  gridColumn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: COLORS.textPrimary,
  },
  scannerFrame: {
    width: 260,
    height: 260,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
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
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanningLine: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: 3,
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
});
