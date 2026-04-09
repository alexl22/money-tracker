import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { updatePassword } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { Bell, Check, ChevronDown, ChevronsUpDown, Database, Download, Eye, EyeOff, Lock, Mail, RefreshCcw, Search, Shield, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { TimePickerModal } from '../../components/TimePickerModal';
import { useAlert } from '../../context/AlertContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTabBar } from '../../context/TabBarContext';
import { auth, db, } from '../../firebaseConfig';
import { exportToCSV, exportToPDF } from '../../utils/export';
import { updateNotification } from '../../utils/notifications';
import { horizontalScale, moderateScale } from '../../utils/scaling';
import styles from './_styles/settings.styles';

export default function SettingsScreen() {
  const { currency, setCurrency, availableCurrencies, format } = useCurrency();
  const [isCurrencyPickerVisible, setIsCurrencyPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [exportFormat, setExportFormat] = useState('CSV');
  const [syncTime, setSyncTime] = useState({ hours: 23, minutes: 0 });
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);
  const [isDataExpanded, setIsDataExpanded] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Temporary selection state for the modal
  const [tempHours, setTempHours] = useState(23);
  const [tempMinutes, setTempMinutes] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { showAlert } = useAlert();

  const handleExportAudit = async () => {
    if (!auth.currentUser) return;

    setIsExporting(true);
    try {
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title || 'Untitled',
          amount: d.amount || 0,
          type: d.type || 'expense',
          notes: d.notes || '',
          category: d.category || 'General',
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt || Date.now()),
        };
      });

      if (data.length === 0) {
        showAlert("No Data", "There are no transactions in your history to export.", "info");
        return;
      }

      if (exportFormat === 'CSV') {
        await exportToCSV(data, format);
      } else {
        await exportToPDF(data, format, userName);
      }
    } catch (error) {
      console.error("Export error:", error);
      showAlert("Export Failed", "We could not generate the report. Please try again.", "alert");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async (user: any) => {
      if (!user) {
        setUserName('');
        setUserEmail('');
        return;
      }

      setUserEmail(user.email || '');
      setUserName(user.displayName);


      if (!user.displayName)
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.displayName) {
              setUserName(data.displayName);
            }
          }
        } catch (error) {
          console.error("Error checking Firestore for name:", error);
        }
    };

    const unsubscribe = auth.onAuthStateChanged((u) => {
      fetchUserData(u);
    });

    // Load Notification Settings
    const loadNotificationSettings = async () => {
      try {
        const savedEnabled = await AsyncStorage.getItem('notifications_enabled');
        const savedTime = await AsyncStorage.getItem('notifications_time');

        if (savedEnabled !== null) setSyncEnabled(JSON.parse(savedEnabled));
        if (savedTime !== null) setSyncTime(JSON.parse(savedTime));
      } catch (e) {
        console.error('Failed to load notification settings', e);
      }
    };
    loadNotificationSettings();

    return () => unsubscribe();
  }, []);

  // Save and Update Notifications
  useEffect(() => {
    const persistAndSchedule = async () => {
      try {
        await AsyncStorage.setItem('notifications_enabled', JSON.stringify(syncEnabled));
        await AsyncStorage.setItem('notifications_time', JSON.stringify(syncTime));

        await updateNotification(syncEnabled, syncTime.hours, syncTime.minutes);
      } catch (e) {
        console.error('Failed to update notifications', e);
      }
    };
    persistAndSchedule();
  }, [syncEnabled, syncTime]);


  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleUpdatePassword = () => {
    if (newPassword !== confirmPassword) {
      showAlert("Password Error", "Your passwords do not match. Please try again.", "alert");
      return;
    }
    if (newPassword.length < 6) {
      showAlert("Security Notice", "Your password must be at least 6 characters long for better protection.", "alert");
      return;
    }
    if (auth.currentUser) {
      updatePassword(auth.currentUser, newPassword);
      showAlert("Updated Successfully", "Your security credentials have been successfully updated.", "success");
      setNewPassword('');
      setConfirmPassword('');
    }
  }

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
        // Scroll Down -> Hide Tab Bar (More sensitive)
        tabBarOffset.value = 150;
      } else if (deltaY < -2) {
        // Scroll Up -> Show Tab Bar (More sensitive)
        tabBarOffset.value = 0;
      }
      lastScrollY.value = currentY;
    },
  });

  const handleSelectCurrency = async (code: string) => {
    await setCurrency(code);
    setIsCurrencyPickerVisible(false);
    setSearchQuery('');
  };

  const filteredCurrencies = availableCurrencies.filter(c =>
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveTime = () => {
    setSyncTime({ hours: tempHours, minutes: tempMinutes });
    setIsTimePickerVisible(false);
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
          const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          for (const document of snapshot.docs) {
            await deleteDoc(doc(db, 'transactions', document.id));
          }
          showAlert("Success", "All transactions have been deleted.", "success");
        } catch (error) {
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
          const q = query(collection(db, 'loans'), where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          for (const document of snapshot.docs) {
            await deleteDoc(doc(db, 'loans', document.id));
          }
          showAlert("Success", "All loans have been deleted.", "success");
        } catch (error) {
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
          const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
          const transactionsSnapshot = await getDocs(transactionsQuery);
          for (const document of transactionsSnapshot.docs) {
            await deleteDoc(doc(db, 'transactions', document.id));
          }
          const loansQuerry = query(collection(db, 'loans'), where('userId', '==', user.uid));
          const loansSnapshot = await getDocs(loansQuerry);
          for (const document of loansSnapshot.docs) {
            await deleteDoc(doc(db, 'loans', document.id));
          }
          const goalsQuerry = query(collection(db, 'goals'), where('userId', '==', user.uid));
          const goalsSnapshot = await getDocs(goalsQuerry);
          for (const document of goalsSnapshot.docs) {
            await deleteDoc(doc(db, 'goals', document.id));
          }
          await deleteDoc(doc(db, "users", user.uid)).catch(() => { });
          await user.delete();
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

  }



  return (
    <View style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <Text style={styles.headerTitle}>Settings</Text>

        {/* Display Currency Section */}
        <View style={[styles.softCard, { height: undefined, paddingVertical: horizontalScale(24) }]}>
          <Text style={styles.softCardTitle}>Display Currency</Text>
          <TouchableOpacity
            style={styles.currencySelector}
            activeOpacity={0.7}
            onPress={() => setIsCurrencyPickerVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <RefreshCcw color="#3b82f6" size={moderateScale(20)} style={{ marginRight: horizontalScale(12) }} />
              <Text style={styles.currencySelectorText}>
                {currency}{currency === 'USD' ? ' - US Dollar' : currency === 'EUR' ? ' - Euro' : currency === 'RON' ? ' - Romanian Leu' : ''}
              </Text>
            </View>
            <ChevronsUpDown color="#3b82f6" size={moderateScale(18)} />
          </TouchableOpacity>
        </View>


        <View style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>EMAIL ADDRESS</Text>
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



        {/* Security Section */}
        <View style={styles.securityWrapper}>
          <TouchableOpacity
            style={[styles.actionCard, isSecurityExpanded && styles.actionCardExpanded]}
            onPress={() => setIsSecurityExpanded(!isSecurityExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.actionCardLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Shield color="#3b82f6" size={20} />
              </View>
              <Text style={styles.actionCardTitle}>Password</Text>
            </View>
            <View style={{ transform: [{ rotate: isSecurityExpanded ? '180deg' : '0deg' }] }}>
              <ChevronDown color="rgba(255,255,255,0.4)" size={20} />
            </View>
          </TouchableOpacity>

          {isSecurityExpanded && (
            <View style={styles.securityDropdown}>
              <View style={styles.innerSectionGroup}>
                <Text style={styles.innerSectionLabel}>NEW PASSWORD</Text>
                <View style={styles.inputCard}>
                  <View style={styles.inputIconCircle}>
                    <Lock color="rgba(255,255,255,0.6)" size={16} />
                  </View>
                  <TextInput
                    style={styles.innerTextInput}
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholderTextColor="rgba(255,255,255,0.1)"
                    secureTextEntry={!showPasswords}
                  />
                  <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)}>
                    {showPasswords ? <EyeOff color="#3b82f6" size={18} /> : <Eye color="rgba(255,255,255,0.3)" size={18} />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.innerSectionGroup}>
                <Text style={styles.innerSectionLabel}>CONFIRM PASSWORD</Text>
                <View style={styles.inputCard}>
                  <View style={styles.inputIconCircle}>
                    <Check color="rgba(255,255,255,0.6)" size={16} />
                  </View>
                  <TextInput
                    style={styles.innerTextInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Repeat new password"
                    placeholderTextColor="rgba(255,255,255,0.1)"
                    secureTextEntry={!showPasswords}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.updatePasswordBtn}
                onPress={handleUpdatePassword}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.updatePasswordGradient}
                >
                  <Text style={styles.updatePasswordBtnText}>Update Password</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>



        {/* Notifications Section */}
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
              onValueChange={setSyncEnabled}
              trackColor={{ false: '#2C2C2E', true: '#3b82f6' }}
              thumbColor={syncEnabled ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Time Picker Modal */}
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

        {/* Information Export Section */}
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
                <Text style={styles.softCardTitleNoMargin}>Audit Export</Text>
                <Text style={styles.subText}>Generate Report (${exportFormat})</Text>
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

        {/* Data Management Section */}
        <View style={styles.securityWrapper}>
          <TouchableOpacity
            style={[styles.actionCard, isDataExpanded && styles.actionCardExpanded]}
            onPress={() => setIsDataExpanded(!isDataExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.actionCardLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
                <Database color="#3b82f6" size={20} />
              </View>
              <Text style={styles.actionCardTitle}>Data Management</Text>
            </View>
            <View style={{ transform: [{ rotate: isDataExpanded ? '180deg' : '0deg' }] }}>
              <ChevronDown color="rgba(255,255,255,0.4)" size={20} />
            </View>
          </TouchableOpacity>

          {isDataExpanded && (
            <View style={styles.securityDropdown}>
              <TouchableOpacity
                style={[styles.actionCard, { marginTop: 0, height: horizontalScale(60), borderColor: 'rgba(239, 68, 68, 0.2)' }]}
                onPress={handleClearTransactions}
                activeOpacity={0.7}
              >
                <View style={styles.actionCardLeft}>
                  <View style={[styles.iconCircle, { width: 36, height: 36, backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                    <Trash2 color="#ef4444" size={16} />
                  </View>
                  <Text style={[styles.actionCardTitle, { fontSize: moderateScale(14) }]}>Clear All Transactions</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { marginTop: 0, marginBottom: 0, height: horizontalScale(60), borderColor: 'rgba(239, 68, 68, 0.2)' }]}
                onPress={handleClearLoans}
                activeOpacity={0.7}
              >
                <View style={styles.actionCardLeft}>
                  <View style={[styles.iconCircle, { width: 36, height: 36, backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                    <Trash2 color="#ef4444" size={16} />
                  </View>
                  <Text style={[styles.actionCardTitle, { fontSize: moderateScale(14) }]}>Clear All Loans</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>



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

        <View style={{ height: 120 }} />





      </Animated.ScrollView>

      {/* Currency Selection Modal */}
      <Modal
        visible={isCurrencyPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCurrencyPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsCurrencyPickerVisible(false)}
        >
          <View style={[styles.timePickerContent, { height: '80%', borderTopLeftRadius: 36, borderTopRightRadius: 36 }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalLabel}>SELECT PREFERENCE</Text>
                <Text style={styles.modalTitleText}>Currency</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCurrencyPickerVisible(false)}
                style={styles.closeBtn}
              >
                <X color="rgba(255,255,255,0.4)" size={20} />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputCard, { marginBottom: 20, height: 56, borderRadius: 16 }]}>
              <Search color="#3b82f6" size={18} style={{ marginRight: 12 }} />
              <TextInput
                style={[styles.inputText, { fontSize: 14 }]}
                placeholder="Search currency code..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="characters"
              />
            </View>

            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    { height: 64, marginBottom: 12, marginTop: 0 },
                    currency === item && { borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)' }
                  ]}
                  onPress={() => handleSelectCurrency(item)}
                >
                  <View style={styles.actionCardLeft}>
                    <View style={[styles.iconCircle, { width: 36, height: 36, backgroundColor: currency === item ? '#3b82f6' : 'rgba(255,255,255,0.05)' }]}>
                      <Text style={{ color: currency === item ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>
                        {item.substring(0, 1)}
                      </Text>
                    </View>
                    <Text style={[styles.actionCardTitle, currency === item && { color: '#3b82f6' }]}>{item}</Text>
                  </View>
                  {currency === item && <Check color="#3b82f6" size={20} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}


