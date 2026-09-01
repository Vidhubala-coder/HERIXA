/**
 * AdminLayout — responsive wrapper for all Admin Portal screens.
 * On wide screens (≥768): shows collapsible AdminSidebar + main content.
 * On narrow screens: shows AdminHeader + slide-in MobileDrawer + main content.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { MobileDrawer } from './MobileDrawer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_WIDE = SCREEN_WIDTH >= 768;

export type AdminSection =
  | 'dashboard'
  | 'heritage'
  | 'map'
  | 'ai'
  | 'users'
  | 'tourism'
  | 'notifications'
  | 'visuals'
  | 'logs'
  | 'settings'
  | 'profile';

interface AdminLayoutProps {
  children: React.ReactNode;
  navigation?: any;
  activeSection?: AdminSection | string;
  activeRoute?: AdminSection | string;
  title: string;
  subtitle?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  navigation: propNavigation,
  activeSection,
  activeRoute,
  title,
  subtitle,
}) => {
  const fallbackNavigation = useNavigation();
  const navigation = propNavigation || fallbackNavigation;

  const currentSection: AdminSection = ((activeSection || activeRoute || 'dashboard') as AdminSection);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const handleNavigate = useCallback((section: AdminSection) => {
    setDrawerOpen(false);
    const routeMap: Record<AdminSection, string> = {
      dashboard: 'AdminDashboard',
      heritage: 'HeritageSites',
      map: 'HeritageMap',
      ai: 'AIIntelligence',
      users: 'AdminUsers',
      tourism: 'TourismInsights',
      notifications: 'AdminNotifications',
      visuals: 'HeritageVisuals',
      logs: 'AuditLogs',
      settings: 'AdminSettings',
      profile: 'AdminProfile',
    };
    const targetRoute = routeMap[section];
    if (targetRoute && navigation) {
      (navigation as any).navigate(targetRoute);
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        {IS_WIDE ? (
          // Wide layout: Sidebar + Content
          <View style={styles.wideLayout}>
            <AdminSidebar
              activeSection={currentSection}
              onNavigate={handleNavigate}
              expanded={sidebarExpanded}
              onToggle={() => setSidebarExpanded(p => !p)}
              navigation={navigation}
            />
            <View style={styles.mainContent}>
              {children}
            </View>
          </View>
        ) : (
          // Narrow layout: Header + Drawer overlay + Content
          <View style={styles.narrowLayout}>
            <AdminHeader
              title={title}
              subtitle={subtitle}
              onMenuPress={() => setDrawerOpen(true)}
              navigation={navigation}
            />
            <View style={styles.mainContent}>
              {children}
            </View>
            <MobileDrawer
              visible={drawerOpen}
              activeSection={currentSection}
              onNavigate={handleNavigate}
              onClose={() => setDrawerOpen(false)}
              navigation={navigation}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  wideLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  narrowLayout: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
