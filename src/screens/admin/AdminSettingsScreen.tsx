import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';

type SettingSection = 'general' | 'ai' | 'security' | 'notifications' | 'about';

const SETTINGS_KEY = '@herixa_admin_settings_config';

export const AdminSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { logout } = useFavorites();
  const [activeSection, setActiveSection] = useState<SettingSection>('general');
  const [isSaving, setIsSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    publicRegistration: true,
    emailVerificationRequired: true,
    aiEnabled: true,
    autoRetrain: false,
    fallbackTo3D: true,
    enforceStrongPasswords: true,
    sessionTimeout: true,
    systemAlerts: true,
    weeklyDigest: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        if (stored) {
          setSettings(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('[AdminSettings] Load error:', e);
      }
    })();
  }, []);

  const updateSetting = async (key: keyof typeof settings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[AdminSettings] Save error:', e);
    } finally {
      setTimeout(() => setIsSaving(false), 300);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of the admin portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Profile' } }] });
        }
      },
    ]);
  };

  const SECTIONS: { key: SettingSection; icon: keyof typeof Feather.glyphMap; label: string }[] = [
    { key: 'general', icon: 'settings', label: 'General' },
    { key: 'ai', icon: 'cpu', label: 'AI & Recognition' },
    { key: 'security', icon: 'shield', label: 'Security' },
    { key: 'notifications', icon: 'bell', label: 'Notifications' },
    { key: 'about', icon: 'info', label: 'About' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconChip}>
                <Feather name="settings" size={16} color={COLORS.gold} />
              </View>
              <Text style={styles.cardTitle}>General Platform Settings</Text>
            </View>
            <SettingToggle
              label="Maintenance Mode"
              sub="Temporarily restrict non-admin access for platform maintenance."
              value={settings.maintenanceMode}
              onChange={(v) => updateSetting('maintenanceMode', v)}
            />
            <SettingToggle
              label="Public Registration"
              sub="Allow new users to register accounts."
              value={settings.publicRegistration}
              onChange={(v) => updateSetting('publicRegistration', v)}
            />
            <SettingToggle
              label="Require Email Verification"
              sub="Mandate OTP/Email verification before full account activation."
              value={settings.emailVerificationRequired}
              onChange={(v) => updateSetting('emailVerificationRequired', v)}
            />
          </View>
        );
      case 'ai':
        return (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconChip}>
                <Feather name="cpu" size={16} color={COLORS.gold} />
              </View>
              <Text style={styles.cardTitle}>AI Recognition Configuration</Text>
            </View>
            <SettingToggle
              label="Enable AI Service"
              sub="Active FastAPI ONNX monument recognition pipeline."
              value={settings.aiEnabled}
              onChange={(v) => updateSetting('aiEnabled', v)}
            />
            <SettingToggle
              label="Automatic Retrain Notifications"
              sub="Receive alerts when new image datasets are pending fine-tuning."
              value={settings.autoRetrain}
              onChange={(v) => updateSetting('autoRetrain', v)}
            />
            <SettingToggle
              label="3D Model Visual Integration"
              sub="Render interactive 3D monument previews on successful scans."
              value={settings.fallbackTo3D}
              onChange={(v) => updateSetting('fallbackTo3D', v)}
            />
          </View>
        );
      case 'security':
        return (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconChip}>
                <Feather name="shield" size={16} color={COLORS.gold} />
              </View>
              <Text style={styles.cardTitle}>Security & Access Policy</Text>
            </View>
            <SettingToggle
              label="Enforce Strong Passwords"
              sub="Require 8+ chars with digits & symbols for all user registrations."
              value={settings.enforceStrongPasswords}
              onChange={(v) => updateSetting('enforceStrongPasswords', v)}
            />
            <SettingToggle
              label="Admin Session Auto-Timeout"
              sub="Automatically invalidate inactive JWT admin sessions after 24h."
              value={settings.sessionTimeout}
              onChange={(v) => updateSetting('sessionTimeout', v)}
            />
          </View>
        );
      case 'notifications':
        return (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconChip}>
                <Feather name="bell" size={16} color={COLORS.gold} />
              </View>
              <Text style={styles.cardTitle}>System Alerts & Digest</Text>
            </View>
            <SettingToggle
              label="System Health Alerts"
              sub="Receive notifications on service downtime or backend errors."
              value={settings.systemAlerts}
              onChange={(v) => updateSetting('systemAlerts', v)}
            />
            <SettingToggle
              label="Weekly Analytics Summary"
              sub="Generate automated weekly analytics logs."
              value={settings.weeklyDigest}
              onChange={(v) => updateSetting('weeklyDigest', v)}
            />
          </View>
        );
      case 'about':
        return (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconChip}>
                <Feather name="info" size={16} color={COLORS.gold} />
              </View>
              <Text style={styles.cardTitle}>About HERIXA Platform</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform Name</Text>
              <Text style={styles.infoVal}>HERIXA Heritage Intelligence</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>AI Model Version</Text>
              <Text style={styles.infoVal}>Phase 3L EfficientNet-B0 (0.65 Threshold)</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Backend Service</Text>
              <Text style={styles.infoVal}>Node.js Express + FastAPI ONNX</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Database</Text>
              <Text style={styles.infoVal}>MongoDB 7.0 (heritage_ar)</Text>
            </View>
          </View>
        );
    }
  };

  return (
    <AdminLayout navigation={navigation} activeSection="settings" title="Settings">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Navigation Tabs Pill Bar */}
        <View style={styles.tabsScrollWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsList}>
            {SECTIONS.map((sec) => {
              const isActive = activeSection === sec.key;
              return (
                <TouchableOpacity
                  key={sec.key}
                  style={[styles.tabPill, isActive && styles.tabPillActive]}
                  onPress={() => setActiveSection(sec.key)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={sec.icon}
                    size={14}
                    color={isActive ? COLORS.gold : COLORS.textSecondary}
                  />
                  <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
                    {sec.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Setting Section Content */}
        {renderContent()}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Feather name="log-out" size={16} color={COLORS.danger} />
          <Text style={styles.logoutBtnText}>Log Out from Admin Portal</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </AdminLayout>
  );
};

const SettingToggle = ({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <View style={styles.toggleRow}>
    <View style={styles.toggleTextCol}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={styles.toggleSub}>{sub}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(212, 175, 55, 0.4)' }}
      thumbColor={value ? COLORS.gold : '#A0A09C'}
    />
  </View>
);

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },
  tabsScrollWrap: { height: 40 },
  tabsList: { gap: SPACING.xs, paddingRight: SPACING.md },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabPillActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  tabPillText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  tabPillTextActive: { color: COLORS.gold, fontWeight: '700' },
  sectionCard: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  toggleTextCol: { flex: 1, paddingRight: SPACING.md },
  toggleLabel: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  toggleSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, lineHeight: 15 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },
  infoVal: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(212, 90, 91, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 90, 91, 0.25)',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12,
    marginTop: SPACING.xs,
  },
  logoutBtnText: { color: COLORS.danger, fontSize: 13, fontWeight: '700' },
});
