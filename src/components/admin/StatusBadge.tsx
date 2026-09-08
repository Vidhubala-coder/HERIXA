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
  online:    { bg: 'rgba(22, 163, 74, 0.1)',  text: '#16A34A', label: 'ONLINE' },
  offline:   { bg: 'rgba(220, 38, 38, 0.1)',  text: '#DC2626', label: 'OFFLINE' },
  warning:   { bg: 'rgba(217, 119, 6, 0.1)', text: '#D97706', label: 'WARNING' },
  verified:  { bg: 'rgba(22, 163, 74, 0.1)',  text: '#16A34A', label: 'VERIFIED' },
  pending:   { bg: 'rgba(217, 119, 6, 0.1)', text: '#D97706', label: 'PENDING' },
  rejected:  { bg: 'rgba(220, 38, 38, 0.1)',  text: '#DC2626', label: 'REJECTED' },
  published: { bg: 'rgba(22, 163, 74, 0.1)',  text: '#16A34A', label: 'PUBLISHED' },
  draft:     { bg: 'rgba(100, 116, 139, 0.1)',text: '#64748B', label: 'DRAFT' },
  archived:  { bg: 'rgba(100, 116, 139, 0.1)',text: '#64748B', label: 'ARCHIVED' },
  admin:     { bg: 'rgba(30, 58, 138, 0.1)', text: '#1E3A8A', label: 'ADMIN' },
  user:      { bg: 'rgba(100, 116, 139, 0.1)',text: '#64748B', label: 'USER' },
  active:    { bg: 'rgba(22, 163, 74, 0.1)',  text: '#16A34A', label: 'ACTIVE' },
  inactive:  { bg: 'rgba(100, 116, 139, 0.1)',text: '#64748B', label: 'INACTIVE' },
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
