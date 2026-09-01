import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';

type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

interface SplashScreenProps {
  navigation: SplashScreenNavigationProp;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Start fade-in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate based on role after 2.8s
    const timer = setTimeout(async () => {
      try {
        const storedRole = await AsyncStorage.getItem('user_role');
        const storedId = await AsyncStorage.getItem('active_user_id');
        const storedToken = await AsyncStorage.getItem('auth_token');

        // Only redirect to admin if we have a full valid session
        if (storedRole === 'admin' && storedId && storedToken) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'AdminPortal' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main', params: { screen: 'Home' } }],
          });
        }
      } catch {
        // Fallback on any storage error
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main', params: { screen: 'Home' } }],
        });
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* App Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoRing}>
            <Feather name="aperture" size={48} color={COLORS.gold} />
          </View>
        </View>

        {/* Brand Name */}
        <Text style={styles.brandTitle}>ARCHAEOLOGICAL PORTAL</Text>
        <Text style={styles.appName}>HERIXA</Text>
        
        {/* Divider */}
        <View style={styles.divider} />

        {/* Tagline */}
        <Text style={styles.tagline}>Preserve the Past. Experience the Heritage.</Text>
      </Animated.View>

      {/* Loading Indicator */}
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={COLORS.gold} style={styles.loader} />
        <Text style={styles.loadingText}>Initializing Heritage Portal...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: SPACING.xl,
  },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  brandTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    letterSpacing: 6,
    marginBottom: SPACING.xs,
  },
  appName: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h1,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: SPACING.lg,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.bronze,
    marginVertical: SPACING.md,
    borderRadius: 1,
  },
  tagline: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: SPACING.lg,
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loader: {
    marginBottom: SPACING.xs,
  },
  loadingText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
});
