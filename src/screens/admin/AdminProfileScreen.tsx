import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  RefreshControl,
  Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavorites } from '../../context/FavoritesContext';
import {
  getUserProfile,
  getAdminProfileData,
  updateAdminProfileData,
  uploadAdminAvatarData,
  changePassword,
  getAdminActivityLogs,
} from '../../services/userService';
import { getImageUrl } from '../../services/monumentService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { HerixaSymbol } from '../../components/HerixaLogo';

const PREFS_STORAGE_KEY = '@herixa_admin_preferences';

export const AdminProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken, activeUserId, logout, setUserProfile, refreshUserProfile } = useFavorites();

  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Password Change State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Activity Log State
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Admin Preferences State (stored in AsyncStorage)
  const [preferences, setPreferences] = useState({
    systemAlerts: true,
    aiNotifications: true,
    activityDigest: false,
  });

  const loadProfile = async () => {
    if (!authToken) return;
    try {
      const res = await getAdminProfileData(authToken);
      if (res.success && res.data) {
        setProfile(res.data);
        setUserProfile(res.data);
        setEditName(res.data.name || '');
        setEditEmail(res.data.email || '');
        if (activeUserId) {
          const storageKey = `@heritage_ar_profile_${activeUserId}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(res.data)).catch(() => {});
        }
      } else if (activeUserId) {
        const p = await getUserProfile(activeUserId, authToken);
        setProfile(p);
        if (p) {
          setUserProfile(p);
          setEditName(p.name || '');
          setEditEmail(p.email || '');
          const storageKey = `@heritage_ar_profile_${activeUserId}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(p)).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[AdminProfile] load error:', e);
    }
  };

  const loadActivities = async () => {
    if (!authToken) return;
    try {
      setIsLoadingActivities(true);
      const res = await getAdminActivityLogs(authToken, 1, 4);
      if (res && res.success && res.data) {
        const logs = Array.isArray(res.data) ? res.data : res.data.logs || [];
        setRecentActivities(logs);
      }
    } catch (e) {
      console.warn('[AdminProfile] load activities error:', e);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('[AdminProfile] load preferences error:', e);
    }
  };

  const togglePreference = async (key: keyof typeof preferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    try {
      await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[AdminProfile] save preferences error:', e);
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([loadProfile(), loadActivities(), loadPreferences()]);
      setIsLoading(false);
    })();
  }, [authToken, activeUserId]);

  const handlePickAndUploadAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll permissions are required to choose a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        if (!selectedUri || typeof selectedUri !== 'string') {
          Alert.alert('Upload Error', 'Selected image URI is invalid.');
          return;
        }

        if (!authToken) return;

        setIsUploadingAvatar(true);
        const uploadRes = await uploadAdminAvatarData(selectedUri, authToken, activeUserId || undefined);
        if (uploadRes && uploadRes.success && uploadRes.data) {
          setProfile(uploadRes.data);
          setUserProfile(uploadRes.data);
          if (activeUserId) {
            const storageKey = `@heritage_ar_profile_${activeUserId}`;
            await AsyncStorage.setItem(storageKey, JSON.stringify(uploadRes.data)).catch(() => {});
          }
          await refreshUserProfile();
          Alert.alert('Success', 'Admin avatar updated successfully.');
        } else {
          Alert.alert('Upload Error', uploadRes.message || 'Failed to update avatar.');
        }
      }
    } catch (err: any) {
      console.error('[AVATAR-UPLOAD] Error:', err);
      Alert.alert('Error', err.message || 'Failed to upload profile image.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert('Validation Error', 'Full Name and Email are required.');
      return;
    }

    if (!authToken) return;

    try {
      setIsSaving(true);
      const res = await updateAdminProfileData(authToken, {
        name: editName.trim(),
        email: editEmail.trim(),
      });

      if (res.success && res.data) {
        setProfile(res.data);
        setUserProfile(res.data);
        if (activeUserId) {
          const storageKey = `@heritage_ar_profile_${activeUserId}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(res.data)).catch(() => {});
        }
        await refreshUserProfile();
        setIsEditing(false);
        Alert.alert('Profile Saved', 'Your admin profile information has been updated.');
      } else {
        Alert.alert('Update Failed', res.message || 'Could not update profile.');
      }
    } catch (err: any) {
      Alert.alert('Update Error', err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePasswordSubmit = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Validation Error', 'Current password is required.');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    if (!authToken) return;

    try {
      setIsChangingPassword(true);
      const res = await changePassword(currentPassword, newPassword, confirmPassword, authToken);
      if (res.success) {
        Alert.alert('Success', 'Your password has been changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
      } else {
        Alert.alert('Password Error', res.message || 'Failed to change password.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred while updating password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout Confirmation', 'Are you sure you want to log out of the Admin Portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          if (navigation && navigation.reset) {
            navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Profile' } }] });
          } else if (navigation && navigation.navigate) {
            navigation.navigate('Main', { screen: 'Profile' });
          }
        },
      },
    ]);
  };

  const avatarPath = profile?.avatar || profile?.profileImageUrl;
  const avatarUrl = avatarPath ? getImageUrl(avatarPath) : null;

  return (
    <AdminLayout navigation={navigation} activeSection="profile" title="Admin Profile">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => Promise.all([loadProfile(), loadActivities()])}
            tintColor={COLORS.primary}
          />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: SPACING.xxl }} />
        ) : (
          <>
            {/* Header Hero Card */}
            <View style={styles.profileHeaderCard}>
              <View style={styles.headerTopRow}>
                <View style={styles.avatarSection}>
                  <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={handlePickAndUploadAvatar}
                    disabled={isUploadingAvatar}
                    activeOpacity={0.8}
                  >
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>{(profile?.name || 'A')[0].toUpperCase()}</Text>
                      </View>
                    )}
                    {isUploadingAvatar ? (
                      <View style={styles.avatarOverlay}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      </View>
                    ) : (
                      <View style={styles.cameraBadge}>
                        <Feather name="camera" size={12} color={COLORS.white} />
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.identityCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.profileName}>{profile?.name || 'Administrator'}</Text>
                    </View>
                    <Text style={styles.profileEmail}>{profile?.email || 'admin@herixa.gov.in'}</Text>
                    <View style={styles.badgeRow}>
                      <StatusBadge status="admin" label="HERITAGE CONSERVATOR" dot />
                      <StatusBadge status="verified" label="ACTIVE & VERIFIED" dot />
                    </View>
                  </View>
                </View>
                <View style={styles.symbolWrap}>
                  <HerixaSymbol size={36} />
                </View>
              </View>
            </View>

            {/* Admin Information Card */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconChip}>
                  <Feather name="user" size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.cardTitle}>Profile Information</Text>
                {!isEditing && (
                  <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)} activeOpacity={0.7}>
                    <Feather name="edit-2" size={13} color={COLORS.primary} />
                    <Text style={styles.editBtnText}>Edit Profile</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                <View style={styles.formContainer}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Enter full name"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Email Address</Text>
                    <TextInput
                      style={styles.input}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="Enter email address"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>

                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => {
                        setIsEditing(false);
                        setEditName(profile?.name || '');
                        setEditEmail(profile?.email || '');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSaveProfile}
                      disabled={isSaving}
                      activeOpacity={0.8}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.infoList}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Role</Text>
                    <Text style={styles.infoVal}>System Administrator & Conservator</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Account Status</Text>
                    <Text style={[styles.infoVal, { color: '#059669' }]}>Active & Verified</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Registered Date</Text>
                    <Text style={styles.infoVal}>
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Last Active Login</Text>
                    <Text style={styles.infoVal}>
                      {profile?.lastLoginAt
                        ? new Date(profile.lastLoginAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                        : 'Active Session'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Security & Authentication Section */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconChip}>
                  <Feather name="shield" size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.cardTitle}>Security & Credentials</Text>
                <TouchableOpacity
                  style={styles.actionBtnOutline}
                  onPress={() => setShowPasswordForm(!showPasswordForm)}
                  activeOpacity={0.7}
                >
                  <Feather name={showPasswordForm ? 'chevron-up' : 'lock'} size={13} color={COLORS.primary} />
                  <Text style={styles.actionBtnOutlineText}>
                    {showPasswordForm ? 'Close Form' : 'Change Password'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showPasswordForm ? (
                <View style={styles.formContainer}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Current Password</Text>
                    <TextInput
                      style={styles.input}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry
                      placeholder="Enter current password"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      placeholder="At least 6 characters"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Confirm New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      placeholder="Re-enter new password"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>

                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => {
                        setShowPasswordForm(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleChangePasswordSubmit}
                      disabled={isChangingPassword}
                      activeOpacity={0.8}
                    >
                      {isChangingPassword ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <Text style={styles.saveBtnText}>Update Password</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.infoList}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Authentication Token</Text>
                    <Text style={[styles.infoVal, { color: '#059669' }]}>Valid JWT Bearer Session</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Access Control Level</Text>
                    <Text style={styles.infoVal}>Full Admin Permissions (`requireAdmin` Guard)</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Admin Preferences Section */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconChip}>
                  <Feather name="sliders" size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.cardTitle}>Admin Preferences</Text>
              </View>

              <View style={styles.prefList}>
                <View style={styles.prefRow}>
                  <View style={styles.prefTextCol}>
                    <Text style={styles.prefTitle}>System Security Alerts</Text>
                    <Text style={styles.prefDesc}>Receive instant notifications for high-priority security events</Text>
                  </View>
                  <Switch
                    value={preferences.systemAlerts}
                    onValueChange={() => togglePreference('systemAlerts')}
                    trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                    thumbColor={COLORS.white}
                  />
                </View>

                <View style={styles.prefRow}>
                  <View style={styles.prefTextCol}>
                    <Text style={styles.prefTitle}>AI Recognition Activity</Text>
                    <Text style={styles.prefDesc}>Notify when high confidence monument recognitions occur</Text>
                  </View>
                  <Switch
                    value={preferences.aiNotifications}
                    onValueChange={() => togglePreference('aiNotifications')}
                    trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                    thumbColor={COLORS.white}
                  />
                </View>

                <View style={styles.prefRow}>
                  <View style={styles.prefTextCol}>
                    <Text style={styles.prefTitle}>Activity Digest Email</Text>
                    <Text style={styles.prefDesc}>Receive daily summary reports of audit log activities</Text>
                  </View>
                  <Switch
                    value={preferences.activityDigest}
                    onValueChange={() => togglePreference('activityDigest')}
                    trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                    thumbColor={COLORS.white}
                  />
                </View>
              </View>
            </View>

            {/* Recent Audit Activity Section */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconChip}>
                  <Feather name="activity" size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.cardTitle}>Recent Admin Activity</Text>
              </View>

              {isLoadingActivities ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.md }} />
              ) : recentActivities.length > 0 ? (
                <View style={styles.activityList}>
                  {recentActivities.map((log: any, idx: number) => (
                    <View key={log._id || idx} style={styles.activityItem}>
                      <View style={styles.activityDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activityTitle}>{log.event || log.action || 'Admin Action'}</Text>
                        <Text style={styles.activityMeta}>
                          {log.details || log.description || 'System Log Event'} •{' '}
                          {log.timestamp ? new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyActivityBox}>
                  <Text style={styles.emptyActivityText}>No recent audit log entries available.</Text>
                </View>
              )}
            </View>

            {/* Logout Action Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Feather name="log-out" size={16} color="#DC2626" />
              <Text style={styles.logoutBtnText}>Logout of Admin Account</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },

  profileHeaderCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  avatarContainer: { position: 'relative' },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(30, 58, 138, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { color: COLORS.primary, fontSize: 30, fontWeight: '800' },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  identityCol: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { color: COLORS.textPrimary, fontSize: 19, fontWeight: '800' },
  profileEmail: { color: COLORS.textSecondary, fontSize: 13 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: 4 },
  symbolWrap: { paddingLeft: SPACING.xs },

  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.md,
    gap: SPACING.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  editBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(30, 58, 138, 0.06)',
  },
  actionBtnOutlineText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

  infoList: { gap: 0 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  infoVal: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },

  formContainer: { gap: SPACING.md, marginTop: SPACING.xs },
  fieldGroup: { gap: 6 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: '#F9F8F3',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.xs },
  cancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  saveBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },

  prefList: { gap: SPACING.sm },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  prefTextCol: { flex: 1, paddingRight: SPACING.md },
  prefTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  prefDesc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },

  activityList: { gap: SPACING.sm },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  activityTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  activityMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },

  emptyActivityBox: { paddingVertical: SPACING.md, alignItems: 'center' },
  emptyActivityText: { color: COLORS.textSecondary, fontSize: 13 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14,
    marginTop: SPACING.sm,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
