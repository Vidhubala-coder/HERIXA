import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface KpiCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  accentColor?: string;
  onPress?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  label,
  value,
  trend,
  trendUp,
  accentColor = COLORS.primary,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWrap,
            { borderColor: `${accentColor}25`, backgroundColor: `${accentColor}10` },
          ]}
        >
          <Feather name={icon} size={18} color={accentColor} />
        </View>

        {trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: trendUp ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)' }]}>
            <Feather
              name={trendUp ? 'arrow-up-right' : 'arrow-down-right'}
              size={11}
              color={trendUp ? '#16A34A' : '#DC2626'}
            />
            <Text style={[styles.trendText, { color: trendUp ? '#16A34A' : '#DC2626' }]}>
              {trend}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.metricContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.md,
    minWidth: 150,
    flex: 1,
    gap: SPACING.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricContainer: {
    gap: 2,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  value: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
