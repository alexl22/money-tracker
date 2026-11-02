import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { usePathname } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AppState, Dimensions, Keyboard, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBar } from '../../context/TabBarContext';
import { styles } from '../../styles/tabBar.styles';
import { horizontalScale, moderateScale } from '../../utils/scaling';

const { width } = Dimensions.get('window');

interface CustomTabBarProps extends BottomTabBarProps {
  onAddPress: () => void;
}

export function CustomTabBar({ state, descriptors, navigation, onAddPress }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const navBarWidth = width * 0.95;
  const padding = horizontalScale(10);
  const innerWidth = navBarWidth - padding;
  const tabWidth = innerWidth / 5;

  const indicatorWidth = tabWidth - horizontalScale(4);
  const indicatorHeight = horizontalScale(50);
  const centerOffset = (tabWidth - indicatorWidth) / 2 + padding / 2;

  const translateX = useSharedValue(state.index * tabWidth + centerOffset);

  const springConfig = {
    stiffness: 300,
    damping: 25,
    mass: 0.6,
  };

  useEffect(() => {
    const isSpeedEntry = state.routes[state.index].name === 'speedEntry';
    if (!isSpeedEntry) {
      translateX.value = withSpring(state.index * tabWidth + centerOffset, springConfig);
    }
  }, [state.index]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const { tabBarOffset } = useTabBar();

  // Reset tab bar offset to 0 (visible) whenever the active screen or tab index changes
  useEffect(() => {
    tabBarOffset.value = 0;
  }, [pathname, state.index]);

  // Reset tab bar offset to 0 when the app returns from background to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        tabBarOffset.value = 0;
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(tabBarOffset.value, { duration: 300 }) }],
    opacity: withTiming(tabBarOffset.value > 0 ? 0 : 1, { duration: 300 }),
  }));

  if (isKeyboardVisible) return null;

  return (
    <Animated.View style={[
      styles.tabBarContainer,
      animatedContainerStyle,
      { bottom: 5 + Math.max(insets.bottom, horizontalScale(10)) }
    ]}>
      <View style={styles.tabBarCapsule}>
        <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />

        <Animated.View style={[
          styles.tabIndicator,
          { width: indicatorWidth, height: indicatorHeight, borderRadius: indicatorHeight / 2 },
          animatedIndicatorStyle
        ]} />

        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              translateX.value = withSpring(index * tabWidth + centerOffset, springConfig);
              navigation.navigate(route.name);
            }
          };

          if (route.name === 'speedEntry') {
            return (
              <View key={route.key} style={{ width: tabWidth, alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity
                  onPress={onAddPress}
                  style={styles.customAddButton}
                >
                  <Plus color="#FFFFFF" size={moderateScale(24)} strokeWidth={3} />
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={{ width: tabWidth, alignItems: 'center', justifyContent: 'center', height: '100%' }}
            >
              {options.tabBarIcon && options.tabBarIcon({
                color: isFocused ? '#3b82f6' : 'rgba(255, 255, 255, 0.5)',
                focused: isFocused,
                size: moderateScale(24)
              })}
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}
