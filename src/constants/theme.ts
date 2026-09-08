export const COLORS = {
  background: '#FFFFFF',          // Clean white primary background
  backgroundAlt: '#FAFAFA',       // Light off-white
  surface: '#FFFFFF',             // Card background
  surfaceLight: '#F8F9FA',        // Light section background
  surfaceIvory: '#F9F8F3',        // Soft Ivory secondary background
  primary: '#1E3A8A',             // Deep Royal Blue (Primary Brand Action)
  primaryDark: '#0F2C59',         // Darker Navy Royal Blue
  primaryLight: '#EFF6FF',        // Soft blue tint
  gold: '#C59B27',                // Antique Gold (Heritage highlight)
  goldMuted: '#D4AF37',           // Muted Gold
  goldLight: '#FEF9C3',           // Soft Gold tint
  bronze: '#8C6D31',              // Bronze / Deep Gold accent
  terracotta: '#C85A32',          // Warm Terracotta (Secondary accent)
  terracottaLight: '#FFF7ED',     // Soft Terracotta tint
  textPrimary: '#0F172A',         // Dark Navy / Charcoal for headings
  textSecondary: '#64748B',       // Muted Slate for secondary text
  textMuted: '#94A3B8',           // Subtle slate text
  border: '#E2E8F0',              // Subtle clean border
  borderLight: '#F1F5F9',         // Light divider line
  borderWarm: '#E8E3D9',          // Warm ivory border
  danger: '#EF4444',              // Crisp warning red
  success: '#15803D',             // Deep heritage green
  overlay: 'rgba(15, 23, 42, 0.45)',
  scannerOverlay: 'rgba(15, 23, 42, 0.65)',
  white: '#FFFFFF',
  ivory: '#F9F8F3',
  shadowColor: '#0F172A',
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

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const CARD_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
};

export const SHADOWS = {
  sm: CARD_SHADOW,
  md: CARD_SHADOW,
  lg: CARD_SHADOW,
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
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
};

