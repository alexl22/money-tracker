import { Colors } from '@/constants/DesignSystem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { Tabs, usePathname, useRouter } from 'expo-router';
import {
  Goal,
  History, LayoutGrid, LogOut,
  Search, Settings, User, X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomTabBar } from '../../components/navigation/CustomTabBar';
import { TransactionModal } from '../../components/transactions/TransactionModal(+)';
import { WelcomeGuide } from '../../components/WelcomeGuide';
import { useAlert } from '../../context/AlertContext';
import { TabBarProvider } from '../../context/TabBarContext';
import { useTransactions } from '../../context/TransactionsContext';
import { auth, db, signOutUser } from '../../firebaseConfig';
import { horizontalScale, moderateScale } from '../../utils/scaling';


export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState(auth.currentUser?.email?.split('@')[0] || 'User');
  const { showAlert } = useAlert();

  const [isWelcomeVisible, setIsWelcomeVisible] = useState(false);
  const { searchQuery, setSearchQuery, isSearching, setIsSearching } = useTransactions();

  useEffect(() => {
    const checkFirstTime = async () => {
      const hasSeen = await AsyncStorage.getItem('hasSeenGuide');
      if (!hasSeen) {
        setIsWelcomeVisible(true);
      }
    };
    checkFirstTime();
  }, []);



  useEffect(() => {
    const fetchUserName = async (u: any) => {
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data?.displayName) {
              setUserName(data.displayName);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    if (auth.currentUser) fetchUserName(auth.currentUser);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) fetchUserName(u);
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

  return (
    <TabBarProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} onAddPress={() => setIsModalVisible(true)} />}
          screenOptions={{
            headerShown: true,
            header: () => (
              <View style={[styles.customHeader, { paddingTop: Math.max(insets.top, horizontalScale(15)) }]}>
                {isSearching ? (
                  <Animated.View
                    entering={FadeInDown.springify().stiffness(450).damping(38).mass(0.8)}
                    style={styles.searchHeaderContainer}
                  >
                    <Search color="rgba(255,255,255,0.4)" size={moderateScale(18)} strokeWidth={2.5} />
                    <TextInput
                      style={styles.searchHeaderInput}
                      placeholder="Search transactions..."
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus={true}
                      autoCorrect={false}
                      returnKeyType="search"
                    />
                    <TouchableOpacity
                      style={styles.searchHeaderClose}
                      onPress={() => {
                        setIsSearching(false);
                        setSearchQuery('');
                      }}
                    >
                      <X color="rgba(255,255,255,0.6)" size={moderateScale(20)} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </Animated.View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.userInfo}
                      onPress={() => router.push('/settings')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.userAvatar}>
                        <User color={Colors.white} size={moderateScale(20)} />
                      </View>
                      <Text style={styles.userName} numberOfLines={1}>
                        {userName.charAt(0).toUpperCase() + userName.slice(1)}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.headerRightButtons}>
                      <TouchableOpacity
                        style={styles.searchButton}
                        onPress={() => {
                          if (pathname !== '/history') {
                            router.push({ pathname: '/history', params: { search: 'true' } });
                          } else {
                            setIsSearching(true);
                          }
                        }}
                      >
                        <Search color="rgba(255,255,255,0.6)" size={moderateScale(20)} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={() => showAlert("Logout", "Are you sure you want to logout?", "alert", handleLogout, true)}
                      >
                        <LogOut color="rgba(255,255,255,0.6)" size={moderateScale(20)} />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
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
              title: 'Targets',
              tabBarIcon: ({ color }) => <Goal color={color} size={22} strokeWidth={2.5} />,
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
        <WelcomeGuide
          visible={isWelcomeVisible}
          onClose={() => setIsWelcomeVisible(false)}
        />
      </View>
    </TabBarProvider>
  );
}

const styles = StyleSheet.create({


  customHeader: {
    height: horizontalScale(80),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: horizontalScale(24),
    backgroundColor: Colors.background,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: horizontalScale(12),
  },
  userAvatar: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255,255,255,0.05)',
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
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: horizontalScale(12),
  },
  searchButton: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchHeaderContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    height: horizontalScale(46),
    borderRadius: moderateScale(23),
    paddingHorizontal: horizontalScale(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchHeaderInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(15),
    height: '100%',
    marginLeft: horizontalScale(8),
    paddingVertical: 0,
  },
  searchHeaderClose: {
    padding: horizontalScale(4),
  },
});
