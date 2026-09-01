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
  accentColor = COLORS.gold,
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
            { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}12` },
          ]}
        >
          <Feather name={icon} size={18} color={accentColor} />
        </View>

        {trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: trendUp ? 'rgba(95, 168, 122, 0.12)' : 'rgba(212, 90, 91, 0.12)' }]}>
            <Feather
              name={trendUp ? 'arrow-up-right' : 'arrow-down-right'}
              size={11}
              color={trendUp ? '#5FA87A' : COLORS.danger}
            />
            <Text style={[styles.trendText, { color: trendUp ? '#5FA87A' : COLORS.danger }]}>
              {trend}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.metricContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
    minWidth: 150,
    flex: 1,
    gap: SPACING.sm,
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
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
