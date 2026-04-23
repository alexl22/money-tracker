import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import CustomAlert from '../components/CustomAlert';
import { AlertProvider } from '../context/AlertContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { onAuthChanged } from '../firebaseConfig';
import { setupNotifications } from '../utils/notifications';

import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    const unsubscribe = onAuthChanged(() => {
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loaded && isAuthReady) {
      setupNotifications();
      SplashScreen.hideAsync();

      // Ensure Android Navigation Bar is Visible and Transparent
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible');
      }
    }
  }, [loaded, isAuthReady]);

  if (!loaded || !isAuthReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <CurrencyProvider>
          <AlertProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                contentStyle: { backgroundColor: '#101010' },
              }}
            >
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="privacy" options={{ title: 'Privacy Policy', presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="terms" options={{ title: 'Terms of Use', presentation: 'modal', animation: 'slide_from_bottom' }} />
            </Stack>
            <CustomAlert />
            <StatusBar style="light" />
          </AlertProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
