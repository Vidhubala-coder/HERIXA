import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminSection } from './AdminLayout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 300);

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

interface MobileDrawerProps {
  visible: boolean;
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  onClose: () => void;
  navigation: any;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  visible,
  activeSection,
  onNavigate,
  onClose,
  navigation,
}) => {
  const { logout } = useFavorites();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 180, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateX, overlayOpacity]);

  const handleLogout = async () => {
    onClose();
    await logout();
    if (navigation && navigation.reset) {
      navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Profile' } }] });
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Drawer Content */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {/* Drawer Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>HERIXA</Text>
            <Text style={styles.headerSubtitle}>Heritage Administration</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Navigation Items */}
        <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
          {NAV_GROUPS.map((group) => (
            <View key={group.title} style={styles.groupContainer}>
              <Text style={styles.groupTitle}>{group.title}</Text>
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
                    <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={styles.divider} />

        {/* Drawer Footer / Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Feather name="log-out" size={18} color={COLORS.danger} />
          <Text style={styles.logoutLabel}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#141412',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  headerTitle: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    paddingVertical: 12,
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
    fontSize: 14,
    fontWeight: '500',
    marginLeft: SPACING.md,
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
    paddingVertical: 12,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(212, 90, 91, 0.08)',
  },
  logoutLabel: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: SPACING.md,
  },
});
