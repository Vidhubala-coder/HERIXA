import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../../context/FavoritesContext';
import { getAdminStats } from '../../services/userService';
import { getMonuments } from '../../services/monumentService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';

const CATEGORIES = ['Architecture', 'History', 'Inscriptions', 'Sculptures', 'Art', 'Historical Images', 'Videos', 'Heritage Visuals', 'Documents'];

export const ArchiveScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken } = useFavorites();
  const [monuments, setMonuments] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await getMonuments({ limit: 50 });
      setMonuments(res.data || []);
    } catch (e) { console.warn('[Archive] load error:', e); }
  };

  useEffect(() => { loadData(); }, []);

  return (
    <AdminLayout navigation={navigation} activeSection="heritage" title="Heritage Archive">
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Digital Heritage Archive</Text>
          <Text style={styles.pageSub}>{monuments.length} documented heritage sites</Text>
        </View>

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <View style={styles.cats}>
            {CATEGORIES.map((cat, i) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, activeCategory === i && styles.catChipActive]}
                onPress={() => setActiveCategory(i)}
              >
                <Text style={[styles.catText, activeCategory === i && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Archive Grid */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={async () => { setIsRefreshing(true); await loadData(); setIsRefreshing(false); }} tintColor={COLORS.gold} />}
        >
          {monuments.length === 0 ? (
            <AdminEmptyState
              icon="archive"
              title="No Archive Content"
              message="Heritage archive entries will appear here."
              actionLabel="Add Heritage Site"
              onAction={() => navigation.navigate('AddHeritageSite')}
            />
          ) : (
            monuments.map((m) => (
              <TouchableOpacity
                key={m._id || m.id}
                style={styles.archiveCard}
                onPress={() => navigation.navigate('HeritageDetail', { monumentId: m._id || m.id })}
                activeOpacity={0.75}
              >
                <View style={styles.archiveIconWrap}>
                  <Feather name="archive" size={20} color={COLORS.gold} />
                </View>
                <View style={styles.archiveInfo}>
                  <Text style={styles.archiveName} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.archiveLoc} numberOfLines={1}>
                    {[m.district, m.state].filter(Boolean).join(', ') || m.location || '—'}
                  </Text>
                </View>
                <StatusBadge status={(m.status === 'draft') ? 'draft' : 'verified'} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { padding: SPACING.md, paddingBottom: 0 },
  pageTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  pageSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  catScroll: { flexGrow: 0 },
  cats: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  catChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  catChipActive: { backgroundColor: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.3)' },
  catText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },
  catTextActive: { color: COLORS.gold, fontWeight: '700' },
  scroll: { flex: 1 },
  grid: { padding: SPACING.md, gap: SPACING.sm },
  archiveCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  archiveIconWrap: {
    width: 44, height: 44, borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(212,175,55,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  archiveInfo: { flex: 1 },
  archiveName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  archiveLoc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
});
