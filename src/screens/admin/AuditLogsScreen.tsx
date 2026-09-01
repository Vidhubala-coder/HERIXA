import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../../context/FavoritesContext';
import {
  fetchAuditLogsForExport,
  getAdminUsers,
  getAdminUserDetails,
} from '../../services/userService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';

const EVENT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  LOGIN: 'log-in',
  ACCOUNT_CREATED: 'user-plus',
  ACCOUNT_DELETED: 'user-x',
  HERITAGE_VISUAL_ADDED: 'image',
  HERITAGE_VISUAL_DELETED: 'trash-2',
  SCAN_PERFORMED: 'compass',
  RECOGNITION: 'compass',
  DEFAULT: 'activity',
};

const EVENT_COLORS: Record<string, string> = {
  LOGIN: '#5B9BD5',
  ACCOUNT_CREATED: '#5FA87A',
  ACCOUNT_DELETED: '#D45A5B',
  HERITAGE_VISUAL_ADDED: '#9B8FD4',
  HERITAGE_VISUAL_DELETED: '#D45A5B',
  SCAN_PERFORMED: COLORS.gold,
  RECOGNITION: COLORS.gold,
  DEFAULT: COLORS.gold,
};

export const AuditLogsScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation }) => {
  const { authToken } = useFavorites();

  // State
  const [users, setUsers] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userActivities, setUserActivities] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'users' | 'timeline'>('users');

  const [isLoading, setIsLoading] = useState(true);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial load: fetch users & all audit logs
  const loadMainData = useCallback(async () => {
    if (!authToken) return;
    try {
      const [usersRes, logsRes] = await Promise.all([
        getAdminUsers(authToken, 1, 100).catch(() => ({ success: false, data: [] })),
        fetchAuditLogsForExport(authToken).catch(() => ({ success: false, data: [] })),
      ]);

      const fetchedUsers = Array.isArray(usersRes?.data) ? usersRes.data : [];
      const fetchedLogs = Array.isArray(logsRes?.data) ? logsRes.data : [];

      setUsers(fetchedUsers);
      setAllLogs(fetchedLogs);
    } catch (err) {
      console.warn('[AuditLogs] Load error:', err);
    }
  }, [authToken]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadMainData();
      setIsLoading(false);
    })();
  }, [loadMainData]);

  // Load specific user details & activities
  const loadUserDetail = async (userObj: any) => {
    if (!authToken || !userObj) return;
    setSelectedUser(userObj);
    setIsUserLoading(true);
    try {
      const userId = userObj._id || userObj.id;
      const res = await getAdminUserDetails(authToken, userId).catch(() => null);
      if (res && res.success && res.data) {
        const rawActivities = (res.data as any).userActivity || res.data.activities || [];
        // Filter out generic authentication noise from user detail activity timeline
        const meaningfulActivities = rawActivities.filter((act: any) => {
          const title = (act.title || act.event || act.action || '').toUpperCase();
          return !title.includes('LOGIN') && !title.includes('LOGOUT') && !title.includes('ACCOUNT_DELETED');
        });
        setUserActivities(meaningfulActivities.length > 0 ? meaningfulActivities : rawActivities);
      } else {
        // Fallback filter from allLogs for selected user only
        const filtered = allLogs.filter(
          log =>
            (log.userId && (log.userId._id === userId || log.userId === userId)) ||
            (log.actorId && log.actorId === userId) ||
            (log.userEmail && log.userEmail === userObj.email)
        ).filter(act => {
          const ev = (act.event || act.action || '').toUpperCase();
          return !ev.includes('LOGIN') && !ev.includes('LOGOUT');
        });
        setUserActivities(filtered);
      }
    } catch (err) {
      console.warn('[AuditLogs] User detail load error:', err);
    } finally {
      setIsUserLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (selectedUser) {
      await loadUserDetail(selectedUser);
    } else {
      await loadMainData();
    }
    setIsRefreshing(false);
  };

  // Map users with activity stats derived from allLogs
  const userStatsMap = useMemo(() => {
    const map: Record<string, { count: number; lastActive: string | null }> = {};
    for (const log of allLogs) {
      const uId =
        (typeof log.userId === 'object' && log.userId ? log.userId._id : log.userId) ||
        log.actorId ||
        log.userEmail;

      if (!uId) continue;
      const timeStr = log.timestamp || log.createdAt;
      if (!map[uId]) {
        map[uId] = { count: 1, lastActive: timeStr };
      } else {
        map[uId].count += 1;
        if (timeStr && (!map[uId].lastActive || new Date(timeStr) > new Date(map[uId].lastActive!))) {
          map[uId].lastActive = timeStr;
        }
      }
    }
    return map;
  }, [allLogs]);

  // Filtered User List
  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        u => (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q))
      );
    }
    return result;
  }, [users, searchQuery]);

  // Filtered Timeline Logs
  const filteredLogs = useMemo(() => {
    const targetLogs = selectedUser ? userActivities : allLogs;
    let result = [...targetLogs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(log => {
        const ev = (log.title || log.event || log.action || '').toLowerCase();
        const desc = (log.details || log.description || log.message || '').toLowerCase();
        const email = (log.userEmail || (log.userId && log.userId.email) || '').toLowerCase();
        const name = (log.userName || (log.userId && log.userId.name) || '').toLowerCase();
        return ev.includes(q) || desc.includes(q) || email.includes(q) || name.includes(q);
      });
    }

    return result;
  }, [selectedUser, userActivities, allLogs, searchQuery]);

  // Render User Entry Card
  const renderUserCard = ({ item }: { item: any }) => {
    const uId = item._id || item.id || item.email;
    const stats = userStatsMap[uId] || { count: item.scanCount || 0, lastActive: item.lastLoginAt || item.createdAt };

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => loadUserDetail(item)}
        activeOpacity={0.8}
      >
        <View style={styles.userCardHeader}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>
              {(item.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.userInfoCol}>
            <View style={styles.userNameRow}>
              <Text style={styles.userNameText}>{item.name || 'Anonymous User'}</Text>
              <View style={[styles.roleBadge, item.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
                <Text style={[styles.roleBadgeText, item.role === 'admin' ? styles.roleTextAdmin : styles.roleTextUser]}>
                  {(item.role || 'user').toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.userEmailText}>{item.email || 'No email'}</Text>
          </View>

          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View →</Text>
          </View>
        </View>

        <View style={styles.userCardFooter}>
          <View style={styles.statItem}>
            <Feather name="compass" size={12} color={COLORS.gold} />
            <Text style={styles.statItemText}>{item.scanCount ?? stats.count} Total Scans</Text>
          </View>

          <View style={styles.statItem}>
            <Feather name="clock" size={12} color={COLORS.textSecondary} />
            <Text style={styles.statItemText}>
              Last active:{' '}
              {stats.lastActive
                ? new Date(stats.lastActive).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Never'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Log Timeline Entry
  const renderLogItem = ({ item, index }: { item: any; index: number }) => {
    const eventType = (item.title || item.event || item.action || item.type || 'DEFAULT').toUpperCase();
    const iconName = EVENT_ICONS[eventType] || EVENT_ICONS.DEFAULT;
    const accentColor = EVENT_COLORS[eventType] || EVENT_COLORS.DEFAULT;

    const timestampStr = item.timestamp || item.createdAt;
    const dateFormatted = timestampStr
      ? new Date(timestampStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
      : '—';

    const actorName = item.userId?.name || item.userName || item.user?.name || (selectedUser ? selectedUser.name : 'System User');
    const actorEmail = item.userId?.email || item.userEmail || item.user?.email || (selectedUser ? selectedUser.email : null);

    return (
      <View style={styles.logCard}>
        <View style={styles.timelineCol}>
          <View style={[styles.logDot, { backgroundColor: accentColor }]} />
          {index < filteredLogs.length - 1 && <View style={styles.timelineLine} />}
        </View>

        <View style={styles.logCardContent}>
          <View style={styles.logHeaderRow}>
            <View style={styles.eventChipRow}>
              <View style={[styles.miniIconWrap, { backgroundColor: `${accentColor}18` }]}>
                <Feather name={iconName} size={12} color={accentColor} />
              </View>
              <Text style={styles.logEventTitle}>{(item.title || eventType).replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.logTime}>{dateFormatted}</Text>
          </View>

          <Text style={styles.logDescription}>
            {item.details || item.description || item.message || item.action || 'Audit event executed.'}
          </Text>

          {actorEmail && (
            <View style={styles.logMetaRow}>
              <Feather name="user" size={11} color={COLORS.textSecondary} />
              <Text style={styles.logMetaText}>{actorName} ({actorEmail})</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <AdminLayout navigation={navigation} activeSection="logs" title="Audit Logs">
      <View style={styles.container}>
        {/* SPECIFIC USER DETAIL VIEW */}
        {selectedUser ? (
          <View style={styles.subContainer}>
            {/* Back Button */}
            <View style={styles.backRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setSelectedUser(null)}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={14} color={COLORS.gold} />
                <Text style={styles.backBtnText}>Back to All Users</Text>
              </TouchableOpacity>
            </View>

            {/* Selected User Summary Header Card */}
            <View style={styles.userHeaderCard}>
              <View style={styles.userHeaderTop}>
                <View style={styles.avatarWrapLarge}>
                  <Text style={styles.avatarTextLarge}>
                    {(selectedUser.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userHeaderName}>{selectedUser.name || 'User Activity'}</Text>
                    <View style={[styles.roleBadge, selectedUser.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
                      <Text style={[styles.roleBadgeText, selectedUser.role === 'admin' ? styles.roleTextAdmin : styles.roleTextUser]}>
                        {(selectedUser.role || 'user').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.userHeaderEmail}>{selectedUser.email || 'No email registered'}</Text>
                </View>
              </View>

              <View style={styles.userHeaderStatsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxValue}>{selectedUser.scanCount ?? selectedUser.totalScans ?? 0}</Text>
                  <Text style={styles.statBoxLabel}>Total Scans</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statBoxValue}>{userActivities.length}</Text>
                  <Text style={styles.statBoxLabel}>Recorded Activities</Text>
                </View>
              </View>
            </View>

            {/* Activity Timeline Header (NO CATEGORY TABS BAR) */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.iconChip}>
                <Feather name="clock" size={14} color={COLORS.gold} />
              </View>
              <Text style={styles.sectionTitle}>User Activity Timeline</Text>
            </View>

            {/* Activity List */}
            {isUserLoading ? (
              <ActivityIndicator size="large" color={COLORS.gold} style={{ marginVertical: SPACING.xl }} />
            ) : (
              <FlatList
                data={filteredLogs}
                keyExtractor={(item, idx) => item._id || String(idx)}
                renderItem={renderLogItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />
                }
                ListEmptyComponent={
                  <AdminEmptyState
                    icon="activity"
                    title="No Activity Yet"
                    message="This user has not performed any tracked actions."
                  />
                }
              />
            )}
          </View>
        ) : (
          /* ALL USERS MAIN VIEW */
          <View style={styles.subContainer}>
            {/* Page Header */}
            <View style={styles.pageHeader}>
              <View style={styles.headerTitleRow}>
                <View style={styles.iconChip}>
                  <Feather name="file-text" size={16} color={COLORS.gold} />
                </View>
                <View>
                  <Text style={styles.pageTitle}>System Audit Logs</Text>
                  <Text style={styles.pageSub}>User-centric audit management & activity trail</Text>
                </View>
              </View>
            </View>

            {/* Search & View Mode Selector */}
            <View style={styles.controlsRow}>
              <View style={styles.searchBox}>
                <Feather name="search" size={14} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={viewMode === 'users' ? 'Search users by name or email...' : 'Search activity logs...'}
                  placeholderTextColor={COLORS.textSecondary}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Feather name="x" size={14} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.viewToggleGroup}>
                <TouchableOpacity
                  style={[styles.toggleBtn, viewMode === 'users' && styles.toggleBtnActive]}
                  onPress={() => setViewMode('users')}
                  activeOpacity={0.7}
                >
                  <Feather name="users" size={12} color={viewMode === 'users' ? COLORS.gold : COLORS.textSecondary} />
                  <Text style={[styles.toggleBtnText, viewMode === 'users' && styles.toggleBtnTextActive]}>Users</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, viewMode === 'timeline' && styles.toggleBtnActive]}
                  onPress={() => setViewMode('timeline')}
                  activeOpacity={0.7}
                >
                  <Feather name="list" size={12} color={viewMode === 'timeline' ? COLORS.gold : COLORS.textSecondary} />
                  <Text style={[styles.toggleBtnText, viewMode === 'timeline' && styles.toggleBtnTextActive]}>Timeline</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Content List (NO CATEGORY TABS BAR) */}
            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.gold} style={{ marginVertical: SPACING.xl }} />
            ) : viewMode === 'users' ? (
              <FlatList
                data={filteredUsers}
                keyExtractor={item => item._id || item.id || item.email}
                renderItem={renderUserCard}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />
                }
                ListEmptyComponent={
                  <AdminEmptyState
                    icon="users"
                    title="No Users Found"
                    message="No user accounts match the search query."
                  />
                }
              />
            ) : (
              <FlatList
                data={filteredLogs}
                keyExtractor={(item, idx) => item._id || String(idx)}
                renderItem={renderLogItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />
                }
                ListEmptyComponent={
                  <AdminEmptyState
                    icon="file-text"
                    title="No Audit Logs Found"
                    message="No system audit entries match the search query."
                  />
                }
              />
            )}
          </View>
        )}
      </View>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.md },
  subContainer: { flex: 1, gap: SPACING.md },

  // Header
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.xs },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
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
  pageTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  pageSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },

  // Controls Row
  controlsRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 12, padding: 0 },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleBtnActive: { backgroundColor: 'rgba(212, 175, 55, 0.12)' },
  toggleBtnText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  toggleBtnTextActive: { color: COLORS.gold, fontWeight: '700' },

  // Users Card List
  userCard: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  userCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.gold, fontSize: 15, fontWeight: '800' },
  userInfoCol: { flex: 1, gap: 2 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userNameText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  userEmailText: { color: COLORS.textSecondary, fontSize: 11 },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleBadgeAdmin: { backgroundColor: 'rgba(212, 175, 55, 0.15)' },
  roleBadgeUser: { backgroundColor: 'rgba(91, 155, 213, 0.15)' },
  roleBadgeText: { fontSize: 9, fontWeight: '800' },
  roleTextAdmin: { color: COLORS.gold },
  roleTextUser: { color: '#5B9BD5' },
  viewBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: 'rgba(212, 175, 55, 0.08)' },
  viewBtnText: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },

  userCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statItemText: { color: COLORS.textSecondary, fontSize: 11 },

  // User Detail View Elements
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  backBtnText: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },

  userHeaderCard: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  userHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flexWrap: 'wrap' },
  avatarWrapLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: { color: COLORS.gold, fontSize: 18, fontWeight: '800' },
  userHeaderName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  userHeaderEmail: { color: COLORS.textSecondary, fontSize: 12, marginTop: 1 },

  userHeaderStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 8,
  },
  statBox: { alignItems: 'center' },
  statBoxValue: { color: COLORS.gold, fontSize: 14, fontWeight: '800' },
  statBoxLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 1 },
  statDivider: { width: 1, height: 20, backgroundColor: 'rgba(255, 255, 255, 0.08)' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },

  // Log Card Layout
  listContent: { gap: SPACING.sm, paddingBottom: SPACING.xl },
  logCard: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
  },
  timelineCol: { alignItems: 'center', width: 14, paddingTop: 4 },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  timelineLine: { flex: 1, width: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginTop: 4 },
  logCardContent: { flex: 1, gap: 4 },
  logHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventChipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniIconWrap: { width: 20, height: 20, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  logEventTitle: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  logTime: { color: COLORS.textSecondary, fontSize: 10 },
  logDescription: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 16 },
  logMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  logMetaText: { color: COLORS.textSecondary, fontSize: 11 },
});
