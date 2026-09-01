import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../context/FavoritesContext';
import { getAdminActivityLogs } from '../services/userService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

const FILTER_EVENTS = [
  { label: 'All Logs', value: 'ALL' },
  { label: 'Registrations', value: 'ACCOUNT_CREATED' },
  { label: 'Verifications', value: 'EMAIL_VERIFIED' },
  { label: 'Logins', value: 'LOGIN' },
  { label: 'Resets', value: 'PASSWORD_RESET' },
  { label: 'Deletions', value: 'ACCOUNT_DELETED' },
];

export const AdminActivityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken } = useFavorites();
  const [logs, setLogs] = useState<any[]>([]);
  const [eventFilter, setEventFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchLogs = async (pageNumber: number, filter: string, isLoadMore = false) => {
    if (!authToken) return;
    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const limit = 20;
      const res = await getAdminActivityLogs(authToken, pageNumber, limit, filter);

      if (res.success && res.data) {
        if (isLoadMore) {
          setLogs(prev => [...prev, ...res.data]);
        } else {
          setLogs(res.data);
        }
        if (res.pagination) {
          setTotalPages(res.pagination.pages);
        }
      } else {
        Alert.alert('Error', 'Failed to retrieve activity logs.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred fetching activity logs.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchLogs(1, eventFilter);
  }, [authToken, eventFilter]);

  const handleLoadMore = () => {
    if (page < totalPages && !isLoadingMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLogs(nextPage, eventFilter, true);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const getEventDesc = (event: string, user: any) => {
    const nameStr = user?.name || 'User';
    switch (event) {
      case 'ACCOUNT_CREATED': return `A new HERIXA account was created for ${nameStr}`;
      case 'EMAIL_VERIFIED': return `Email verification completed successfully for ${nameStr}`;
      case 'LOGIN': return `${nameStr} completed session authentication`;
      case 'PASSWORD_RESET': return `Password recovery completed successfully for ${nameStr}`;
      case 'ACCOUNT_DELETED': return `A user permanently deleted their HERIXA account`;
      default: return `System activity event logged`;
    }
  };

  const renderLogItem = ({ item }: { item: any }) => (
    <View style={styles.logCard}>
      <View style={styles.logCardHeader}>
        <View style={styles.logCardHeaderLeft}>
          <View style={[styles.nodeIcon, { backgroundColor: getEventColor(item.event) }]}>
            <Feather name={getEventIcon(item.event)} size={11} color="#000" />
          </View>
          <Text style={[styles.logEventText, { color: getEventColor(item.event) }]}>
            {getEventName(item.event)}
          </Text>
        </View>
        <Text style={styles.logDateText}>{formatDate(item.timestamp)}</Text>
      </View>

      <Text style={styles.logDescText}>{getEventDesc(item.event, item.user)}</Text>

      {item.user && item.event !== 'ACCOUNT_DELETED' && (
        <View style={styles.logUserMeta}>
          <Feather name="user" size={12} color={COLORS.textSecondary} />
          <Text style={styles.logUserMetaText}>
            {item.user.name} ({item.user.email})
          </Text>
        </View>
      )}

      <View style={styles.logFooterRow}>
        <Text style={styles.logActorText}>Initiator: {item.actorType}</Text>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>System Activities</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Horizontal Scroll */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTER_EVENTS.map(item => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.filterTab,
                eventFilter === item.value && styles.filterTabActive,
              ]}
              onPress={() => setEventFilter(item.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterTabText,
                  eventFilter === item.value && styles.filterTabTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main logs list */}
      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Fetching activity audit logs...</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={item => item._id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No activity logs matched your filter.</Text>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.gold} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
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
  filterSection: { paddingVertical: SPACING.sm, backgroundColor: COLORS.background },
  filterScrollContent: { paddingHorizontal: SPACING.lg, gap: SPACING.xs },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  filterTabText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.gold, ...TYPOGRAPHY.bodyMedium, marginTop: SPACING.md },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  logCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  logCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  nodeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logEventText: { ...TYPOGRAPHY.bodySmall, fontWeight: '800', fontSize: 11 },
  logDateText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, fontSize: 11, opacity: 0.8 },
  logDescText: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, lineHeight: 20, marginVertical: SPACING.xs },
  logUserMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    padding: SPACING.xs,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
  },
  logUserMetaText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, fontSize: 11 },
  logFooterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.xs },
  logActorText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, fontSize: 10, opacity: 0.6 },
  footerLoader: { paddingVertical: SPACING.md },
  emptyText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium, textAlign: 'center', marginTop: SPACING.xxl },
});

export default AdminActivityScreen;
