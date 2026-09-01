import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../../context/FavoritesContext';
import { getAdminUsers, getAdminStats, deleteUserAdmin } from '../../services/userService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { KpiCard } from '../../components/admin/KpiCard';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';

export const UsersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken } = useFavorites();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async (pg = 1, q = search) => {
    if (!authToken) return;
    try {
      const [usersRes, statsRes] = await Promise.all([
        getAdminUsers(authToken, pg, 20, q || undefined),
        pg === 1 ? getAdminStats(authToken) : Promise.resolve(null),
      ]);
      if (pg === 1) {
        setUsers(usersRes.data || []);
        if (statsRes?.success) setStats(statsRes.data);
      } else {
        setUsers(prev => [...prev, ...(usersRes.data || [])]);
      }
      setTotalPages(usersRes.pagination?.pages ?? 1);
      setPage(pg);
    } catch (e) { console.warn('[Users] load error:', e); }
  }, [authToken, search]);

  useEffect(() => {
    (async () => { setIsLoading(true); await loadData(1); setIsLoading(false); })();
  }, []);

  const handleSearch = () => { setIsLoading(true); loadData(1, search).then(() => setIsLoading(false)); };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !authToken) return;
    try {
      setIsDeleting(true);
      await deleteUserAdmin(deleteTarget._id, authToken);
      setUsers(prev => prev.map(u => u._id === deleteTarget._id ? { ...u, accountStatus: 'DELETED' } : u));
      setDeleteTarget(null);
      Alert.alert('Deleted', `Account for ${deleteTarget.email} has been deactivated.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete user account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderUser = ({ item }: { item: any }) => {
    const isDeleted = item.accountStatus === 'DELETED';

    return (
      <View style={styles.userCard}>
        <View style={styles.userCardHeader}>
          <View style={[styles.avatar, isDeleted && styles.avatarDeleted]}>
            <Text style={styles.avatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
            <Text style={styles.userDate}>
              Registered {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
              {item.lastLoginAt ? ` • Last login ${new Date(item.lastLoginAt).toLocaleDateString()}` : ''}
            </Text>
          </View>
          <StatusBadge status={isDeleted ? 'draft' : item.isEmailVerified ? 'verified' : 'pending'} label={isDeleted ? 'DELETED' : undefined} />
        </View>

        {/* User Card Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AdminUserDetail', { userId: item._id })}
            activeOpacity={0.7}
          >
            <Feather name="eye" size={13} color={COLORS.gold} />
            <Text style={styles.actionBtnText}>View Details</Text>
          </TouchableOpacity>

          {!isDeleted && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={() => setDeleteTarget(item)}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={13} color="#D45A5B" />
              <Text style={[styles.actionBtnText, { color: '#D45A5B' }]}>Delete Account</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <AdminLayout navigation={navigation} activeSection="users" title="Users">
      <View style={styles.container}>
        {/* KPI Header */}
        <View style={styles.kpiRow}>
          <KpiCard icon="users" label="Total Users" value={stats?.totalUsers ?? '—'} accentColor={COLORS.gold} />
          <KpiCard icon="check-circle" label="Active Users" value={stats?.verifiedUsers ?? '—'} accentColor="#5FA87A" />
          <KpiCard icon="user-plus" label="New (7d)" value={stats?.newUsers ?? '—'} accentColor="#C5A059" />
          <KpiCard icon="user-x" label="Deleted" value={stats?.deletedAccounts ?? 0} accentColor="#D45A5B" />
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadData(1, ''); }}>
              <Feather name="x" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.gold} /></View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={item => item._id}
            renderItem={renderUser}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={async () => { setIsRefreshing(true); await loadData(1); setIsRefreshing(false); }} tintColor={COLORS.gold} />}
            ListEmptyComponent={<AdminEmptyState icon="users" title="No Users Found" message="No users match your search." />}
            onEndReached={() => { if (page < totalPages) loadData(page + 1); }}
            onEndReachedThreshold={0.3}
          />
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          visible={!!deleteTarget}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteTarget(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Feather name="alert-triangle" size={32} color="#D45A5B" style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={styles.modalTitle}>Delete User Account?</Text>
              <Text style={styles.modalSub}>{deleteTarget?.email}</Text>
              <Text style={styles.modalBody}>
                Are you sure you want to delete {deleteTarget?.name}? This action will revoke account access and record an audit log event.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnDanger]}
                  onPress={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalBtnDangerText}>Delete User</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  kpiRow: { flexDirection: 'row', gap: SPACING.xs, padding: SPACING.md, paddingBottom: 0 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: SPACING.md,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, height: 44, color: COLORS.textPrimary, fontSize: 14 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: SPACING.md, gap: SPACING.sm },
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarDeleted: {
    backgroundColor: 'rgba(212,90,91,0.12)',
    borderColor: 'rgba(212,90,91,0.3)',
  },
  avatarText: { color: COLORS.gold, fontSize: 16, fontWeight: '700' },
  userInfo: { flex: 1, gap: 2 },
  userName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  userEmail: { color: COLORS.textSecondary, fontSize: 12 },
  userDate: { color: COLORS.textSecondary, fontSize: 11 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLight,
  },
  actionBtnDanger: {
    borderColor: 'rgba(212,90,91,0.3)',
    backgroundColor: 'rgba(212,90,91,0.08)',
  },
  actionBtnText: { color: COLORS.gold, fontSize: 11, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  modalSub: { color: COLORS.gold, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  modalBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, textAlign: 'center', marginVertical: SPACING.md },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  modalBtn: { flex: 1, height: 44, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  modalBtnCancel: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceLight },
  modalBtnCancelText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  modalBtnDanger: { backgroundColor: '#D45A5B' },
  modalBtnDangerText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
