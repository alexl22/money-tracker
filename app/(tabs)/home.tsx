import { Calendar, ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { DatePicker } from '../../components/DatePicker';
import { HomeSummaryCards } from '../../components/home/HomeSummaryCards';
import { useHomeMetrics } from '../../components/home/useHomeMetrics';
import { InsightsCarousel } from '../../components/InsightsCarousel';
import MonthYearPicker, { LUNI } from '../../components/MonthYearPicker';
import { useAlert } from '../../context/AlertContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTabBar } from '../../context/TabBarContext';
import { useTransactions } from '../../context/TransactionsContext';
import styles from '../../styles/home.styles';
import { horizontalScale } from '../../utils/scaling';

export default function DashboardScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const toggleWidth = SCREEN_WIDTH - horizontalScale(48);
  const padding = horizontalScale(6);
  const tabWidth = (toggleWidth - padding * 2) / 3;

  const [viewMode, setViewMode] = useState<'total' | 'month' | 'range'>('total');
  const translateX = useSharedValue(0);

  const toggleView = (mode: 'total' | 'month' | 'range') => {
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
        tabBarOffset.value = 150;
      } else if (deltaY < -2) {
        tabBarOffset.value = 0;
      }
      lastScrollY.value = currentY;
    },
  });

  const animatedToggleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const { transactions: rawTransactions, userStats } = useTransactions();
  const { showAlert } = useAlert();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(currentDate.getDate() - 7);
  const [rangeStart, setRangeStart] = useState(sevenDaysAgo);
  const [rangeEnd, setRangeEnd] = useState(currentDate);
  const [isRangePickerVisible, setIsRangePickerVisible] = useState(false);

  const { totalIncome, totalExpenses, averageIncome, averageExpenses } = useHomeMetrics({
    viewMode,
    selectedMonth,
    selectedYear,
    rangeStart,
    rangeEnd,
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={[styles.toggleContainer, { width: toggleWidth }]}>
          <Animated.View style={[styles.activeHighlight, { width: tabWidth }, animatedToggleStyle]} />
          <Pressable style={styles.toggleTab} onPress={() => toggleView('total')}>
            <Text style={[styles.toggleText, viewMode === 'total' && styles.toggleTextActive]}>TOTAL</Text>
          </Pressable>
          <Pressable style={styles.toggleTab} onPress={() => toggleView('month')}>
            <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextActive]}>MONTH</Text>
          </Pressable>
          <Pressable style={styles.toggleTab} onPress={() => toggleView('range')}>
            <Text style={[styles.toggleText, viewMode === 'range' && styles.toggleTextActive]}>RANGE</Text>
          </Pressable>
        </View>

        {viewMode === 'month' && (
          <View style={styles.dateSelectorContainer}>
            <Pressable style={styles.dateSelector} onPress={() => setIsPickerVisible(true)}>
              <View style={styles.calendarIconContainer}>
                <Calendar color="#3b82f6" size={20} fill="rgba(59, 130, 246, 0.1)" strokeWidth={2.5} />
              </View>
              <Text style={styles.dateSelectorText} numberOfLines={1} adjustsFontSizeToFit={true}>
                {LUNI.find((l) => l.value === selectedMonth)?.label} {selectedYear}
              </Text>
              <View style={styles.chevronIconContainer}>
                <ChevronDown color="#3b82f6" size={18} strokeWidth={2.5} />
              </View>
            </Pressable>
          </View>
        )}

        {viewMode === 'range' && (
          <View style={styles.dateSelectorContainer}>
            <Pressable style={styles.dateSelector} onPress={() => setIsRangePickerVisible(true)}>
              <View style={styles.calendarIconContainer}>
                <Calendar color="#3b82f6" size={20} fill="rgba(59, 130, 246, 0.1)" strokeWidth={2.5} />
              </View>
              <Text style={styles.dateSelectorText} numberOfLines={1} adjustsFontSizeToFit>
                {rangeStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} —{' '}
                {rangeEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </Text>
              <View style={styles.chevronIconContainer}>
                <ChevronDown color="#3b82f6" size={18} strokeWidth={2.5} />
              </View>
            </Pressable>
          </View>
        )}

        <Animated.View style={styles.summaryContainer} layout={LinearTransition}>
          <HomeSummaryCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            averageIncome={averageIncome}
            averageExpenses={averageExpenses}
            viewMode={viewMode}
            format={format}
            showAlert={showAlert}
          />

          {viewMode === 'total' && (
            <InsightsCarousel
              userStats={userStats}
              transactions={rawTransactions}
              currency={currency}
              rates={rates}
              format={format}
            />
          )}
        </Animated.View>

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
        title={'SELECT RANGE'}
        onSave={(start, end) => {
          setRangeStart(start);
          setRangeEnd(end);
        }}
      />
    </View>
  );
}
