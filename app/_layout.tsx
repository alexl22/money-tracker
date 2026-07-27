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
import { AlertProvider, useAlert } from '../context/AlertContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { TransactionsProvider } from '../context/TransactionsContext';
import { onAuthChanged } from '../firebaseConfig';
import { setupNotifications } from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as NavigationBar from 'expo-navigation-bar';
import { Platform, Text, TextInput } from 'react-native';
import { Colors } from '../constants/DesignSystem';


if ((Text as any).defaultProps) {
  (Text as any).defaultProps.allowFontScaling = true;
  (Text as any).defaultProps.maxFontSizeMultiplier = 1.2;
} else {
  (Text as any).defaultProps = { allowFontScaling: true, maxFontSizeMultiplier: 1.2 };
}

if ((TextInput as any).defaultProps) {
  (TextInput as any).defaultProps.allowFontScaling = true;
  (TextInput as any).defaultProps.maxFontSizeMultiplier = 1.2;
} else {
  (TextInput as any).defaultProps = { allowFontScaling: true, maxFontSizeMultiplier: 1.2 };
}


SplashScreen.preventAutoHideAsync();

const CURRENT_VERSION = '1.1.0';

function VersionChecker() {
  const { showAlert } = useAlert();

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const lastSeen = await AsyncStorage.getItem('last_seen_version');
        
        if (lastSeen === null) {
          // Fresh install: save version silently without showing alert
          await AsyncStorage.setItem('last_seen_version', CURRENT_VERSION);
        } else if (lastSeen !== CURRENT_VERSION) {
          // Returning user: show what's new!
          showAlert(
            "What's New! 🚀",
            "• Instant transaction saving (no loading delays).\n• Premium animations for editing and deleting transactions.\n• Seamless search bar transitions.",
            "info"
          );
          await AsyncStorage.setItem('last_seen_version', CURRENT_VERSION);
        }
      } catch (e) {
        console.warn("Error checking version:", e);
      }
    };

    checkVersion();
  }, [showAlert]);

  return null;
}

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

    
      if (Platform.OS === 'android') {
        NavigationBar.setPositionAsync('absolute');
        NavigationBar.setBehaviorAsync('overlay-swipe');
        NavigationBar.setBackgroundColorAsync('rgba(0,0,0,0)');
        NavigationBar.setButtonStyleAsync('light');
      }
    }
  }, [loaded, isAuthReady]);

  if (!loaded || !isAuthReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ThemeProvider value={DarkTheme}>
        <CurrencyProvider>
          <AlertProvider>
            <TransactionsProvider>
              <VersionChecker />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  contentStyle: { backgroundColor: Colors.background },
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
            </TransactionsProvider>
          </AlertProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
