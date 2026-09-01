import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, ActivityIndicator, RefreshControl, Alert, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../../context/FavoritesContext';
import { getMonuments, ApiMonument, getImageUrl, deleteMonument } from '../../services/monumentService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';
import { SafeImage } from '../../components/SafeImage';

export const HeritageSitesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken } = useFavorites();
  const [monuments, setMonuments] = useState<ApiMonument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'archived' | 'visuals' | 'no-visuals'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ApiMonument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMonuments = useCallback(async (pg = 1, q = search) => {
    try {
      const res = await getMonuments({ page: pg, limit: 20, search: q || undefined });
      if (pg === 1) {
        setMonuments(res.data || []);
      } else {
        setMonuments(prev => [...prev, ...(res.data || [])]);
      }
      setTotalPages(res.pagination?.pages ?? 1);
      setPage(pg);
    } catch (e) {
      console.warn('[HeritageSites] load error:', e);
    }
  }, [search]);

  useEffect(() => {
    (async () => { setIsLoading(true); await loadMonuments(1); setIsLoading(false); })();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMonuments(1);
    setIsRefreshing(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !authToken) return;
    const targetId = deleteTarget._id || deleteTarget.id;
    try {
      setIsDeleting(true);
      await deleteMonument(targetId, authToken);
      setMonuments(prev => prev.filter(m => (m._id || m.id) !== targetId));
      setDeleteTarget(null);
      Alert.alert('Deleted', `${deleteTarget.name} has been removed from active heritage sites.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete heritage site.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMonuments = monuments.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const visualCount = (m as any).heritagePreviewImages?.length || 0;
    const status = (m as any).status || 'published';
    if (filter === 'published') return matchSearch && status === 'published';
    if (filter === 'draft') return matchSearch && status === 'draft';
    if (filter === 'archived') return matchSearch && status === 'archived';
    if (filter === 'visuals') return matchSearch && visualCount > 0;
    if (filter === 'no-visuals') return matchSearch && visualCount === 0;
    return matchSearch;
  });

  const renderItem = ({ item }: { item: ApiMonument }) => {
    const imageUrl = item.image
      ? getImageUrl(item.image)
      : item.galleryImages?.[0]
        ? getImageUrl(item.galleryImages[0])
        : null;

    const visualCount = (item as any).heritagePreviewImages?.length || 0;

    return (
      <View style={styles.siteCard}>
        <View style={styles.siteCardHeader}>
          {imageUrl ? (
            <SafeImage source={{ uri: imageUrl }} style={styles.siteImage} resizeMode="cover" />
          ) : (
            <View style={[styles.siteImage, styles.siteImageFallback]}>
              <Feather name="image" size={20} color={COLORS.textSecondary} />
            </View>
          )}
          <View style={styles.siteInfo}>
            <Text style={styles.siteName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.siteLocation} numberOfLines={1}>
              {[item.district, item.state].filter(Boolean).join(', ') || item.location || '—'}
            </Text>
            <View style={styles.badgeRow}>
              <StatusBadge status="active" label={`${visualCount} Heritage Images`} dot />
              <StatusBadge status={(item as any).status === 'draft' ? 'draft' : 'published'} dot />
            </View>
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('HeritageDetail', { monumentId: item._id || item.id })}
            activeOpacity={0.7}
          >
            <Feather name="eye" size={13} color={COLORS.gold} />
            <Text style={styles.actionBtnText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('HeritageDetail', { monumentId: item._id || item.id })}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={13} color={COLORS.textPrimary} />
            <Text style={[styles.actionBtnText, { color: COLORS.textPrimary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={() => setDeleteTarget(item)}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={13} color="#D45A5B" />
            <Text style={[styles.actionBtnText, { color: '#D45A5B' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <AdminLayout navigation={navigation} activeSection="heritage" title="Heritage Sites">
      <View style={styles.container}>
        {/* Search & Filter */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search heritage sites..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => { setIsLoading(true); loadMonuments(1).then(() => setIsLoading(false)); }}
            returnKeyType="search"
          />
        </View>

        <View style={styles.filters}>
          {(['all', 'published', 'draft', 'archived', 'visuals', 'no-visuals'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'published' ? 'Published' : f === 'draft' ? 'Draft' : f === 'archived' ? 'Archived' : f === 'visuals' ? 'With Visuals' : 'Without Visuals'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.gold} />
          </View>
        ) : (
          <FlatList
            data={filteredMonuments}
            keyExtractor={item => item._id || item.id || String(Math.random())}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />}
            ListEmptyComponent={
              <AdminEmptyState
                icon="map-pin"
                title="No Heritage Sites Found"
                message="No monuments match your filters."
                actionLabel="Add Heritage Site"
                onAction={() => navigation.navigate('AddHeritageSite')}
              />
            }
            onEndReached={() => {
              if (page < totalPages) loadMonuments(page + 1);
            }}
            onEndReachedThreshold={0.3}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddHeritageSite')}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={24} color={COLORS.background} />
        </TouchableOpacity>

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
              <Text style={styles.modalTitle}>Delete Heritage Site?</Text>
              <Text style={styles.modalSub}>{deleteTarget?.name}</Text>
              <Text style={styles.modalBody}>
                This will remove the heritage site and its associated visual references from the active HERIXA database.
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
                    <Text style={styles.modalBtnDangerText}>Delete</Text>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: {
    flex: 1,
    height: 44,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  filters: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderColor: 'rgba(212,175,55,0.3)',
  },
  filterText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },
  filterTextActive: { color: COLORS.gold, fontWeight: '600' },
  list: { padding: SPACING.md, gap: SPACING.sm },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  siteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  siteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  siteImage: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
  },
  siteImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  siteInfo: { flex: 1, gap: 3 },
  siteName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  siteLocation: { color: COLORS.textSecondary, fontSize: 12 },
  sitePeriod: { color: COLORS.textSecondary, fontSize: 11 },
  badgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 4 },
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
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
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
