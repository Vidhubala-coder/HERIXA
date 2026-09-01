import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../../context/FavoritesContext';
import { getAdminUserDetails, fetchAuditLogsForExport } from '../../services/userService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/StatusBadge';

export const UserDetailAdminScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { userId } = route.params;
  const { authToken } = useFavorites();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!authToken) return;
      setIsLoading(true);
      try {
        const res = await getAdminUserDetails(authToken, userId);
        if (res.success) setData(res.data);
      } catch (e) { console.warn('[UserDetail] load error:', e); }
      setIsLoading(false);
    })();
  }, [userId, authToken]);

  const user = data?.user;
  const activities = data?.activities || [];

  if (isLoading) {
    return (
      <AdminLayout activeRoute="Users" title="User Detail">
        <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.gold} /></View>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout activeRoute="Users" title="User Detail">
        <View style={styles.loader}><Text style={styles.errText}>User not found.</Text></View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeRoute="Users" title={user.name}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={16} color={COLORS.gold} />
          <Text style={styles.backText}>Users</Text>
        </TouchableOpacity>

        {/* User Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user.name || '?')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge status={user.isEmailVerified ? 'verified' : 'pending'} dot />
            <StatusBadge status={user.role === 'admin' ? 'admin' : 'user'} />
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailCard}>
          <InfoRow label="User ID" value={user._id} mono />
          <InfoRow label="Role" value={user.role} />
          <InfoRow label="Account Status" value={user.accountStatus || 'ACTIVE'} />
          <InfoRow label="Total Scans" value={`${data?.totalScans ?? user.totalScans ?? user.scanCount ?? 0}`} />
          <InfoRow label="Email Verified" value={user.isEmailVerified ? 'Yes' : 'No'} />
          <InfoRow label="Joined" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'} />
          <InfoRow label="Last Active" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'} />
        </View>

        {/* SCAN ACTIVITY Card */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>SCAN ACTIVITY</Text>
        </View>
        <View style={styles.detailCard}>
          <InfoRow label="Authoritative Total Scans" value={`${data?.totalScans ?? user.totalScans ?? user.scanCount ?? 0}`} />
          {data?.scans && data.scans.length > 0 ? (
            data.scans.slice(0, 5).map((scan: any, sIdx: number) => (
              <View key={scan._id || sIdx} style={infoStyles.row}>
                <Text style={infoStyles.value}>{scan.monumentId?.name || scan.query || 'Recognized Monument'}</Text>
                <Text style={infoStyles.label}>{new Date(scan.createdAt).toLocaleString()} • Identified</Text>
              </View>
            ))
          ) : (
            <View style={{ paddingVertical: SPACING.sm }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>No scan activity recorded yet.</Text>
            </View>
          )}
        </View>

        {/* Clean USER ACTIVITY Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>USER ACTIVITY</Text>
        </View>

        {(!data?.userActivity || data.userActivity.length === 0) ? (
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyText}>No activity recorded yet.</Text>
          </View>
        ) : (
          data.userActivity.map((act: any, i: number) => {
            const isIdentified = act.status === 'identified' || act.status === 'verified';
            const isUncertain = act.status === 'uncertain';
            const dotColor = isIdentified ? '#5FA87A' : isUncertain ? '#D45A5B' : COLORS.gold;

            return (
              <View key={act.id || i} style={styles.actRow}>
                <View style={[styles.actDot, { backgroundColor: dotColor }]} />
                <View style={styles.actContent}>
                  <Text style={styles.actEvent}>{act.title}</Text>
                  <Text style={styles.actDetails}>{act.details}</Text>
                  <Text style={styles.actDate}>
                    {act.timestamp ? new Date(act.timestamp).toLocaleString() : '—'}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </AdminLayout>
  );
};

const InfoRow = ({ label, value, mono }: { label: string; value?: string; mono?: boolean }) => (
  <View style={infoStyles.row}>
    <Text style={infoStyles.label}>{label}</Text>
    <Text style={[infoStyles.value, mono && infoStyles.mono]}>{value || '—'}</Text>
  </View>
);
const infoStyles = StyleSheet.create({
  row: { paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  value: { color: COLORS.textPrimary, fontSize: 14 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: COLORS.textSecondary },
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errText: { color: COLORS.textSecondary, fontSize: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: COLORS.gold, fontSize: 14, fontWeight: '600' },
  profileCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg,
    alignItems: 'center', gap: SPACING.xs,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(212,175,55,0.15)', borderWidth: 1, borderColor: COLORS.gold,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.gold, fontSize: 26, fontWeight: '700' },
  userName: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 4 },
  userEmail: { color: COLORS.textSecondary, fontSize: 13 },
  badgeRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: 4 },
  detailCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  exportUserBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.gold },
  exportUserBtnText: { color: COLORS.gold, fontSize: 12, fontWeight: '600' },
  lifecycleCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.md,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineContent: { flex: 1 },
  timelineTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  timelineDate: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(95,168,122,0.1)', padding: SPACING.xs, borderRadius: BORDER_RADIUS.sm,
  },
  statusBannerText: { color: '#5FA87A', fontSize: 12, fontWeight: '600' },
  actRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm,
  },
  actDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gold },
  actContent: { flex: 1 },
  actEvent: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  actDetails: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  actDate: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  emptyActivity: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center',
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 13 },
});
