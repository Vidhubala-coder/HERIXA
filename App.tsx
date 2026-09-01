import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { FavoritesProvider } from './src/context/FavoritesContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';
import { FloatingAssistant } from './src/components/FloatingAssistant';

export default function App() {
  return (
    <SafeAreaProvider>
      <FavoritesProvider>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <AppNavigator />
        <FloatingAssistant />
      </FavoritesProvider>
    </SafeAreaProvider>
  );
}
