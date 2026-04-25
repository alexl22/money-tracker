import { DatePicker } from '../../components/DatePicker';
import MonthYearPicker, { LUNI } from '../../components/MonthYearPicker';
import { collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { Calendar, ChevronDown, Receipt, Wallet } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAlert } from '../../context/AlertContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTabBar } from '../../context/TabBarContext';
import { auth, db } from '../../firebaseConfig';
import { horizontalScale, moderateScale } from '../../utils/scaling';

export default function DashboardScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const toggleWidth = SCREEN_WIDTH - horizontalScale(48);
  const padding = horizontalScale(6);
  const tabWidth = (toggleWidth - padding * 2) / 3;

  const [viewMode, setViewMode] = useState<'lifetime' | 'month' | 'range'>('lifetime');
  const translateX = useSharedValue(0);

  const toggleView = (mode: 'lifetime' | 'month' | 'range') => {
    setViewMode(mode);
    let targetX = 0;
    if (mode === 'month') targetX = tabWidth;
    if (mode === 'range') targetX = tabWidth * 2;
    translateX.value = withSpring(targetX, { damping: 30, stiffness: 400, mass: 0.5 });
  };
  const { currency, format, rates } = useCurrency();
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

  const animatedToggleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const cardWidth = Math.floor((SCREEN_WIDTH - horizontalScale(48) - horizontalScale(16)) / 2);

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [averageIncome, setAverageIncome] = useState(0);
  const [averageExpenses, setAverageExpenses] = useState(0);
  const { showAlert } = useAlert();
  const user = auth.currentUser;


  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  // Range-specific state
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(currentDate.getDate() - 7);
  const [rangeStart, setRangeStart] = useState(sevenDaysAgo);
  const [rangeEnd, setRangeEnd] = useState(currentDate);
  const [isRangePickerVisible, setIsRangePickerVisible] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        handleSnapshot(snapshot);
      }, (error) => {
        console.error("Firestore Error:", error);
      });

    function handleSnapshot(snapshot: any) {
      let currentTotalIncome = 0;
      let currentTotalExpenses = 0;
      let earliestDate = new Date();
      let hasTransactions = false;

      snapshot.forEach((doc: any) => {
        const data = doc.data();
        let transactionDate: Date;

        // Unified date handling for both SDKs
        const rawDate = data.date || data.createdAt;
        if (rawDate && typeof rawDate.toDate === 'function') {
          transactionDate = rawDate.toDate();
        } else if (rawDate instanceof Date) {
          transactionDate = rawDate;
        } else if (rawDate) {
          transactionDate = new Date(rawDate);
        } else {
          transactionDate = new Date();
        }

        if (!hasTransactions || transactionDate < earliestDate) {
          earliestDate = transactionDate;
          hasTransactions = true;
        }

        const matchesFilter = viewMode === 'lifetime' ||
          (viewMode === 'month' && transactionDate.getMonth().toString() === selectedMonth && transactionDate.getFullYear() === selectedYear) ||
          (viewMode === 'range' && transactionDate >= rangeStart && transactionDate <= rangeEnd);

        const valueToSum = (data.currency === currency)
          ? data.amount
          : ((data.amountUSD || (data.amount / (rates?.[data.currency] || 1))) * (rates?.[currency] || 1));

        if (matchesFilter) {
          if (data.type === 'income') {
            currentTotalIncome += valueToSum;
          } else {
            currentTotalExpenses += valueToSum;
          }
        }
      });

      setTotalIncome(currentTotalIncome);
      setTotalExpenses(currentTotalExpenses);

      if (viewMode === 'month') {
        const daysInSelectedMonth = new Date(selectedYear, parseInt(selectedMonth) + 1, 0).getDate();
        setAverageIncome(currentTotalIncome / daysInSelectedMonth);
        setAverageExpenses(currentTotalExpenses / daysInSelectedMonth);
      } else {
        const now = new Date();
        const startYear = earliestDate.getFullYear();
        const startMonth = earliestDate.getMonth();
        const currentYearLocal = now.getFullYear();
        const currentMonthLocal = now.getMonth();
        const monthsDiff = hasTransactions ? (currentYearLocal - startYear) * 12 + (currentMonthLocal - startMonth) + 1 : 1;
        setAverageIncome(currentTotalIncome / monthsDiff);
        setAverageExpenses(currentTotalExpenses / monthsDiff);
      }
    }

    return () => unsubscribe && unsubscribe();
  }, [viewMode, selectedMonth, selectedYear, rangeStart, rangeEnd, currency, user]);


  return (
    <View style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >

        {/* Animated Toggle Controls */}
        <View style={[styles.toggleContainer, { width: toggleWidth }]}>
          <Animated.View style={[styles.activeHighlight, { width: tabWidth }, animatedToggleStyle]} />
          <Pressable
            style={styles.toggleTab}
            onPress={() => toggleView('lifetime')}
          >
            <Text style={[styles.toggleText, viewMode === 'lifetime' && styles.toggleTextActive]}>
              LIFE
            </Text>
          </Pressable>
          <Pressable
            style={styles.toggleTab}
            onPress={() => toggleView('month')}
          >
            <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextActive]}>
              MONTH
            </Text>
          </Pressable>
          <Pressable
            style={styles.toggleTab}
            onPress={() => toggleView('range')}
          >
            <Text style={[styles.toggleText, viewMode === 'range' && styles.toggleTextActive]}>
              RANGE
            </Text>
          </Pressable>
        </View>

        {/* Date Selector (Only shown on Monthly mode) */}
        {viewMode === 'month' && (
          <View style={styles.dateSelectorContainer}>
            <Pressable
              style={styles.dateSelector}
              onPress={() => setIsPickerVisible(true)}
            >
              <View style={styles.calendarIconContainer}>
                <Calendar color="#3b82f6" size={20} fill="rgba(59, 130, 246, 0.1)" strokeWidth={2.5} />
              </View>
              <Text style={styles.dateSelectorText}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
                {LUNI.find(l => l.value === selectedMonth)?.label} {selectedYear}
              </Text>
              <View style={styles.chevronIconContainer}>
                <ChevronDown color="#3b82f6" size={18} strokeWidth={2.5} />
              </View>
            </Pressable>
          </View>
        )}

        {/* Range Selector */}
        {viewMode === 'range' && (
          <View style={styles.dateSelectorContainer}>
            <Pressable
              style={styles.dateSelector}
              onPress={() => setIsRangePickerVisible(true)}
            >
              <View style={styles.calendarIconContainer}>
                <Calendar color="#3b82f6" size={20} fill="rgba(59, 130, 246, 0.1)" strokeWidth={2.5} />
              </View>
              <Text 
                style={styles.dateSelectorText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {rangeStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {rangeEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </Text>
              <View style={styles.chevronIconContainer}>
                <ChevronDown color="#3b82f6" size={18} strokeWidth={2.5} />
              </View>
            </Pressable>
          </View>
        )}

        <View style={styles.summaryContainer}>
          {/* Card 1: Total Income */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => showAlert('Total Income Details', `Total: ${format(totalIncome, { isConverted: true })}\n${viewMode === 'month' ? 'Daily' : 'Monthly'}: ${format(averageIncome, { isConverted: true })}`, 'info')}
            style={styles.largeCard}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Wallet color="#10b981" size={22} strokeWidth={2.5} />
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statColumn}>
                <Text style={styles.cardLabel}>TOTAL INCOME</Text>
                <Text
                  style={[styles.cardAmount, { color: '#10b981' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {format(totalIncome, { compact: true, isConverted: true })}
                </Text>
              </View>

              <View style={styles.vDivider} />

              <View style={styles.statColumn}>
                <Text style={styles.footerLabel}>{viewMode === 'month' ? 'Daily' : 'Monthly'}</Text>
                <Text
                  style={[styles.footerValue, { color: '#10b981' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {format(averageIncome, { compact: true, isConverted: true })}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 2: Total Expenses */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => showAlert('Total Expenses Details', `Total: ${format(totalExpenses, { isConverted: true })}\n${viewMode === 'month' ? 'Daily' : 'Monthly'}: ${format(averageExpenses, { isConverted: true })}`, 'info')}
            style={styles.largeCard}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(235, 86, 86, 0.1)' }]}>
                <Receipt color="#eb5656" size={22} strokeWidth={2.5} />
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statColumn}>
                <Text style={styles.cardLabel}>TOTAL EXPENSES</Text>
                <Text
                  style={[styles.cardAmount, { color: '#eb5656' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {format(totalExpenses, { compact: true, isConverted: true })}
                </Text>
              </View>

              <View style={styles.vDivider} />

              <View style={styles.statColumn}>
                <Text style={styles.footerLabel}>{viewMode === 'month' ? 'Daily' : 'Monthly'}</Text>
                <Text
                  style={[styles.footerValue, { color: '#eb5656' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {format(averageExpenses, { compact: true, isConverted: true })}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => showAlert(viewMode === 'lifetime' ? 'Total Profit Details' : 'Period Profit Details', `Period Profit: ${format(totalIncome - totalExpenses, { isConverted: true, showSign: true })}`, 'info')}
          style={styles.totalBalanceCard}
        >
          <View style={styles.totalBalanceHeader}>
            <Text style={[styles.totalBalanceLabel, { color: '#ffffffc7', opacity: 0.8 }]}>
              {viewMode === 'lifetime' ? 'TOTAL PROFIT' : 'PERIOD PROFIT'}
            </Text>
          </View>
          <Text
            style={[styles.totalBalanceAmount, { color: (totalIncome - totalExpenses) >= 0 ? '#10b981' : '#eb5656' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {format(totalIncome - totalExpenses, { compact: true, isConverted: true, showSign: true })}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
      <MonthYearPicker
        isVisible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onSelectMonth={setSelectedMonth}
        onSelectYear={setSelectedYear}
      />
      <DatePicker
        isVisible={isRangePickerVisible}
        onClose={() => setIsRangePickerVisible(false)}
        initialStartDate={rangeStart}
        initialDeadline={rangeEnd}
        onSave={(start, end) => {
          setRangeStart(start);
          setRangeEnd(end);
        }}
      />
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
    paddingTop: horizontalScale(20),
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
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: horizontalScale(4) },
    shadowOpacity: 0.8,
    shadowRadius: moderateScale(15),
    elevation: 12,
    borderRadius: moderateScale(9999),
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
  dateSelectorContainer: {
    alignItems: 'center',
    marginBottom: horizontalScale(24),
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1D1F',
    paddingVertical: horizontalScale(14),
    borderRadius: moderateScale(24),
    width: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: horizontalScale(4) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(10),
    elevation: 4,
    position: 'relative',
  },
  calendarIconContainer: {
    position: 'absolute',
    left: horizontalScale(16),
    width: horizontalScale(32),
    height: horizontalScale(32),
    borderRadius: moderateScale(8),
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronIconContainer: {
    position: 'absolute',
    right: horizontalScale(16),
    width: horizontalScale(32),
    height: horizontalScale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateSelectorText: {
    fontSize: moderateScale(15),
    letterSpacing: 1.2,
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
    paddingHorizontal: horizontalScale(40),
    textAlign: 'center',
  },
  summaryContainer: {
    gap: horizontalScale(16),
  },

  largeCard: {
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(28),
    padding: horizontalScale(18),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: horizontalScale(4),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: horizontalScale(8),
  },
  iconCircle: {
    width: horizontalScale(38),
    height: horizontalScale(38),
    borderRadius: moderateScale(19),
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: horizontalScale(10),
    paddingVertical: horizontalScale(4),
    borderRadius: moderateScale(10),
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: moderateScale(11),
  },

  cardLabel: {
    fontSize: moderateScale(10),
    color: 'rgba(255, 255, 255, 0.78)',
    letterSpacing: 1.1,
    marginBottom: horizontalScale(2),
    textTransform: 'uppercase',
    fontFamily: 'Manrope_700Bold',
  },
  cardAmount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(20),
    letterSpacing: -0.5,
  },


  footerLabel: {
    fontSize: moderateScale(13),
    color: 'rgba(255, 255, 255, 0.78)',
    fontFamily: 'Inter_500Medium',
  },
  footerValue: {
    fontSize: moderateScale(16),
    fontFamily: 'Manrope_700Bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: horizontalScale(4),
  },
  statColumn: {
    flex: 1,
  },
  vDivider: {
    width: 1,
    height: horizontalScale(36),
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: horizontalScale(12),
  },
  totalBalanceCard: {
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(22),
    padding: horizontalScale(10),
    marginTop: horizontalScale(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  totalBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: horizontalScale(4),
    gap: horizontalScale(8),
  },
  totalBalanceLabel: {
    fontSize: moderateScale(9),
    color: '#ffffffc7',
    opacity: 0.8,
    letterSpacing: 2,
    fontFamily: 'Manrope_700Bold',
  },
  totalBalanceAmount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(20),
    letterSpacing: -0.5,
  },
});
