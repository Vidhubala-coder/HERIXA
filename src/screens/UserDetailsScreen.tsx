import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../context/FavoritesContext';
import { getAdminUserDetails } from '../services/userService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

export const UserDetailsScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { userId } = route.params;
  const { authToken } = useFavorites();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserDetails = async () => {
    if (!authToken || !userId) return;
    try {
      setIsLoading(true);
      const res = await getAdminUserDetails(authToken, userId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        Alert.alert('Error', 'Failed to retrieve user details.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred fetching user details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [authToken, userId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Fetching User Profile Details...</Text>
      </SafeAreaView>
    );
  }

  const user = data?.user;
  const activities = data?.activities || [];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventName = (event: string) => {
    switch (event) {
      case 'ACCOUNT_CREATED': return 'Account Created';
      case 'EMAIL_VERIFIED': return 'Email Verified';
      case 'LOGIN': return 'User Login';
      case 'PASSWORD_RESET': return 'Password Reset';
      case 'ACCOUNT_DELETED': return 'Account Deleted';
      default: return event;
    }
  };

  const getEventColor = (event: string) => {
    switch (event) {
      case 'ACCOUNT_CREATED': return '#3498db';
      case 'EMAIL_VERIFIED': return '#2ebd8a';
      case 'LOGIN': return '#f1c40f';
      case 'PASSWORD_RESET': return '#e67e22';
      case 'ACCOUNT_DELETED': return '#e74c3c';
      default: return COLORS.gold;
    }
  };

  const getEventIcon = (event: string): keyof typeof Feather.glyphMap => {
    switch (event) {
      case 'ACCOUNT_CREATED': return 'user-plus';
      case 'EMAIL_VERIFIED': return 'check-circle';
      case 'LOGIN': return 'log-in';
      case 'PASSWORD_RESET': return 'key';
      case 'ACCOUNT_DELETED': return 'trash-2';
      default: return 'info';
    }
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
        <Text style={styles.headerTitle}>User Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, user?.role === 'admin' ? styles.roleAdmin : styles.roleUser]}>
              <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
            </View>
            {user?.isEmailVerified ? (
              <View style={[styles.verifBadge, styles.verifVerified]}>
                <Feather name="check" size={10} color="#2ebd8a" style={{ marginRight: 2 }} />
                <Text style={styles.verifTextVerified}>Verified</Text>
              </View>
            ) : (
              <View style={[styles.verifBadge, styles.verifPending]}>
                <Feather name="clock" size={10} color="#bd962e" style={{ marginRight: 2 }} />
                <Text style={styles.verifTextPending}>Unverified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{user?.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email Address</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Scans Performed</Text>
            <Text style={[styles.infoValue, { color: COLORS.gold, fontWeight: '700' }]}>
              {data?.totalScans ?? user?.totalScans ?? user?.scanCount ?? 0}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Registration Date</Text>
            <Text style={styles.infoValue}>{formatDate(user?.createdAt)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Active Activity</Text>
            <Text style={styles.infoValue}>{formatDate(user?.lastLoginAt || user?.updatedAt)}</Text>
          </View>
        </View>

        {/* USER ACTIVITY Section */}
        <Text style={[styles.sectionTitle, { marginLeft: SPACING.xs, marginTop: SPACING.lg }]}>USER ACTIVITY</Text>
        
        <View style={styles.timelineContainer}>
          {(data?.userActivity && data.userActivity.length > 0) ? (
            data.userActivity.map((act: any, index: number) => {
              const isIdentified = act.status === 'identified' || act.status === 'verified';
              const isUncertain = act.status === 'uncertain';
              const iconName: keyof typeof Feather.glyphMap = act.type === 'scan' ? 'aperture' : 'activity';
              const nodeColor = isIdentified ? '#5FA87A' : isUncertain ? '#D45A5B' : COLORS.gold;

              return (
                <View key={act.id || index} style={styles.timelineRow}>
                  {/* Visual Line */}
                  <View style={styles.timelineLeftColumn}>
                    <View style={[styles.timelineNode, { backgroundColor: nodeColor }]}>
                      <Feather name={iconName} size={11} color="#000" />
                    </View>
                    {index < data.userActivity.length - 1 && <View style={styles.timelineLine} />}
                  </View>

                  {/* Event Details */}
                  <View style={styles.timelineRightColumn}>
                    <Text style={styles.activityEventName}>{act.title}</Text>
                    <Text style={styles.activityTime}>{formatDate(act.timestamp)}</Text>
                    <Text style={styles.activityActor}>{act.details}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyTimelineText}>No activity recorded yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { color: COLORS.gold, ...TYPOGRAPHY.bodyMedium, marginTop: SPACING.md },
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
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 2,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarLargeText: { color: COLORS.gold, fontSize: 32, fontWeight: '800' },
  profileName: { color: COLORS.textPrimary, ...TYPOGRAPHY.h3, fontWeight: '700' },
  profileEmail: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm },
  roleUser: { backgroundColor: COLORS.border },
  roleAdmin: { backgroundColor: '#4d3b1b' },
  roleText: { color: COLORS.textPrimary, fontSize: 10, fontWeight: '800' },
  verifBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, borderWidth: 1 },
  verifVerified: { backgroundColor: '#14332b', borderColor: '#1b4d3e' },
  verifPending: { backgroundColor: '#332914', borderColor: '#4d3a1b' },
  verifTextVerified: { color: '#2ebd8a', fontSize: 10, fontWeight: '800' },
  verifTextPending: { color: '#bd962e', fontSize: 10, fontWeight: '800' },
  section: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: { color: COLORS.gold, ...TYPOGRAPHY.caption, fontWeight: '700', letterSpacing: 1, marginBottom: SPACING.md },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall },
  infoValue: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodySmall, fontWeight: '600' },
  timelineContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
  },
  timelineRow: { flexDirection: 'row', minHeight: 64 },
  timelineLeftColumn: { alignItems: 'center', marginRight: SPACING.md },
  timelineNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
  timelineRightColumn: { flex: 1, paddingBottom: SPACING.md },
  activityEventName: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, fontWeight: '700' },
  activityTime: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, fontSize: 11, marginTop: 2 },
  activityActor: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, fontSize: 10, marginTop: 1, opacity: 0.8 },
  emptyTimelineText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium, textAlign: 'center', marginVertical: SPACING.md },
});

export default UserDetailsScreen;
