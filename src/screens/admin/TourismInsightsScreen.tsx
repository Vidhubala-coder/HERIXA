import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../../context/FavoritesContext';
import { getAdminTourismInsights } from '../../services/userService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { KpiCard } from '../../components/admin/KpiCard';

export const TourismInsightsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken } = useFavorites();
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    if (!authToken) return;
    try {
      const res = await getAdminTourismInsights(authToken);
      if (res.success && res.data) setInsights(res.data);
    } catch (e) { console.warn('[TourismInsights] load error:', e); }
  };

  useEffect(() => {
    (async () => { setIsLoading(true); await loadData(); setIsLoading(false); })();
  }, []);

  const popular = insights?.popularMonuments || [];
  const trend = insights?.scanTrend || [];
  const maxTrend = Math.max(...trend.map((t: any) => t.count || 0), 1);

  return (
    <AdminLayout navigation={navigation} activeSection="tourism" title="Analytics">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => { setIsRefreshing(true); await loadData(); setIsRefreshing(false); }}
            tintColor={COLORS.gold}
          />
        }
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Tourism Analytics</Text>
          <Text style={styles.pageSub}>Real-time heritage tourism and engagement insights.</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.gold} style={{ marginTop: SPACING.xl }} />
        ) : (
          <>
            {/* Primary KPI Grid */}
            <View style={styles.kpiGrid}>
              <KpiCard icon="users" label="DAU (Active 24h)" value={insights?.dau ?? '—'} accentColor="#5FA87A" />
              <KpiCard icon="calendar" label="MAU (Active 30d)" value={insights?.mau ?? '—'} accentColor="#9B8FD4" />
              <KpiCard icon="aperture" label="TOTAL SCANS" value={insights?.totalScans ?? '—'} accentColor={COLORS.gold} />
              <KpiCard icon="eye" label="TOTAL VIEWS" value={insights?.totalViews ?? '—'} accentColor="#7B9EBE" />
            </View>

            {/* Time Breakdown Cards */}
            <View style={styles.timeBreakdownRow}>
              <View style={styles.timeCard}>
                <Text style={styles.timeVal}>{insights?.scansToday ?? 0}</Text>
                <Text style={styles.timeLabel}>Scans Today</Text>
              </View>
              <View style={styles.timeCard}>
                <Text style={styles.timeVal}>{insights?.scansThisWeek ?? 0}</Text>
                <Text style={styles.timeLabel}>This Week</Text>
              </View>
              <View style={styles.timeCard}>
                <Text style={styles.timeVal}>{insights?.scansThisMonth ?? 0}</Text>
                <Text style={styles.timeLabel}>This Month</Text>
              </View>
            </View>

            {/* 7-Day Scan Trend Chart */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconChip}>
                  <Feather name="trending-up" size={16} color={COLORS.gold} />
                </View>
                <Text style={styles.sectionTitle}>7-Day Smart Scan Trend</Text>
              </View>
              <View style={styles.chartRow}>
                {trend.map((t: any, i: number) => {
                  const heightPercent = Math.round(((t.count || 0) / maxTrend) * 100);
                  return (
                    <View key={i} style={styles.chartCol}>
                      <Text style={styles.chartVal}>{t.count || 0}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: `${Math.max(heightPercent, 8)}%` }]} />
                      </View>
                      <Text style={styles.chartDay}>{t.date ? String(t.date).slice(5) : `D${i + 1}`}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Most Visited Monuments */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconChip}>
                  <Feather name="award" size={16} color={COLORS.gold} />
                </View>
                <Text style={styles.sectionTitle}>Most Visited Heritage Sites</Text>
              </View>
              {popular.length === 0 ? (
                <Text style={styles.emptyText}>No site engagement recorded.</Text>
              ) : (
                popular.map((item: any, idx: number) => (
                  <View key={item._id || idx} style={styles.popularRow}>
                    <Text style={styles.popularRank}>#{idx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.popularName}>{item.name}</Text>
                      <Text style={styles.popularSub}>{item.views ?? 0} views • {item.scans ?? 0} scans</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: SPACING.md, gap: SPACING.md },
  pageHeader: { marginBottom: SPACING.xs },
  pageTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  pageSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  timeBreakdownRow: { flexDirection: 'row', gap: SPACING.sm },
  timeCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: '#E2E8F0', padding: SPACING.sm,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  timeVal: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  timeLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2, fontWeight: '600', textTransform: 'uppercase' },
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: '#E2E8F0', padding: SPACING.md,
    gap: SPACING.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 138, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  chartRow: { flexDirection: 'row', height: 110, alignItems: 'flex-end', gap: SPACING.xs, paddingTop: SPACING.xs },
  chartCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartVal: { color: COLORS.primary, fontSize: 9, fontWeight: '700', marginBottom: 2 },
  barTrack: { flex: 1, width: 14, backgroundColor: '#F1F5F9', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  chartDay: { color: COLORS.textSecondary, fontSize: 9, marginTop: 4, fontWeight: '500' },
  popularRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  popularRank: { color: COLORS.gold, fontSize: 12, fontWeight: '800', width: 24 },
  popularName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  popularSub: { color: COLORS.textSecondary, fontSize: 10, marginTop: 1 },
  emptyText: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', paddingVertical: SPACING.sm },
});
