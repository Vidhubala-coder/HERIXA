import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import { COLORS } from '../constants/theme';
import { RootStackParamList, MainTabParamList } from './types';
import { AdminPortalNavigator } from './AdminPortalNavigator';
import { useFavorites } from '../context/FavoritesContext';

// Screens
import { SplashScreen } from '../screens/SplashScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MonumentDetailsScreen } from '../screens/MonumentDetailsScreen';
import { FullHistoryScreen } from '../screens/FullHistoryScreen';
import { PreferencesScreen } from '../screens/PreferencesScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { PrivacyAndLegalScreen } from '../screens/PrivacyAndLegalScreen';
import { TermsAndConditionsScreen } from '../screens/TermsAndConditionsScreen';
import { PrivacyPreferencesScreen } from '../screens/PrivacyPreferencesScreen';
import { DeleteAccountScreen } from '../screens/DeleteAccountScreen';
import { UserManagementScreen } from '../screens/UserManagementScreen';
import { UserDetailsScreen } from '../screens/UserDetailsScreen';
import { AdminActivityScreen } from '../screens/AdminActivityScreen';
import { UserHistoryScreen } from '../screens/UserHistoryScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { HeritageAssistantScreen } from '../screens/HeritageAssistantScreen';
import { SmartScanScreen } from '../screens/SmartScanScreen';
import { RecognitionResultScreen } from '../screens/RecognitionResultScreen';
import { HeritageVisualsScreen } from '../screens/HeritageVisualsScreen';
import { HeritageMapScreen } from '../screens/HeritageMapScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ['herixa://'],
  config: {
    screens: {
      Splash: 'splash',
      Main: {
        screens: {
          Home: 'home',
          Explore: 'explore',
          SmartScan: 'smart-scan',
          HeritageMap: 'map',
          Profile: 'profile',
        },
      },
      ResetPassword: 'reset-password',
    },
  },
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Explore') {
            iconName = 'compass';
          } else if (route.name === 'HeritageMap') {
            iconName = 'map-pin';
          } else if (route.name === 'Profile') {
            iconName = 'user';
          }

          return <Feather name={iconName} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen
        name="SmartScan"
        component={SmartScanScreen}
        options={{
          tabBarLabel: 'SCAN',
          tabBarButton: (props) => {
            const { delayLongPress, ...restProps } = props as any;
            return (
              <TouchableOpacity
                {...restProps}
                style={styles.centerScanButtonWrapper}
                activeOpacity={0.85}
              >
                <View style={styles.centerScanButton}>
                  <Feather name="camera" size={24} color={COLORS.background} />
                </View>
                <Text style={styles.centerScanLabel}>SCAN</Text>
              </TouchableOpacity>
            );
          },
        }}
      />
      <Tab.Screen
        name="HeritageMap"
        component={HeritageMapScreen}
        options={{ tabBarLabel: 'Map' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const navigationRef = createNavigationContainerRef<any>();

let pendingResetToken: string | null = null;
let isNavReady = false;

const parseDeepLinkUrl = (urlStr: string) => {
  console.log('[HERIXA-DEEP-LINK] Initial URL received');
  
  let isResetPasswordRoute = false;
  let token: string | null = null;
  let scheme = 'none';
  let path = 'none';
  
  try {
    const tokenMatch = urlStr.match(/[?&]token=([^&]+)/);
    if (tokenMatch) {
      token = tokenMatch[1];
    }
    
    const schemeMatch = urlStr.match(/^([^:]+):\/\/(.*)$/);
    if (schemeMatch) {
      scheme = schemeMatch[1];
      const rest = schemeMatch[2];
      
      const queryIndex = rest.indexOf('?');
      const pathAndHost = queryIndex !== -1 ? rest.substring(0, queryIndex) : rest;
      path = pathAndHost;
      
      if (path === 'reset-password' || path === '/reset-password' || urlStr.includes('reset-password')) {
        isResetPasswordRoute = true;
      }
    }
  } catch (e) {
    console.warn('[HERIXA-DEEP-LINK] Parsing error:', e);
  }
  
  return { isResetPasswordRoute, token };
};

const handleDeepLinkUrl = (url: string | null) => {
  if (!url) return;
  
  const { isResetPasswordRoute, token } = parseDeepLinkUrl(url);
  
  if (isResetPasswordRoute && token) {
    const isReady = isNavReady && navigationRef.isReady();
    if (isReady) {
      navigationRef.navigate('ResetPassword', { token });
    } else {
      pendingResetToken = token;
    }
  }
};

export const AppNavigator = () => {
  const { activeUserId, userRole } = useFavorites();
  const prevUserIdRef = useRef<string | null>(undefined as any);
  const prevUserRoleRef = useRef<string | null>(undefined as any);

  useEffect(() => {
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== activeUserId) {
      console.log(`[HERIXA-AUTH] ACTIVE_USER_CHANGED: ${prevUserIdRef.current || 'guest'} -> ${activeUserId || 'guest'}`);
      console.log('[HERIXA-NAV] AUTH_NAVIGATION_RESET');
    }
    if (prevUserRoleRef.current !== undefined && prevUserRoleRef.current !== userRole) {
      console.log(`[HERIXA-AUTH] ACTIVE_ROLE_CHANGED: ${prevUserRoleRef.current || 'none'} -> ${userRole || 'none'}`);
    }
    if (userRole === 'admin') {
      console.log('[HERIXA-NAV] ADMIN_NAVIGATION_CREATED');
    } else {
      console.log('[HERIXA-NAV] USER_NAVIGATION_CREATED');
    }
    prevUserIdRef.current = activeUserId;
    prevUserRoleRef.current = userRole;
  }, [activeUserId, userRole]);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLinkUrl(url);
      }
    }).catch((err) => {
      console.warn('[HERIXA-DEEP-LINK] Error getting initial URL:', err);
    });

    const handleUrlEvent = ({ url }: { url: string }) => {
      handleDeepLinkUrl(url);
    };

    const subscription = Linking.addEventListener('url', handleUrlEvent);

    return () => {
      subscription.remove();
      isNavReady = false;
    };
  }, []);

  const handleReady = () => {
    isNavReady = true;
    if (pendingResetToken && navigationRef.isReady()) {
      navigationRef.navigate('ResetPassword', { token: pendingResetToken });
      pendingResetToken = null;
    }
  };

  const navKey = `${activeUserId || 'guest'}-${userRole || 'user'}`;

  return (
    <NavigationContainer key={navKey} ref={navigationRef} linking={linking as any} onReady={handleReady}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
        
        {/* Dedicated Redesigned Admin Portal */}
        <Stack.Screen
          name="AdminPortal"
          component={AdminPortalNavigator}
          options={{ animation: 'fade' }}
        />
        
        {/* Legacy AdminUpload route mapped to Redesigned AdminPortalNavigator */}
        <Stack.Screen
          name="AdminUpload"
          component={AdminPortalNavigator}
          options={{ animation: 'fade' }}
        />

        <Stack.Screen
          name="MonumentDetails"
          component={MonumentDetailsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="FullHistory"
          component={FullHistoryScreen}
          options={{
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="Preferences"
          component={PreferencesScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="About"
          component={AboutScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="PrivacyAndLegal"
          component={PrivacyAndLegalScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="TermsAndConditions"
          component={TermsAndConditionsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="PrivacyPreferences"
          component={PrivacyPreferencesScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="DeleteAccount"
          component={DeleteAccountScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="UserManagement"
          component={UserManagementScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="UserDetails"
          component={UserDetailsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="AdminActivity"
          component={AdminActivityScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="UserHistory"
          component={UserHistoryScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="HeritageAssistant"
          component={HeritageAssistantScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="RecognitionResult"
          component={RecognitionResultScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="HeritageVisuals"
          component={HeritageVisualsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  centerScanButtonWrapper: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerScanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  centerScanLabel: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
});
