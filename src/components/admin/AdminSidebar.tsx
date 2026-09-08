import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { HerixaLogo, HerixaSymbol } from '../HerixaLogo';
import { AdminSection } from './AdminLayout';

interface NavItem {
  key: AdminSection;
  icon: keyof typeof Feather.glyphMap;
  label: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'MAIN',
    items: [
      { key: 'dashboard', icon: 'grid', label: 'Dashboard' },
      { key: 'heritage', icon: 'map-pin', label: 'Monuments' },
      { key: 'map', icon: 'map', label: 'Heritage Map' },
      { key: 'ai', icon: 'cpu', label: 'AI Recognition' },
      { key: 'users', icon: 'users', label: 'Users' },
      { key: 'tourism', icon: 'trending-up', label: 'Analytics' },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { key: 'notifications', icon: 'bell', label: 'Notifications' },
      { key: 'visuals', icon: 'image', label: 'Heritage Visuals' },
      { key: 'protocol', icon: 'compass', label: 'Heritage Protocols' },
      { key: 'video', icon: 'video', label: 'AI Heritage Stories' },
      { key: 'logs', icon: 'file-text', label: 'Audit Logs' },
      { key: 'settings', icon: 'settings', label: 'Settings' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { key: 'profile', icon: 'user', label: 'Admin Profile' },
    ],
  },
];

interface AdminSidebarProps {
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  expanded: boolean;
  onToggle: () => void;
  navigation: any;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeSection,
  onNavigate,
  expanded,
  onToggle,
  navigation,
}) => {
  const { logout } = useFavorites();
  const sidebarWidth = expanded ? 240 : 68;

  const handleLogout = async () => {
    await logout();
    if (navigation && navigation.reset) {
      navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Profile' } }] });
    }
  };

  return (
    <View style={[styles.sidebar, { width: sidebarWidth }]}>
      {/* Brand Header */}
      <View style={styles.logoRow}>
        {expanded ? (
          <View style={styles.logoWrap}>
            <HerixaLogo size={32} />
            <Text style={styles.commandTag}>COMMAND CENTER</Text>
          </View>
        ) : (
          <HerixaSymbol size={28} />
        )}
        <TouchableOpacity onPress={onToggle} style={styles.toggleBtn} activeOpacity={0.7}>
          <Feather name={expanded ? 'chevron-left' : 'chevron-right'} size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Nav List */}
      <ScrollView
        style={styles.navList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {NAV_GROUPS.map((group) => (
          <View key={group.title} style={styles.groupContainer}>
            {expanded && <Text style={styles.groupTitle}>{group.title}</Text>}
            {group.items.map((item) => {
              const isActive = activeSection === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => onNavigate(item.key)}
                  activeOpacity={0.7}
                >
                  {isActive && <View style={styles.activeIndicator} />}
                  <Feather
                    name={item.icon}
                    size={18}
                    color={isActive ? COLORS.primary : COLORS.textSecondary}
                  />
                  {expanded && (
                    <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                      {item.label}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.divider} />

      {/* Logout Footer */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Feather name="log-out" size={16} color="#DC2626" />
        {expanded && <Text style={styles.logoutLabel}>Logout</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: SPACING.md,
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    height: 46,
  },
  logoWrap: {
    gap: 2,
  },
  commandTag: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 1.2,
    marginTop: -2,
  },
  toggleBtn: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(30, 58, 138, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 138, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: SPACING.xs,
    marginHorizontal: SPACING.sm,
  },
  navList: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: SPACING.xs,
  },
  groupContainer: {
    marginBottom: SPACING.xs,
  },
  groupTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 138, 0.15)',
  },
  navLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: SPACING.sm,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3.5,
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(220, 38, 38, 0.06)',
  },
  logoutLabel: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
});
