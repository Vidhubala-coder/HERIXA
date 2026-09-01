import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../context/FavoritesContext';
import { getAdminUsers } from '../services/userService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

export const UserManagementScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken } = useFavorites();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUsers = async (pageNumber: number, searchQuery: string, isLoadMore = false) => {
    if (!authToken) return;
    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const limit = 20;
      const res = await getAdminUsers(authToken, pageNumber, limit, searchQuery);

      if (res.success && res.data) {
        if (isLoadMore) {
          setUsers(prev => [...prev, ...res.data]);
        } else {
          setUsers(res.data);
        }
        if (res.pagination) {
          setTotalPages(res.pagination.pages);
        }
      } else {
        Alert.alert('Error', 'Failed to retrieve users.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred fetching user records.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, '');
  }, [authToken]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Debounce search query to reduce server load
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchUsers(1, text);
    }, 500);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !isLoadingMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUsers(nextPage, search, true);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => navigation.navigate('UserDetails', { userId: item._id })}
      activeOpacity={0.8}
    >
      <View style={styles.userRowLeft}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userMeta}>Role: {item.role} • Registered: {formatDate(item.createdAt)} • Scans: {item.totalScans ?? item.scanCount ?? 0}</Text>
        </View>
      </View>

      <View style={styles.userRowRight}>
        {item.isEmailVerified ? (
          <View style={[styles.badge, styles.badgeVerified]}>
            <Text style={styles.badgeTextVerified}>Verified</Text>
          </View>
        ) : (
          <View style={[styles.badge, styles.badgePending]}>
            <Text style={styles.badgeTextPending}>Pending</Text>
          </View>
        )}
        <Feather name="chevron-right" size={16} color={COLORS.textSecondary} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <Feather name="search" size={18} color={COLORS.textSecondary} style={{ marginRight: SPACING.sm }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={handleSearchChange}
            placeholder="Search by name or email..."
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                setPage(1);
                fetchUsers(1, '');
              }}
            >
              <Feather name="x" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* User list */}
      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Fetching database users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={item => item._id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No users matched your query.</Text>
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
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    height: '100%',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.gold, ...TYPOGRAPHY.bodyMedium, marginTop: SPACING.md },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  userRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarText: { color: COLORS.gold, ...TYPOGRAPHY.bodyLarge, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, fontWeight: '600' },
  userEmail: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, marginTop: 1 },
  userMeta: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, fontSize: 11, marginTop: 3, opacity: 0.7 },
  userRowRight: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, borderWidth: 1 },
  badgeVerified: { backgroundColor: '#14332b', borderColor: '#1b4d3e' },
  badgePending: { backgroundColor: '#332914', borderColor: '#4d3a1b' },
  badgeTextVerified: { color: '#2ebd8a', fontSize: 10, fontWeight: '700' },
  badgeTextPending: { color: '#bd962e', fontSize: 10, fontWeight: '700' },
  footerLoader: { paddingVertical: SPACING.md },
  emptyText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium, textAlign: 'center', marginTop: SPACING.xxl },
});

export default UserManagementScreen;
