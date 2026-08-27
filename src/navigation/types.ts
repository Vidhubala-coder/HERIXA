import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  MonumentDetails: { monumentId: string };
  FullHistory: { monumentId: string };
  AdminUpload: undefined;
  Preferences: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  UserHistory: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Explore: { category?: string } | undefined;
  AR: { monumentId?: string } | undefined;
  Favorites: undefined;
  Profile: undefined;
};
