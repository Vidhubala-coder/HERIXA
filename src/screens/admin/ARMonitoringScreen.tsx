import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../../context/FavoritesContext';
import { getAdminStats } from '../../services/userService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { KpiCard } from '../../components/admin/KpiCard';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';

export const ARMonitoringScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken } = useFavorites();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    if (!authToken) return;
    try {
      const res = await getAdminStats(authToken);
      if (res.success) setStats(res.data);
    } catch (e) { console.warn('[ARMonitoring] load error:', e); }
  };

  useEffect(() => {
    (async () => { setIsLoading(true); await loadData(); setIsLoading(false); })();
  }, []);

  const totalScans = stats?.totalAiScans ?? 0;
  const successful = stats?.successfulRecognitions ?? 0;
  const failed = totalScans - successful;

  return (
    <AdminLayout navigation={navigation} activeSection="heritage" title="AR Monitoring">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={async () => { setIsRefreshing(true); await loadData(); setIsRefreshing(false); }} tintColor={COLORS.gold} />}
      >
        <Text style={styles.pageTitle}>AR System Analytics</Text>
        <Text style={styles.pageSub}>Monitor AR sessions, scan results, and recognition performance.</Text>

        {/* KPI Row */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <KpiCard icon="aperture" label="Total Scans" value={totalScans} accentColor={COLORS.gold} />
            <KpiCard icon="check-circle" label="Successful" value={successful} accentColor="#5FA87A" />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard icon="x-circle" label="Failed" value={failed} accentColor="#D45A5B" />
            <KpiCard
              icon="activity"
              label="Success Rate"
              value={totalScans > 0 ? `${Math.round((successful / totalScans) * 100)}%` : '—'}
              accentColor="#C5A059"
            />
          </View>
        </View>

        {/* Scan Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Feather name="bar-chart-2" size={16} color={COLORS.gold} />
            <Text style={styles.summaryTitle}>Scan Trends</Text>
          </View>
          <View style={styles.trendRow}>
            <TrendBar label="Successful" value={totalScans > 0 ? (successful / totalScans) * 100 : 0} color="#5FA87A" />
            <TrendBar label="Failed" value={totalScans > 0 ? (failed / totalScans) * 100 : 0} color="#D45A5B" />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Scan Activity</Text>
        <AdminEmptyState
          icon="aperture"
          title="Scan History Coming Soon"
          message="Detailed per-session AR scan logs will appear here as users scan heritage sites."
        />
        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </AdminLayout>
  );
};

const TrendBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={trendStyles.wrap}>
    <View style={trendStyles.labelRow}>
      <View style={[trendStyles.dot, { backgroundColor: color }]} />
      <Text style={trendStyles.label}>{label}</Text>
      <Text style={[trendStyles.pct, { color }]}>{Math.round(value)}%</Text>
    </View>
    <View style={trendStyles.track}>
      <View style={[trendStyles.fill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  </View>
);
const trendStyles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  pct: { fontSize: 12, fontWeight: '700' },
  track: { height: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 3 },
  fill: { height: 6, borderRadius: 3 },
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },
  pageTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  pageSub: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  kpiGrid: { gap: SPACING.sm },
  kpiRow: { flexDirection: 'row', gap: SPACING.sm },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  summaryTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  trendRow: { gap: SPACING.md },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
});
