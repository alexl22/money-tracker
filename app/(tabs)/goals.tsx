import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTabBar } from '../../context/TabBarContext';
import { horizontalScale, moderateScale } from '../../utils/scaling';
import { GoalsTab } from '../../components/GoalsTab';
import { LoansTab } from '../../components/LoansTab';
import { Colors } from '../../constants/DesignSystem';

export default function GoalsScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const toggleWidth = SCREEN_WIDTH - horizontalScale(48);
  const padding = horizontalScale(3);
  const tabWidth = (toggleWidth - padding * 2) / 2;

  const [viewMode, setViewMode] = useState<'loans' | 'goals'>('loans');
  const translateX = useSharedValue(0);

  const toggleView = (mode: 'loans' | 'goals') => {
    setViewMode(mode);
    translateX.value = withSpring(mode === 'loans' ? 0 : tabWidth, {
      stiffness: 400,
      damping: 30,
      mass: 0.5,
    });
  };

  const { tabBarOffset } = useTabBar();
  const lastScrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const deltaY = currentY - lastScrollY.value;

      if (currentY <= 0) {
        tabBarOffset.value = 0;
      } else if (deltaY > 2 && currentY > 10) {
        // Scroll Down -> Hide Tab Bar
        tabBarOffset.value = 150;
      } else if (deltaY < -2) {
        // Scroll Up -> Show Tab Bar
        tabBarOffset.value = 0;
      }
      lastScrollY.value = currentY;
    },
  });

  const animatedToggleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const localColors = {
    primary: Colors?.primary || '#6ee591',
    white: Colors?.white || '#FFFFFF',
    background: Colors?.background || '#131313',
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={styles.headerSpacer} />
        <View style={[styles.toggleContainer, { width: toggleWidth }]}>
          <Animated.View style={[styles.activeHighlight, { width: tabWidth - 6 }, animatedToggleStyle]} />
          <Pressable style={styles.toggleTab} onPress={() => toggleView('loans')}>
            <Text style={[styles.toggleText, viewMode === 'loans' && styles.toggleTextActive]}>LOANS</Text>
          </Pressable>
          <Pressable style={styles.toggleTab} onPress={() => toggleView('goals')}>
            <Text style={[styles.toggleText, viewMode === 'goals' && styles.toggleTextActive]}>GOALS</Text>
          </Pressable>
        </View>

        {viewMode === 'loans' ? (
          <LoansTab localColors={localColors} />
        ) : (
          <GoalsTab localColors={localColors} />
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c14',
  },
  scrollContent: {
    paddingHorizontal: horizontalScale(24),
  },
  headerSpacer: {
    height: horizontalScale(20),
  },
  toggleContainer: {
    height: horizontalScale(60),
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(9999),
    flexDirection: 'row',
    padding: horizontalScale(6),
    marginBottom: horizontalScale(32),
    position: 'relative',
    alignSelf: 'center',
  },
  activeHighlight: {
    position: 'absolute',
    top: horizontalScale(6),
    left: horizontalScale(6),
    height: horizontalScale(48),
    backgroundColor: '#3b82f6',
    borderRadius: moderateScale(9999),
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: horizontalScale(4) },
    shadowOpacity: 0.8,
    shadowRadius: moderateScale(15),
    elevation: 12,
  },
  toggleTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: moderateScale(14),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Manrope_700Bold',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
});