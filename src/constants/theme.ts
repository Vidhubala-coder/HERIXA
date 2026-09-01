export const COLORS = {
  background: '#121212',       // Deep charcoal
  surface: '#1E1E1E',          // Stone Dark (cards, lists)
  surfaceLight: '#2A2A2A',     // Lighter stone (inputs, highlights)
  gold: '#D4AF37',             // Warm Antique Gold
  goldMuted: '#C5A059',        // Muted Gold
  bronze: '#8C6D31',           // Deep Gold/Bronze (for borders/details)
  textPrimary: '#FDFBF7',      // Ivory / Off-white (readable)
  textSecondary: '#A19E95',    // Muted Stone (descriptions, captions)
  border: '#2E2D2A',           // Dark bronze border
  borderLight: '#3A3935',      // Lighter border
  danger: '#9E2A2B',           // Deep brick red (e.g. for delete/remove)
  success: '#3F6C51',          // Heritage green
  overlay: 'rgba(0, 0, 0, 0.65)',
  scannerOverlay: 'rgba(18, 18, 18, 0.7)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  xxl: 30,
  full: 999,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
};
