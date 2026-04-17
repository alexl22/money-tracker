import { Colors } from '@/constants/DesignSystem';
import { BlurView } from 'expo-blur';
import { Tabs, useRouter } from 'expo-router';
// Removed firebase/firestore import for native SDK migration
import { ArrowRightLeft, History, LayoutGrid, LogOut, Plus, Settings, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { TabBarProvider, useTabBar } from '../../context/TabBarContext';
import { auth, db, signOutUser } from '../../firebaseConfig';
import { horizontalScale, moderateScale } from '../../utils/scaling';
import { TransactionModal } from './speedEntry';
const { width } = Dimensions.get('window');

export default function TabLayout() {
  const router = useRouter();
  const [userName, setUserName] = useState(auth.currentUser?.email?.split('@')[0] || 'User');

  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await db.collection('users').doc(user.uid).get();
          if (userDoc.exists() && userDoc.data()?.displayName) {
            setUserName(userDoc.data()?.displayName);
          }
        } catch (error) {
          console.error("Error fetching name:", error);
        }
      }
    };

    fetchUserName();

    // Also listen for auth changes to re-fetch if user changes
    const unsubscribe = auth.onAuthStateChanged((u: any) => {
      if (u) fetchUserName();
      else setUserName('User');
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOutUser();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };


  const [isModalVisible, setIsModalVisible] = useState(false);

  const CustomTabBar = ({ state, descriptors, navigation }: any) => {
    const navBarWidth = width * 0.95;
    const padding = horizontalScale(10); // total horizontal padding of the capsule
    const innerWidth = navBarWidth - padding;
    const tabWidth = innerWidth / 5;

    // We want the indicator to be slightly smaller than the tab area
    const indicatorWidth = tabWidth - horizontalScale(4);
    const indicatorHeight = horizontalScale(50);
    const centerOffset = (tabWidth - indicatorWidth) / 2 + padding / 2;

    const translateX = useSharedValue(state.index * tabWidth + centerOffset);
    // Fixed: Removed the local signOut that was causing infinite recursion and scoping issues.


    useEffect(() => {
      const isSpeedEntry = state.routes[state.index].name === 'speedEntry';
      if (!isSpeedEntry) {
        translateX.value = withSpring(state.index * tabWidth + centerOffset, {
          stiffness: 400,
          damping: 30,
          mass: 0.5,
        });
      }
    }, [state.index]);

    const animatedIndicatorStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    const { tabBarOffset } = useTabBar();

    const animatedContainerStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: withTiming(tabBarOffset.value, { duration: 300 }) }],
      // Optional: add opacity fade for an extra touch of premium
      opacity: withTiming(tabBarOffset.value > 0 ? 0 : 1, { duration: 300 }),
    }));

    return (
      <Animated.View style={[styles.tabBarContainer, animatedContainerStyle]}>
        <View style={styles.tabBarCapsule}>
          <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />

          {/* Animated Indicator */}
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
                navigation.navigate(route.name);
              }
            };

            // Custom logic for the center "Add" button
            if (route.name === 'speedEntry') {
              return (
                <View key={route.key} style={{ width: tabWidth, alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity
                    onPress={() => setIsModalVisible(true)}
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
  };

  return (
    <TabBarProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: true,
            header: () => (
              <SafeAreaView style={{ backgroundColor: Colors.background }}>
                <View style={styles.customHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      <User color={Colors.white} size={moderateScale(16)} />
                    </View>
                    <Text style={styles.userName}>{userName}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                  >
                    <LogOut color="rgba(255,255,255,0.6)" size={moderateScale(20)} />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            ),
          }}>

          <Tabs.Screen
            name="home"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color }) => <LayoutGrid color={color} size={24} />,
            }}
          />

          <Tabs.Screen
            name="history"
            options={{
              title: 'History',
              tabBarIcon: ({ color }) => <History color={color} size={24} />,
            }}
          />

          <Tabs.Screen
            name="speedEntry"
            options={{
              title: 'Add'
            }}
          />

          <Tabs.Screen
            name="goals"
            options={{
              title: 'Transfer',
              tabBarIcon: ({ color }) => <ArrowRightLeft color={color} size={22} strokeWidth={2.5} />,
            }}
          />

          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color }) => <Settings color={color} size={moderateScale(24)} />,
            }}
          />
        </Tabs>

        <TransactionModal
          isVisible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
        />
      </View>
    </TabBarProvider>
  );
}

const styles = StyleSheet.create({
  // Custom Tab Bar Styles
  tabBarContainer: {
    position: 'absolute',
    bottom: horizontalScale(25),
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarCapsule: {
    flexDirection: 'row',
    width: width * 0.95,
    height: horizontalScale(70),
    borderRadius: moderateScale(35),
    backgroundColor: 'rgba(28, 29, 31, 0.8)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(5),
  },
  tabIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  customAddButton: {
    width: horizontalScale(63),
    height: horizontalScale(63),
    borderRadius: moderateScale(40),
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: horizontalScale(8) },
    shadowOpacity: 0.5,
    shadowRadius: moderateScale(12),
    elevation: 12,
  },
  centerButtonContainer: {
    top: horizontalScale(-10),
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  centerButton: {
    width: horizontalScale(60),
    height: horizontalScale(60),
    borderRadius: moderateScale(30),
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: `0px ${horizontalScale(8)}px ${horizontalScale(24)}px rgba(59, 130, 246, 0.5)`,
    elevation: 10,
  },
  customHeader: {
    height: horizontalScale(90),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: horizontalScale(24),
    backgroundColor: '#0b0c14ff',
    paddingTop: horizontalScale(15),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: horizontalScale(12),
  },
  userAvatar: {
    width: horizontalScale(32),
    height: horizontalScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: moderateScale(18),
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
