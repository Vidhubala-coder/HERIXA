import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../../context/FavoritesContext';
import { getAdminNotifications } from '../../services/userService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';

const CATEGORIES = ['All', 'Users', 'Heritage', 'Security'];

export const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken } = useFavorites();
  const [activeCategory, setActiveCategory] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await getAdminNotifications(authToken);
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.warn('[NOTIFICATIONS] Load error:', err);
    }
  }, [authToken]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await fetchNotifications();
      setIsLoading(false);
    })();
  }, [fetchNotifications]);

  const filteredNotifs = notifications.filter((item) => {
    if (activeCategory === 0) return true; // All
    if (activeCategory === 1) return item.type === 'user_registered' || item.type === 'email_verified'; // Users
    if (activeCategory === 2) return item.type === 'heritage_created' || item.type === 'heritage_deleted'; // Heritage
    if (activeCategory === 3) return item.type === 'account_deleted' || item.type === 'password_reset'; // Security
    return true;
  });

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'user_registered': return 'user-plus';
      case 'account_deleted': return 'user-x';
      case 'password_reset': return 'key';
      case 'heritage_created': return 'map-pin';
      case 'heritage_deleted': return 'trash-2';
      case 'email_verified': return 'check-circle';
      default: return 'bell';
    }
  };

  const getNotifColor = (type: string) => {
    switch (type) {
      case 'user_registered': return COLORS.gold;
      case 'account_deleted': return '#D45A5B';
      case 'password_reset': return '#7B9EBE';
      case 'heritage_created': return '#5FA87A';
      case 'heritage_deleted': return '#D45A5B';
      case 'email_verified': return '#5FA87A';
      default: return COLORS.gold;
    }
  };

  return (
    <AdminLayout activeRoute="Notifications" title="Notifications">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconChip}>
              <Feather name="bell" size={16} color={COLORS.gold} />
            </View>
            <View>
              <Text style={styles.pageTitle}>Notifications</Text>
              <Text style={styles.pageSub}>Platform activity & alert notifications</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={async () => {
              setIsRefreshing(true);
              await fetchNotifications();
              setIsRefreshing(false);
            }}
            activeOpacity={0.7}
          >
            <Feather name="refresh-cw" size={14} color={COLORS.gold} />
          </TouchableOpacity>
        </View>

        {/* Filter Category Pills */}
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat, idx) => {
            const isActive = activeCategory === idx;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveCategory(idx)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notifications List */}
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.gold} style={{ marginVertical: SPACING.xl }} />
        ) : (
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={async () => {
                  setIsRefreshing(true);
                  await fetchNotifications();
                  setIsRefreshing(false);
                }}
                tintColor={COLORS.gold}
              />
            }
          >
            {filteredNotifs.length === 0 ? (
              <AdminEmptyState
                icon="bell"
                title="No Notifications"
                message="No notifications match the selected category filter."
              />
            ) : (
              filteredNotifs.map((item, idx) => {
                const iconName = getNotifIcon(item.type);
                const accentColor = getNotifColor(item.type);
                return (
                  <View key={item._id || idx} style={styles.notifCard}>
                    <View style={[styles.notifIconWrap, { backgroundColor: `${accentColor}18` }]}>
                      <Feather name={iconName as any} size={16} color={accentColor} />
                    </View>
                    <View style={styles.notifBody}>
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      <Text style={styles.notifMsg}>{item.message}</Text>
                      <Text style={styles.notifTime}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.md, gap: SPACING.md },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  refreshBtn: {
    width: 32, height: 32, borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  categoryRow: { flexDirection: 'row', gap: SPACING.xs },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  filterChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.gold, fontWeight: '700' },
  scrollList: { flex: 1 },
  scrollContent: { gap: SPACING.sm, paddingBottom: SPACING.xl },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
  },
  notifIconWrap: {
    width: 36, height: 36, borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
  },
  notifBody: { flex: 1, gap: 3 },
  notifTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  notifMsg: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 16 },
  notifTime: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
});
