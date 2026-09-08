import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';

interface HerixaLogoProps {
  size?: number;
  showText?: boolean;
  style?: ViewStyle;
}

export const HerixaSymbol: React.FC<{ size?: number }> = ({ size = 34 }) => {
  return (
    <View style={[styles.symbolContainer, { width: size, height: size, borderRadius: BORDER_RADIUS.md }]}>
      <Image
        source={require('../../assets/icon.png')}
        style={{ width: size, height: size, borderRadius: BORDER_RADIUS.md }}
        resizeMode="contain"
      />
    </View>
  );
};

export const HerixaLogo: React.FC<HerixaLogoProps> = ({
  size = 36,
  showText = true,
  style,
}) => {
  return (
    <View style={[styles.logoRow, style]}>
      <HerixaSymbol size={size} />
      {showText && (
        <View style={styles.textContainer}>
          <Text style={styles.logoTitle}>HERIXA</Text>
          <Text style={styles.logoSubtitle}>Discover Heritage. Experience History.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  symbolContainer: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  outerEmblem: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillarLeft: {
    position: 'absolute',
    left: 2,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: COLORS.gold,
    opacity: 0.5,
    borderRadius: 1,
  },
  pillarRight: {
    position: 'absolute',
    right: 2,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: COLORS.gold,
    opacity: 0.5,
    borderRadius: 1,
  },
  accentGoldDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: COLORS.gold,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  textContainer: {
    justifyContent: 'center',
  },
  logoTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    letterSpacing: 1.5,
    lineHeight: 20,
  },
  logoSubtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default HerixaLogo;
