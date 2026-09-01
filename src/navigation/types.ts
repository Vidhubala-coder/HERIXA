import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  AdminPortal: NavigatorScreenParams<AdminPortalParamList>;
  MonumentDetails: { monumentId: string };
  FullHistory: { monumentId: string };
  AdminUpload: undefined;
  Preferences: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  PrivacyAndLegal: undefined;
  TermsAndConditions: undefined;
  PrivacyPreferences: undefined;
  DeleteAccount: undefined;
  UserManagement: undefined;
  UserDetails: { userId: string };
  AdminActivity: undefined;
  UserHistory: undefined;
  ResetPassword: { token: string };
  RecognitionResult: { result: RecognitionResultData };
  HeritageVisuals: { monumentId: string };
  HeritageMap: undefined;
  Favorites: undefined;
  HeritageAssistant?: {
    monumentContext?: {
      name: string;
      location: string;
      period: string;
    };
  };
};

export type MainTabParamList = {
  Home: undefined;
  Explore: { category?: string } | undefined;
  SmartScan: undefined;
  HeritageMap: undefined;
  Profile: undefined;
};

export type AdminPortalParamList = {
  AdminDashboard: undefined;
  HeritageSites: undefined;
  AddHeritageSite: undefined;
  HeritageDetail: { monumentId: string };
  AIIntelligence: undefined;
  HeritageMap: undefined;
  AdminUsers: undefined;
  Users: undefined;
  AdminUserDetail: { userId: string };
  HeritageArchive: undefined;
  TourismInsights: undefined;
  AdminNotifications: undefined;
  Notifications: undefined;
  HeritageVisuals: { monumentId?: string } | undefined;
  AuditLogs: undefined;
  AdminSettings: undefined;
  AdminProfile: undefined;
};

export interface RecognitionResultData {
  monumentId: string;
  monumentName: string;
  confidence: number;
  dynasty?: string;
  architecturalHighlights?: string[];
  imageUrl?: string;
}
