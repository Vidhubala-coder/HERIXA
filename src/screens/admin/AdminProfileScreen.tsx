import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Image, RefreshControl
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavorites } from '../../context/FavoritesContext';
import { getUserProfile, getAdminProfileData, updateAdminProfileData, uploadAdminAvatarData } from '../../services/userService';
import { getImageUrl } from '../../services/monumentService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/StatusBadge';

export const AdminProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken, activeUserId, logout, setUserProfile, refreshUserProfile } = useFavorites();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const loadProfile = async () => {
    if (!authToken) return;
    try {
      const res = await getAdminProfileData(authToken);
      if (res.success && res.data) {
        setProfile(res.data);
        setUserProfile(res.data);
        setEditName(res.data.name || '');
        setEditEmail(res.data.email || '');
      } else if (activeUserId) {
        const p = await getUserProfile(activeUserId, authToken);
        setProfile(p);
        if (p) {
          setUserProfile(p);
          setEditName(p.name || '');
          setEditEmail(p.email || '');
        }
      }
    } catch (e) {
      console.warn('[AdminProfile] load error:', e);
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadProfile();
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
        const asset = result.assets[0];
        const selectedUri = asset.uri;

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
          Alert.alert('Success', 'Admin profile avatar updated successfully.');
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

  const handleSave = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert('Validation', 'Name and Email are required.');
      return;
    }

    if (!authToken) return;

    try {
      setIsSaving(true);
      const res = await updateAdminProfileData(authToken, { name: editName.trim(), email: editEmail.trim() });
      if (res.success && res.data) {
        setProfile(res.data);
        setUserProfile(res.data);
        if (activeUserId) {
          const storageKey = `@heritage_ar_profile_${activeUserId}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(res.data)).catch(() => {});
        }
        await refreshUserProfile();
        setIsEditing(false);
        Alert.alert('Profile Updated', 'Your admin profile information has been saved.');
      }
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to log out of the Admin Portal?',
      [
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
          }
        }
      ]
    );
  };

  const avatarUrl = profile?.avatar ? getImageUrl(profile.avatar) : null;

  return (
    <AdminLayout navigation={navigation} activeSection="profile" title="Admin Profile">
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadProfile}
            tintColor={COLORS.gold}
          />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.gold} style={{ marginVertical: SPACING.xxl }} />
        ) : (
          <>
            {/* Header Card */}
            <View style={styles.profileHeaderCard}>
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
                      <ActivityIndicator size="small" color={COLORS.gold} />
                    </View>
                  ) : (
                    <View style={styles.cameraBadge}>
                      <Feather name="camera" size={12} color="#141412" />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.identityCol}>
                  <Text style={styles.profileName}>{profile?.name || 'Administrator'}</Text>
                  <Text style={styles.profileEmail}>{profile?.email || 'admin@herixa.gov.in'}</Text>
                  <View style={styles.badgeRow}>
                    <StatusBadge status="verified" label="SYSTEM ADMIN" dot />
                    <StatusBadge status="active" label="FULL ACCESS" dot />
                  </View>
                </View>
              </View>
            </View>

            {/* Account Details Card */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconChip}>
                  <Feather name="user" size={16} color={COLORS.gold} />
                </View>
                <Text style={styles.cardTitle}>Admin Information</Text>
                {!isEditing && (
                  <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)} activeOpacity={0.7}>
                    <Feather name="edit-2" size={13} color={COLORS.gold} />
                    <Text style={styles.editBtnText}>Edit</Text>
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
                      onPress={handleSave}
                      disabled={isSaving}
                      activeOpacity={0.8}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#141412" />
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
                    <Text style={styles.infoVal}>System Administrator</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Account Status</Text>
                    <Text style={[styles.infoVal, { color: '#5FA87A' }]}>Active & Verified</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Registered On</Text>
                    <Text style={styles.infoVal}>
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Last Login</Text>
                    <Text style={styles.infoVal}>
                      {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Active Session'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Logout Action Button */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Feather name="log-out" size={16} color="#E74C3C" />
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
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
  },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: COLORS.gold },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 2, borderColor: 'rgba(212, 175, 55, 0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { color: COLORS.gold, fontSize: 28, fontWeight: '800' },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute', right: 0, bottom: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.gold,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#181816',
  },
  identityCol: { flex: 1, gap: 4 },
  profileName: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  profileEmail: { color: COLORS.textSecondary, fontSize: 12 },
  badgeRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: 4 },

  sectionCard: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
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
  cardTitle: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },

  infoList: { gap: 2 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },
  infoVal: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },

  formContainer: { gap: SPACING.md },
  fieldGroup: { gap: 6 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: 13,
  },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.xs },
  cancelBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  saveBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gold,
  },
  saveBtnText: { color: '#141412', fontSize: 12, fontWeight: '800' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14,
    marginTop: SPACING.sm,
  },
  logoutBtnText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '700',
  },
});
