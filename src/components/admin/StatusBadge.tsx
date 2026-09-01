import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../../constants/theme';

type StatusType =
  | 'online'
  | 'offline'
  | 'warning'
  | 'verified'
  | 'pending'
  | 'rejected'
  | 'published'
  | 'draft'
  | 'archived'
  | 'admin'
  | 'user'
  | 'active'
  | 'inactive';

const STATUS_CONFIG: Record<StatusType, { bg: string; text: string; label: string }> = {
  online:    { bg: 'rgba(63,108,81,0.18)',  text: '#5FA87A', label: 'ONLINE' },
  offline:   { bg: 'rgba(158,42,43,0.18)',  text: '#D45A5B', label: 'OFFLINE' },
  warning:   { bg: 'rgba(197,160,89,0.18)', text: '#C5A059', label: 'WARNING' },
  verified:  { bg: 'rgba(63,108,81,0.18)',  text: '#5FA87A', label: 'VERIFIED' },
  pending:   { bg: 'rgba(197,160,89,0.18)', text: '#C5A059', label: 'PENDING' },
  rejected:  { bg: 'rgba(158,42,43,0.18)',  text: '#D45A5B', label: 'REJECTED' },
  published: { bg: 'rgba(63,108,81,0.18)',  text: '#5FA87A', label: 'PUBLISHED' },
  draft:     { bg: 'rgba(161,158,149,0.15)',text: '#A19E95', label: 'DRAFT' },
  archived:  { bg: 'rgba(161,158,149,0.15)',text: '#A19E95', label: 'ARCHIVED' },
  admin:     { bg: 'rgba(212,175,55,0.15)', text: COLORS.gold, label: 'ADMIN' },
  user:      { bg: 'rgba(161,158,149,0.15)',text: '#A19E95', label: 'USER' },
  active:    { bg: 'rgba(63,108,81,0.18)',  text: '#5FA87A', label: 'ACTIVE' },
  inactive:  { bg: 'rgba(161,158,149,0.15)',text: '#A19E95', label: 'INACTIVE' },
};

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  dot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, dot = false }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const displayLabel = label || config.label;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      {dot && <View style={[styles.dot, { backgroundColor: config.text }]} />}
      <Text style={[styles.text, { color: config.text }]}>{displayLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
