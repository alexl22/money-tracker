import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { router } from 'expo-router';
import {
  Bell, ChevronDown, ChevronsUpDown, Download,
  HelpCircle, Mail, RefreshCcw
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { generateAuditExport } from '../../components/settings/auditExportService';
import { CurrencyPickerModal } from '../../components/settings/CurrencyPickerModal';
import { DataManagementSection } from '../../components/settings/DataManagementSection';
import { PasswordSection } from '../../components/settings/PasswordSection';
import { clearAllUserLoans, clearAllUserTransactions, deleteAccountCascade } from '../../components/settings/userDataCleanup';
import { TimePickerModal } from '../../components/TimePickerModal';
import { WelcomeGuide } from '../../components/WelcomeGuide';
import { useAlert } from '../../context/AlertContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTabBar } from '../../context/TabBarContext';
import { auth, db } from '../../firebaseConfig';
import styles from '../../styles/settings.styles';
import { checkNotificationPermission, requestNotificationPermission, updateNotification } from '../../utils/notifications';
import { horizontalScale, moderateScale } from '../../utils/scaling';

export default function SettingsScreen() {
  const { currency, setCurrency, availableCurrencies, format, rates } = useCurrency();
  const [isCurrencyPickerVisible, setIsCurrencyPickerVisible] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [exportFormat, setExportFormat] = useState('PDF');
  const [syncTime, setSyncTime] = useState({ hours: 23, minutes: 0 });
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);
  const [isDataExpanded, setIsDataExpanded] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isGuideVisible, setIsGuideVisible] = useState(false);

  const [tempHours, setTempHours] = useState(23);
  const [tempMinutes, setTempMinutes] = useState(0);

  const { showAlert } = useAlert();
  const user = auth.currentUser;

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsSecurityExpanded(false);
        setIsDataExpanded(false);
        setIsCurrencyPickerVisible(false);
        setIsTimePickerVisible(false);
      };
    }, [])
  );
  const handleExportAudit = async () => {
    if (!user) return;

    setIsExporting(true);
    try {
      const { count } = await generateAuditExport({
        userId: user.uid,
        currency,
        rates,
        format,
        exportFormat,
        userName,
      });

      if (count === 0) {
        showAlert("No Data", "There are no transactions in your history to export.", "info");
      }
    } catch (error) {
      console.error("Export error:", error);
      showAlert("Export Failed", "We could not generate the report. Please try again.", "alert");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async (u: any) => {
      if (!u) {
        setUserName('');
        setUserEmail('');
        return;
      }

      setUserEmail(u.email || '');
      setUserName(u.displayName);


      if (!u.displayName)
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          const userData = userDoc.data();
          if (userDoc.exists()) {
            if (userData?.displayName) {
              setUserName(userData.displayName);
            }
          }
        } catch (error) {
          console.error("Error checking Firestore for name:", error);
        }
    };

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      fetchUserData(u);
    });

    const loadNotificationSettings = async () => {
      try {
        const savedEnabled = await AsyncStorage.getItem('notifications_enabled');
        const savedTime = await AsyncStorage.getItem('notifications_time');

        let isActuallyEnabled = savedEnabled !== null ? JSON.parse(savedEnabled) : false;

        if (isActuallyEnabled) {
          const hasPermission = await checkNotificationPermission();
          if (!hasPermission) {
            isActuallyEnabled = false;
            await AsyncStorage.setItem('notifications_enabled', JSON.stringify(false));
          }
        }

        setSyncEnabled(isActuallyEnabled);
        if (savedTime !== null) setSyncTime(JSON.parse(savedTime));
      } catch (e) {
        console.error('Failed to load notification settings', e);
      }
    };
    loadNotificationSettings();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      if (isCurrencyPickerVisible || isTimePickerVisible) {
        NavigationBar.setBackgroundColorAsync('rgba(0, 0, 0, 0.85)');
      } else {
        NavigationBar.setBackgroundColorAsync('rgba(0,0,0,0)');
      }
    }
  }, [isCurrencyPickerVisible, isTimePickerVisible]);

  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };



  const handleOpenTimePicker = () => {
    setTempHours(syncTime.hours);
    setTempMinutes(syncTime.minutes);
    setIsTimePickerVisible(true);
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
        tabBarOffset.value = 150;
      } else if (deltaY < -2) {
        tabBarOffset.value = 0;
      }
      lastScrollY.value = currentY;
    },
  });

  const handleSelectCurrency = async (code: string) => {
    await setCurrency(code);
    setIsCurrencyPickerVisible(false);
  };

  const handleSaveTime = async () => {
    const newTime = { hours: tempHours, minutes: tempMinutes };
    setSyncTime(newTime);
    setIsTimePickerVisible(false);

    try {
      await AsyncStorage.setItem('notifications_time', JSON.stringify(newTime));
      if (syncEnabled) {
        await updateNotification(true, newTime.hours, newTime.minutes);
      }
    } catch (e) {
      console.error("Failed to save notification time", e);
    }
  };

  const handleClearTransactions = () => {
    const user = auth.currentUser;
    if (!user) return;
    showAlert(
      "Clear Transactions",
      "Are you sure you want to permanently delete all your transactions? This cannot be undone.",
      "alert",
      async () => {
        try {
          await clearAllUserTransactions(user.uid);
          showAlert("Success", "All transactions have been deleted.", "success");
        } catch (error) {
          console.error("Clear transactions error:", error);
          showAlert("Error", "Could not clear transactions.", "alert");
        }
      },
      true
    );
  };

  const handleClearLoans = () => {
    const user = auth.currentUser;
    if (!user) return;
    showAlert(
      "Clear Loans",
      "Are you sure you want to permanently delete all your loans? This cannot be undone.",
      "alert",
      async () => {
        try {
          await clearAllUserLoans(user.uid);
          showAlert("Success", "All loans have been deleted.", "success");
        } catch (error) {
          console.error("Clear loans error:", error);
          showAlert("Error", "Could not clear loans.", "alert");
        }
      },
      true
    );
  };


  const deleteAccount = () => {
    const user = auth.currentUser;
    if (!user) return;
    showAlert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      "alert",
      async () => {
        try {
          await deleteAccountCascade(user.uid);
          router.replace("/login");
        } catch (error: any) {
          console.error("Error deleting account:", error);
          if (error.code === "auth/requires-recent-login") {
            showAlert("Error", "You need to login again to delete your account.", "alert");
            router.replace("/login");
          } else {
            showAlert("Error", "An error occurred while deleting your account.", "alert");
          }
        }
      },
      true
    );
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <Text style={styles.headerTitle}>Settings</Text>


        <View style={[styles.softCard, { height: undefined, paddingVertical: horizontalScale(24) }]}>
          <Text style={styles.softCardTitle}>Display Currency</Text>
          <TouchableOpacity
            style={styles.currencySelector}
            activeOpacity={0.7}
            onPress={() => setIsCurrencyPickerVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <RefreshCcw color="#3b82f6" size={moderateScale(20)} style={{ marginRight: horizontalScale(12) }} />
              <Text style={styles.currencySelectorText} >
                {currency}{currency === 'USD' ? ' - US Dollar' : currency === 'EUR' ? ' - Euro' : currency === 'RON' ? ' - Romanian Leu' : ''}
              </Text>
            </View>
            <ChevronsUpDown color="#3b82f6" size={moderateScale(18)} />
          </TouchableOpacity>
        </View>


        <View style={styles.sectionGroup}>

          <View style={styles.inputCard}>
            <View style={styles.inputIconCircle}>
              <Mail color="#3b82f6" size={20} />
            </View>
            <TextInput
              style={styles.inputText}
              value={userEmail}
              editable={false}
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </View>
        </View>

        <PasswordSection
          isExpanded={isSecurityExpanded}
          onToggle={() => setIsSecurityExpanded(!isSecurityExpanded)}
          styles={styles}
        />

        <View style={styles.softCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
                <Bell color="#3b82f6" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.softCardTitleNoMargin}>Notifications</Text>
                <TouchableOpacity
                  onPress={handleOpenTimePicker}
                  style={styles.timeTrigger}
                  activeOpacity={0.6}
                >
                  <Text style={styles.subTextActive}>Send at {formatTime(syncTime.hours, syncTime.minutes)}</Text>
                  <ChevronDown color="#3b82f6" size={14} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>
            <Switch
              value={syncEnabled}
              onValueChange={async (newValue) => {
                setSyncEnabled(newValue);

                try {
                  if (newValue) {
                    const { granted, canAskAgain } = await requestNotificationPermission();
                    if (granted) {
                      await AsyncStorage.setItem('notifications_enabled', JSON.stringify(true));
                      await updateNotification(true, syncTime.hours, syncTime.minutes);
                    } else {
                      setSyncEnabled(false);
                      await AsyncStorage.setItem('notifications_enabled', JSON.stringify(false));

                      if (!canAskAgain) {
                        showAlert(
                          "Permissions Required",
                          "Notifications are blocked in system settings. Tap 'Confirm' to open settings and enable them manually.",
                          "alert",
                          () => Linking.openSettings(),
                          true
                        );
                      }
                    }
                  } else {
                    await AsyncStorage.setItem('notifications_enabled', JSON.stringify(false));
                    await updateNotification(false, 0, 0);
                  }
                } catch (e) {
                  console.error("Notification toggle failed", e);
                }
              }}
              trackColor={{ false: '#2C2C2E', true: '#3b82f6' }}
              thumbColor={syncEnabled ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        <TimePickerModal
          isVisible={isTimePickerVisible}
          onClose={() => setIsTimePickerVisible(false)}
          onSave={handleSaveTime}
          tempHours={tempHours}
          tempMinutes={tempMinutes}
          setTempHours={setTempHours}
          setTempMinutes={setTempMinutes}
          styles={styles}
        />

        <WelcomeGuide
          visible={isGuideVisible}
          onClose={() => setIsGuideVisible(false)}
        />

        <TouchableOpacity
          style={styles.softCard}
          onPress={handleExportAudit}
          disabled={isExporting}
          activeOpacity={0.7}
        >
          {isExporting && (
            <View style={{ position: 'absolute', right: horizontalScale(16), top: horizontalScale(16), zIndex: 10 }}>
              <ActivityIndicator color="#3b82f6" size="small" />
            </View>
          )}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
                <Download color="#3b82f6" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={styles.softCardTitleNoMargin}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  Audit Export
                </Text>
                <Text style={styles.subText} numberOfLines={1}>Generate Report</Text>
              </View>
            </View>
            <View
              style={styles.segmentedToggle}
              onStartShouldSetResponder={() => true}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <TouchableOpacity
                style={[styles.toggleOption, exportFormat === 'PDF' && styles.toggleOptionActive]}
                onPress={(e) => { e.stopPropagation(); setExportFormat('PDF'); }}
              >
                <Text style={[styles.toggleText, exportFormat === 'PDF' && styles.toggleTextActive]}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOption, exportFormat === 'CSV' && styles.toggleOptionActive]}
                onPress={(e) => { e.stopPropagation(); setExportFormat('CSV'); }}
              >
                <Text style={[styles.toggleText, exportFormat === 'CSV' && styles.toggleTextActive]}>CSV</Text>
              </TouchableOpacity>
            </View>
          </View>

        </TouchableOpacity>

        <DataManagementSection
          isExpanded={isDataExpanded}
          onToggle={() => setIsDataExpanded(!isDataExpanded)}
          onClearTransactions={handleClearTransactions}
          onClearLoans={handleClearLoans}
          styles={styles}
        />

        <TouchableOpacity
          style={styles.softCard}
          activeOpacity={0.7}
          onPress={() => setIsGuideVisible(true)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <HelpCircle color="#3b82f6" size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.softCardTitleNoMargin}>How to use</Text>
                <Text style={[styles.subText, { marginTop: 2 }]}>View the quick start guide</Text>
              </View>
            </View>
            <ChevronDown color="rgba(255,255,255,0.3)" size={20} style={{ transform: [{ rotate: '-90deg' }] }} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={deleteAccount}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteAccountText}>DELETE ACCOUNT</Text>
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.footerLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <View style={styles.footerDot} />
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.footerLinkText}>Terms of Use</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>
          v1.1.0
        </Text>

        <View style={{ height: 120 }} />

      </Animated.ScrollView>

      <CurrencyPickerModal
        isVisible={isCurrencyPickerVisible}
        onClose={() => setIsCurrencyPickerVisible(false)}
        currencies={availableCurrencies}
        currentCurrency={currency}
        onSelectCurrency={handleSelectCurrency}
        styles={styles}
      />

    </View>
  );
}
