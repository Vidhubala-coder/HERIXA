import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../../context/FavoritesContext';
import { getAdminAiAnalytics } from '../../services/userService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { KpiCard } from '../../components/admin/KpiCard';
import { StatusBadge } from '../../components/admin/StatusBadge';

export const AIIntelligenceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken } = useFavorites();
  const [aiData, setAiData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await getAdminAiAnalytics(authToken);
      if (res.success && res.data) {
        setAiData(res.data);
      }
    } catch (e) {
      console.warn('[AIIntelligence] load error:', e);
    }
  }, [authToken]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadData();
      setIsLoading(false);
    })();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalUsers = aiData?.totalUsers ?? 0;
  const totalScans = aiData?.totalScans ?? 0;
  const successfulScans = aiData?.successfulScans ?? 0;
  const unrecognizedScans = aiData?.unrecognizedScans ?? 0;
  const successRate = aiData?.successRate ?? 0;
  const avgConfidence = aiData?.avgConfidence ?? 0;
  const mostActiveUser = aiData?.mostActiveUser;
  const trend = aiData?.scanActivityOverTime || [];
  const monumentDistribution = aiData?.monumentDistribution || aiData?.monumentPerformance || [];
  const recentList = aiData?.recentActivity || [];

  const maxTrend = Math.max(...trend.map((t: any) => t.count || 0), 1);

  return (
    <AdminLayout navigation={navigation} activeSection="ai" title="AI Analytics">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              setIsRefreshing(true);
              await loadData();
              setIsRefreshing(false);
            }}
            tintColor={COLORS.gold}
          />
        }
      >
        {/* Model Architecture Header */}
        <View style={styles.modelCard}>
          <View style={styles.modelHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconChip}>
                <Feather name="cpu" size={16} color={COLORS.gold} />
              </View>
              <View>
                <Text style={styles.modelName}>HERIXA Hybrid Dual-Model System</Text>
                <Text style={styles.modelVersion}>Phase 3G (Global) + Phase 3L (Local) Active</Text>
              </View>
            </View>
            <StatusBadge status="online" dot label="ONLINE" />
          </View>
          <View style={styles.metricsRow}>
            <Metric label="Success Rate" value={`${successRate}%`} />
            <Metric label="Total Scans" value={totalScans} />
            <Metric label="Avg Confidence" value={totalScans > 0 ? `${avgConfidence}%` : '—'} />
          </View>
        </View>

        {/* Overview KPIs */}
        <View style={styles.kpiGrid}>
          <KpiCard icon="users" label="TOTAL USERS" value={totalUsers} accentColor="#7B9EBE" />
          <KpiCard icon="aperture" label="TOTAL SCANS" value={totalScans} accentColor={COLORS.gold} />
          <KpiCard icon="check-circle" label="RECOGNITION RATE" value={`${successRate}%`} accentColor="#5FA87A" />
          <KpiCard icon="award" label="AVG CONFIDENCE" value={totalScans > 0 ? `${avgConfidence}%` : '—'} accentColor="#9B8FD4" />
        </View>

        {/* Most Active User */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.iconChip}>
            <Feather name="user-check" size={16} color={COLORS.gold} />
          </View>
          <Text style={styles.sectionTitle}>Most Active User</Text>
        </View>
        <View style={styles.activeUserCard}>
          {mostActiveUser ? (
            <View style={styles.activeUserRow}>
              <View style={styles.activeUserAvatar}>
                <Text style={styles.activeUserAvatarText}>
                  {mostActiveUser.name ? mostActiveUser.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
              <View style={styles.activeUserInfo}>
                <Text style={styles.activeUserName}>{mostActiveUser.name}</Text>
                <Text style={styles.activeUserEmail}>{mostActiveUser.email}</Text>
                <Text style={styles.activeUserSub}>
                  Total Scans: <Text style={{ color: COLORS.gold, fontWeight: '700' }}>{mostActiveUser.scanCount}</Text>
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>No scan activity recorded yet.</Text>
          )}
        </View>

        {/* Scan Activity Over Time */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.iconChip}>
            <Feather name="trending-up" size={16} color={COLORS.gold} />
          </View>
          <Text style={styles.sectionTitle}>Scan Activity (7-Day Trend)</Text>
        </View>
        <View style={styles.chartCard}>
          {totalScans === 0 ? (
            <Text style={styles.emptyText}>No scan activity yet.</Text>
          ) : (
            <View style={styles.chartRow}>
              {trend.map((t: any, i: number) => {
                const heightPercent = Math.round(((t.count || 0) / maxTrend) * 100);
                return (
                  <View key={i} style={styles.chartCol}>
                    <Text style={styles.chartVal}>{t.count || 0}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: `${Math.max(heightPercent, 8)}%` }]} />
                    </View>
                    <Text style={styles.chartDay}>{t.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Monument Recognition Distribution */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.iconChip}>
            <Feather name="bar-chart-2" size={16} color={COLORS.gold} />
          </View>
          <Text style={styles.sectionTitle}>Monument Recognition Distribution</Text>
        </View>

        {monumentDistribution.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recognition data available yet.</Text>
          </View>
        ) : (
          monumentDistribution.map((m: any, i: number) => (
            <View key={m.slug || i} style={styles.perfCard}>
              <View style={styles.perfHeader}>
                <Text style={styles.perfName} numberOfLines={1}>{m.name}</Text>
                <StatusBadge
                  status={m.scans > 0 ? 'verified' : 'pending'}
                  label={`${m.scans} Scans`}
                />
              </View>
              <View style={styles.perfStats}>
                <PerfStat label="Total Scans" value={`${m.scans}`} />
                <PerfStat label="Recognized" value={`${m.successfulScans ?? m.scans}`} />
                <PerfStat label="Accuracy" value={m.scans > 0 ? '100%' : '0%'} />
              </View>
            </View>
          ))
        )}

        {/* Recent Scan Activity */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.iconChip}>
            <Feather name="activity" size={16} color={COLORS.gold} />
          </View>
          <Text style={styles.sectionTitle}>Recent Scan Activity</Text>
        </View>

        {recentList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent scan activity recorded yet.</Text>
          </View>
        ) : (
          recentList.map((act: any, i: number) => (
            <View key={act.id || i} style={styles.actCard}>
              <View style={[styles.actDot, { backgroundColor: act.recognized ? '#5FA87A' : '#D45A5B' }]} />
              <View style={styles.actContent}>
                <Text style={styles.actName}>{act.monumentName}</Text>
                <Text style={styles.actSub}>
                  User: {act.userName} • {act.recognized ? 'Identified' : 'Unrecognized'}
                </Text>
              </View>
              <Text style={styles.actTime}>
                {act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </Text>
            </View>
          ))
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </AdminLayout>
  );
};

const Metric = ({ label, value }: { label: string; value: any }) => (
  <View style={styles.metric}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const PerfStat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.perfStat}>
    <Text style={styles.perfStatValue}>{value}</Text>
    <Text style={styles.perfStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },
  modelCard: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  modelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  modelName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  modelVersion: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  metricsRow: { flexDirection: 'row', gap: SPACING.md, paddingTop: SPACING.xs },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { color: COLORS.gold, fontSize: 20, fontWeight: '800' },
  metricLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2, fontWeight: '500' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  activeUserCard: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
  },
  activeUserRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  activeUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeUserAvatarText: { color: COLORS.gold, fontSize: 18, fontWeight: '700' },
  activeUserInfo: { flex: 1, gap: 2 },
  activeUserName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  activeUserEmail: { color: COLORS.textSecondary, fontSize: 12 },
  activeUserSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  chartCard: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
  },
  chartRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, paddingTop: SPACING.xs },
  chartCol: { alignItems: 'center', gap: 6, flex: 1 },
  chartVal: { color: COLORS.gold, fontSize: 11, fontWeight: '700' },
  barTrack: { width: 14, height: 75, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { backgroundColor: COLORS.gold, borderRadius: 4, width: '100%' },
  chartDay: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '500' },
  perfCard: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  perfName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', flex: 1 },
  perfStats: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg, marginTop: 4 },
  perfStat: { alignItems: 'center' },
  perfStatValue: { color: COLORS.gold, fontSize: 14, fontWeight: '700' },
  perfStatLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  actCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#181816', borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: SPACING.sm,
  },
  actDot: { width: 8, height: 8, borderRadius: 4 },
  actContent: { flex: 1, gap: 2 },
  actName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  actSub: { color: COLORS.textSecondary, fontSize: 11 },
  actTime: { color: COLORS.textSecondary, fontSize: 10 },
  emptyCard: {
    backgroundColor: '#181816', borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: SPACING.lg,
    alignItems: 'center', gap: SPACING.xs,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 13 },
});
