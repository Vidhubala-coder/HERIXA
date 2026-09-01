import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminPortalParamList } from './types';
import { COLORS } from '../constants/theme';

// Admin Portal Screens
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { HeritageSitesScreen } from '../screens/admin/HeritageSitesScreen';
import { AddHeritageSiteScreen } from '../screens/admin/AddHeritageSiteScreen';
import { HeritageDetailScreen } from '../screens/admin/HeritageDetailScreen';
import { AIIntelligenceScreen } from '../screens/admin/AIIntelligenceScreen';
import { HeritageMapScreen } from '../screens/admin/HeritageMapScreen';
import { UsersScreen } from '../screens/admin/UsersScreen';
import { UserDetailAdminScreen } from '../screens/admin/UserDetailAdminScreen';
import { ArchiveScreen } from '../screens/admin/ArchiveScreen';
import { TourismInsightsScreen } from '../screens/admin/TourismInsightsScreen';
import { NotificationsScreen } from '../screens/admin/NotificationsScreen';
import { AuditLogsScreen } from '../screens/admin/AuditLogsScreen';
import { AdminSettingsScreen } from '../screens/admin/AdminSettingsScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';
import { HeritageVisualsAdminScreen } from '../screens/admin/HeritageVisualsAdminScreen';

const AdminStack = createNativeStackNavigator<AdminPortalParamList>();

export const AdminPortalNavigator: React.FC = () => {
  return (
    <AdminStack.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'fade',
      }}
    >
      <AdminStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <AdminStack.Screen
        name="HeritageSites"
        component={HeritageSitesScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="AddHeritageSite"
        component={AddHeritageSiteScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <AdminStack.Screen
        name="HeritageDetail"
        component={HeritageDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="AIIntelligence"
        component={AIIntelligenceScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="HeritageMap"
        component={HeritageMapScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="AdminUsers"
        component={UsersScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="Users"
        component={UsersScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="AdminUserDetail"
        component={UserDetailAdminScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="HeritageArchive"
        component={ArchiveScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="TourismInsights"
        component={TourismInsightsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="AdminNotifications"
        component={NotificationsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="HeritageVisuals"
        component={HeritageVisualsAdminScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="AuditLogs"
        component={AuditLogsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AdminStack.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </AdminStack.Navigator>
  );
};
