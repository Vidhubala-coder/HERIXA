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
          <View style={styles.logoTextContainer}>
            <Text style={styles.logoTitle}>HERIXA</Text>
            <Text style={styles.logoSubtitle}>Heritage Administration</Text>
          </View>
        ) : (
          <Text style={styles.logoIcon}>H</Text>
        )}
        <TouchableOpacity onPress={onToggle} style={styles.toggleBtn} activeOpacity={0.7}>
          <Feather name={expanded ? 'chevron-left' : 'chevron-right'} size={18} color={COLORS.gold} />
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
                    color={isActive ? COLORS.gold : COLORS.textSecondary}
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
        <Feather name="log-out" size={18} color={COLORS.danger} />
        {expanded && <Text style={styles.logoutLabel}>Logout</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#141412',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: SPACING.md,
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  logoTextContainer: {
    justifyContent: 'center',
  },
  logoTitle: {
    color: COLORS.gold,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 2,
  },
  logoSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  logoIcon: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: '800',
    paddingLeft: SPACING.xs,
  },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: SPACING.sm,
    marginHorizontal: SPACING.sm,
  },
  navList: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: SPACING.xs,
  },
  groupContainer: {
    marginBottom: SPACING.sm,
  },
  groupTitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    opacity: 0.5,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  navLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: SPACING.sm,
  },
  navLabelActive: {
    color: COLORS.gold,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: COLORS.gold,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(212, 90, 91, 0.08)',
  },
  logoutLabel: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
});
