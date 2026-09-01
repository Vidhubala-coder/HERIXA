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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavorites } from '../context/FavoritesContext';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { LANGUAGES } from '../config/languages';
import { textToSpeechService } from '../services/textToSpeechService';

const AUTO_NARRATE_KEY = '@heritage_ar_auto_narrate';

export const PreferencesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { activeUserId, logout, selectedLanguage, changeLanguage } = useFavorites();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Voice & Language
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [autoNarrate, setAutoNarrate] = useState(true);
  const currentLang = LANGUAGES.find(l => l.code === (selectedLanguage || 'en')) || LANGUAGES[0];

  useEffect(() => {
    AsyncStorage.getItem(AUTO_NARRATE_KEY)
      .then(v => { if (v !== null) setAutoNarrate(v === 'true'); })
      .catch(() => {});
  }, []);

  const handleAutoNarrateToggle = async (val: boolean) => {
    setAutoNarrate(val);
    try { await AsyncStorage.setItem(AUTO_NARRATE_KEY, val ? 'true' : 'false'); } catch (e) {}
  };

  const handleLangSelect = async (code: string) => {
    await textToSpeechService.stop();
    await changeLanguage(code);
    setLangModalVisible(false);
  };

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
        {/* ── Voice & Language ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VOICE & LANGUAGE</Text>

          {/* Current language display */}
          <TouchableOpacity
            style={styles.langRow}
            onPress={() => setLangModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.preferenceLabelWrapper}>
              <Feather name="globe" size={18} color={COLORS.gold} />
              <View>
                <Text style={styles.preferenceLabel}>Voice Language</Text>
                <Text style={styles.langSubValue}>
                  {currentLang.nativeName} · {currentLang.displayName}
                </Text>
              </View>
            </View>
            <View style={styles.langChevronWrap}>
              <Text style={styles.changeBtn}>Change</Text>
              <Feather name="chevron-right" size={15} color={COLORS.gold} />
            </View>
          </TouchableOpacity>

          {/* Auto-narrate toggle */}
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceLabelWrapper}>
              <Feather name="volume-2" size={18} color={COLORS.gold} />
              <View>
                <Text style={styles.preferenceLabel}>Auto-Narrate Scans</Text>
                <Text style={styles.hintText}>Speak monument info after recognition</Text>
              </View>
            </View>
            <Switch
              value={autoNarrate}
              onValueChange={handleAutoNarrateToggle}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.gold }}
              thumbColor={autoNarrate ? COLORS.textPrimary : COLORS.textSecondary}
            />
          </View>
        </View>

        {/* Language picker modal */}
        <Modal
          visible={langModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setLangModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Voice Language</Text>
                <TouchableOpacity onPress={() => setLangModalVisible(false)}>
                  <Feather name="x" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
              {LANGUAGES.map(lang => {
                const isSelected = lang.code === currentLang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOption, isSelected && styles.langOptionSelected]}
                    onPress={() => handleLangSelect(lang.code)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.langOptionText}>
                      <Text style={[styles.langNative, isSelected && { color: COLORS.gold }]}>
                        {lang.nativeName}
                      </Text>
                      <Text style={styles.langEnglish}>{lang.displayName}</Text>
                    </View>
                    {isSelected && (
                      <Feather name="check-circle" size={18} color={COLORS.gold} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>

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

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>

          <View style={styles.staticRow}>
            <View style={styles.preferenceLabelWrapper}>
              <Feather name="eye" size={18} color={COLORS.gold} />
              <Text style={styles.preferenceLabel}>Selected Theme</Text>
            </View>
            <Text style={styles.staticValue}>Charcoal Dark</Text>
          </View>
          <Text style={styles.infoHint}>
            HERIXA uses a premium dark palette optimised for heritage readability.
          </Text>
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
  // ── Language modal styles ──────────────────────────────────────────────────
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  langChevronWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeBtn: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  langSubValue: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    marginTop: 2,
  },
  hintText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 32,
    paddingHorizontal: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
  },
  langOptionSelected: {
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  langOptionText: { gap: 2 },
  langNative: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
  },
  langEnglish: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
  },
  // ─────────────────────────────────────────────────────────────────────────
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
