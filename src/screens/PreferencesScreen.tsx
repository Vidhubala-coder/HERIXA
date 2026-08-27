import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavorites } from '../context/FavoritesContext';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

export const PreferencesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { activeUserId, logout } = useFavorites();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const getNotificationKey = () => {
    return `@heritage_ar_notifications_${activeUserId || 'guest'}`;
  };

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const value = await AsyncStorage.getItem(getNotificationKey());
        if (value !== null) {
          setNotificationsEnabled(value === 'true');
        } else {
          setNotificationsEnabled(true);
        }
      } catch (err) {
        console.error('Failed to load user notifications preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
  }, [activeUserId]);

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem(getNotificationKey(), value ? 'true' : 'false');
      console.log(`[HERIXA-PREFS] Notifications updated to: ${value} for User: ${activeUserId || 'guest'}`);
    } catch (err) {
      console.error('Failed to save user notifications preferences:', err);
    }
  };

  const handleClearGuestCache = () => {
    Alert.alert(
      'Clear Offline Cache',
      'Are you sure you want to delete all offline guest favorites and histories cached on this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@heritage_ar_favorites_guest');
              await AsyncStorage.removeItem('@heritage_ar_history_guest');
              Alert.alert('Success', 'Offline guest cache cleared successfully.');
            } catch (err) {
              console.error('Failed to clear guest cache:', err);
            }
          }
        }
      ]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your HERIXA account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={COLORS.gold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          
          {/* Notifications Toggle */}
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceLabelWrapper}>
              <Feather name="bell" size={18} color={COLORS.gold} />
              <Text style={styles.preferenceLabel}>Enable Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.gold }}
              thumbColor={notificationsEnabled ? COLORS.textPrimary : COLORS.textSecondary}
              disabled={isLoading}
            />
          </View>
        </View>

        {/* Display Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance & Region</Text>
          
          {/* Theme */}
          <View style={styles.staticRow}>
            <View style={styles.preferenceLabelWrapper}>
              <Feather name="eye" size={18} color={COLORS.gold} />
              <Text style={styles.preferenceLabel}>Selected Theme</Text>
            </View>
            <Text style={styles.staticValue}>Charcoal Dark</Text>
          </View>
          <Text style={styles.infoHint}>
            HERIXA is optimized for energy conservation and readability under daylight scanner conditions using a premium dark palette.
          </Text>

          {/* Language */}
          <View style={styles.staticRow}>
            <View style={styles.preferenceLabelWrapper}>
              <Feather name="globe" size={18} color={COLORS.gold} />
              <Text style={styles.preferenceLabel}>Language</Text>
            </View>
            <Text style={styles.staticValue}>English (US)</Text>
          </View>
        </View>

        {/* Local Storage management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Management</Text>
          
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearGuestCache}
            activeOpacity={0.8}
          >
            <View style={styles.preferenceLabelWrapper}>
              <Feather name="trash-2" size={18} color={COLORS.danger} />
              <Text style={[styles.preferenceLabel, { color: COLORS.danger }]}>Clear Offline Guest Cache</Text>
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Account settings */}
        {activeUserId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Options</Text>
            
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleLogoutPress}
              activeOpacity={0.8}
            >
              <View style={styles.preferenceLabelWrapper}>
                <Feather name="log-out" size={18} color={COLORS.danger} />
                <Text style={[styles.preferenceLabel, { color: COLORS.danger }]}>Log Out Session</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  staticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  preferenceLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  preferenceLabel: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  staticValue: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  infoHint: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    lineHeight: 18,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
    paddingLeft: 34,
  },
});

export default PreferencesScreen;
