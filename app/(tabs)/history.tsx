import { deleteDoc, doc } from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, ChevronDown, Wallet } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, SectionList, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { DatePicker } from '../../components/DatePicker';
import { HistoryFilterBar } from '../../components/history/HistoryFilterBar';
import { HistorySummaryCard } from '../../components/history/HistorySummaryCard';
import { TransactionRow } from '../../components/history/TransactionRow';
import { useHistoryData } from '../../components/history/useHistoryData';
import { getWeeksOfMonth, WeekSelector } from '../../components/history/WeekSelector';
import MonthYearPicker, { LUNI } from '../../components/MonthYearPicker';
import TransactionOptionsMenu from '../../components/TransactionOptionsMenu';
import { TransactionSkeletonList } from '../../components/TransactionSkeleton';
import { useAlert } from '../../context/AlertContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTabBar } from '../../context/TabBarContext';
import { useTransactions } from '../../context/TransactionsContext';
import { auth, db } from '../../firebaseConfig';
import styles from '../../styles/history.styles';
import { horizontalScale } from '../../utils/scaling';
import { onTransactionDeleted } from '../../utils/statsManager';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

export default function HistoryScreen() {
  const { transactions: allRawTransactions, userStats, searchQuery, setSearchQuery, isSearching, setIsSearching, loadAllTransactions } = useTransactions();
  const { search } = useLocalSearchParams<{ search?: string }>();
  const router = useRouter();

  const [optionsMenuTransaction, setOptionsMenuTransaction] = useState<any | null>(null);
  const [displayLimit, setDisplayLimit] = useState(25);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  const isSearchingShared = useSharedValue(search === 'true' || isSearching);
  const shouldAnimate = useSharedValue(true);

  useEffect(() => {
    if (search === 'true') {
      shouldAnimate.value = false;
      setIsSearching(true);
      isSearchingShared.value = true;
      router.setParams({ search: undefined });
    }
  }, [search]);

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const cardHeight = horizontalScale(150);
  const cardMarginBottom = horizontalScale(20);

  useEffect(() => {
    if (isSearching) {
      isSearchingShared.value = true;
    } else {
      isSearchingShared.value = false;
      shouldAnimate.value = true;
    }
  }, [isSearching]);

  const animatedCardStyle = useAnimatedStyle(() => {
    const active = !isSearchingShared.value;
    const targetMarginTop = active ? 0 : -(cardHeight + cardMarginBottom);
    const duration = shouldAnimate.value ? 250 : 0;
    const opacityDuration = shouldAnimate.value ? 100 : 0;
    return {
      marginTop: withTiming(targetMarginTop, { duration }),
      opacity: withTiming(active ? 1 : 0, { duration: opacityDuration }),
    };
  });

  const getWeekIndexForDate = (date: Date) => {
    const day = date.getDate();
    if (day <= 7) return 0;
    if (day <= 14) return 1;
    if (day <= 21) return 2;
    return 3;
  };

  const [selectedWeekIndex, setSelectedWeekIndex] = useState(() => getWeekIndexForDate(currentDate));

  const [filterMode, setFilterMode] = useState<'all' | 'income' | 'expense'>('all');
  const [sortOrder, setSortOrder] = useState<'none' | 'amount-desc' | 'amount-asc'>('none');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      return () => {
        setExpandedId(null);
        setIsSearching(false);
        setSearchQuery('');
      };
    }, [])
  );

  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isRangePickerVisible, setIsRangePickerVisible] = useState(false);
  const [customRange, setCustomRange] = useState<{ start: Date, end: Date } | null>(null);
  const [isCustomRangeActive, setIsCustomRangeActive] = useState(false);
  const [shouldScrollToTransactions, setShouldScrollToTransactions] = useState(false);
  const [truncatedItems, setTruncatedItems] = useState<Record<string, { title: boolean; sub: boolean }>>({});

  const scrollRef = React.useRef<any>(null);
  const transactionsListY = React.useRef(0);

  const { format, currency, rates } = useCurrency();
  const user = auth.currentUser;
  const weeks = getWeeksOfMonth(selectedYear, Number(selectedMonth));
  const currentWeek = weeks[selectedWeekIndex] || weeks[0];
  const headerHeight = useRef(0);

  useEffect(() => {
    const now = new Date();
    if (Number(selectedMonth) === now.getMonth() && selectedYear === now.getFullYear()) {
      setSelectedWeekIndex(getWeekIndexForDate(now));
    } else {
      setSelectedWeekIndex(0);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    setDisplayLimit(25);
  }, [showAllHistory, filterMode, sortOrder, selectedMonth, selectedYear, isCustomRangeActive]);



  const {
    transactions,
    monthIncome,
    monthExpense,
    monthProfit,
    weekIncome,
    weeksWithData,
    txCount,
    monthTransactions,
    isMonthLoading,
  } = useHistoryData({
    selectedMonth,
    selectedYear,
    selectedWeekIndex,
    filterMode,
    sortOrder,
    showAllHistory,
    isCustomRangeActive,
    customRange,
    displayLimit,
    weeks,
    currentWeek,
  });



  useEffect(() => {
    if (shouldScrollToTransactions && transactions.length > 0) {
      scrollRef.current?.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        viewOffset: headerHeight.current - transactionsListY.current + horizontalScale(10),
        animated: true
      });
      setShouldScrollToTransactions(false);
    }
  }, [transactions, shouldScrollToTransactions]);

  const { tabBarOffset } = useTabBar();
  const lastScrollY = useSharedValue(0);
  const { showAlert } = useAlert();
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

  const handleDeleteTransaction = (transaction: any) => {
    try {
      const txId = typeof transaction === 'string' ? transaction : transaction?.id;
      if (!txId) return;

      const rawTx = typeof transaction === 'object' && transaction !== null
        ? transaction
        : allRawTransactions.find(t => t.id === txId);

      deleteDoc(doc(db, "transactions", txId))
        .catch(err => {
          console.error("History Delete Error", err);
          showAlert('Error', 'We could not delete the transaction. Please try again.', 'alert');
        });

      if (rawTx) {
        onTransactionDeleted({
          ...rawTx,
          userId: rawTx.userId || user?.uid,
          rawAmount: rawTx.rawAmount ?? rawTx.amount,
          amountUSD: rawTx.amountUSD ?? rawTx.rawAmount ?? rawTx.amount,
        });
      }
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      showAlert('Error', 'An unexpected error occurred.', 'alert');
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedSectionList
        ref={scrollRef}
        sections={transactions}
        keyExtractor={(item: any) => item.id}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        stickySectionHeadersEnabled={false}
        initialNumToRender={7}
        windowSize={5}
        onEndReached={() => {
          if (showAllHistory) {
            setDisplayLimit(prev => prev + 25);
          }
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: horizontalScale(100) }]}
        ListHeaderComponent={
          <View onLayout={(e) => {
            headerHeight.current = e.nativeEvent.layout.height;
          }}>
            <View style={styles.headerRow}>
              <View style={styles.splitHeaderContainer}>
                <Pressable style={styles.monthSelectorPart} onPress={() => setIsPickerVisible(true)}>
                  <View style={styles.calendarIconContainer}>
                    <Calendar color="#4A8AF4" size={20} fill="rgba(74, 138, 244, 0.1)" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.monthText} numberOfLines={1} adjustsFontSizeToFit>
                    {showAllHistory
                      ? "ALL TRANSACTIONS"
                      : `${LUNI.find(l => l.value === selectedMonth)?.label} ${selectedYear}`}
                  </Text>
                  <View style={styles.chevronIconContainer}>
                    <ChevronDown color="#4A8AF4" size={18} strokeWidth={2.5} />
                  </View>
                </Pressable>

                <TouchableOpacity
                  style={[styles.historyTogglePart, showAllHistory && styles.historyTogglePartActive]}
                  onPress={async () => {
                    const nextVal = !showAllHistory;
                    setShowAllHistory(nextVal);
                    setIsCustomRangeActive(false);
                    if (nextVal) {
                      if (allRawTransactions.length === 0) {
                        setIsLoadingAll(true);
                      }
                      try {
                        await loadAllTransactions();
                      } finally {
                        setIsLoadingAll(false);
                      }
                    }
                  }}
                >
                  <Text style={[styles.historyToggleText, showAllHistory && styles.historyToggleTextActive]}>ALL</Text>
                </TouchableOpacity>
              </View>
            </View>

            <HistorySummaryCard
              animatedCardStyle={animatedCardStyle}
              isSearching={isSearching}
              monthIncome={monthIncome}
              monthExpense={monthExpense}
              monthProfit={monthProfit}
              format={format}
              cardHeight={cardHeight}
              onPress={() =>
                showAlert(
                  'Total Income Details',
                  `Total Income: ${format(monthIncome, { isConverted: true })}\nTotal Expense: ${format(-monthExpense, { isConverted: true })}\nNet Profit/Loss: ${format(monthProfit, { isConverted: true })}`,
                  'info'
                )
              }
            />

            {!showAllHistory && (
              <WeekSelector
                weeks={weeks}
                selectedWeekIndex={selectedWeekIndex}
                onSelectWeek={(index) => {
                  if (selectedWeekIndex !== index) {
                    setSelectedWeekIndex(index);
                    if (weeksWithData[index]) {
                      setShouldScrollToTransactions(true);
                    }
                  } else if (weeksWithData[index] && transactions.length > 0) {
                    scrollRef.current?.scrollToLocation({
                      sectionIndex: 0,
                      itemIndex: 0,
                      viewOffset: headerHeight.current - transactionsListY.current + horizontalScale(10),
                      animated: true,
                    });
                  }
                }}
                onLayoutY={(y) => {
                  transactionsListY.current = y;
                }}
              />
            )}

            <HistoryFilterBar
              showAllHistory={showAllHistory}
              isCustomRangeActive={isCustomRangeActive}
              customRange={customRange}
              weeks={weeks}
              selectedWeekIndex={selectedWeekIndex}
              txCount={txCount}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              filterMode={filterMode}
              setFilterMode={setFilterMode}
              weekIncome={weekIncome}
              format={format}
              onOpenRangePicker={() => setIsRangePickerVisible(true)}
              onClearCustomRange={() => {
                setIsCustomRangeActive(false);
                setCustomRange(null);
              }}
            />

            <View style={styles.separator} />
          </View>
        }
        renderSectionHeader={({ section: group }: any) => (
          !showAllHistory ? (
            <View style={styles.dayHeader}>
              <View>
                <Text style={styles.dayName}>{group.date}</Text>
                <Text style={styles.dayDate}>{group.fullDate}</Text>
              </View>
              <View style={styles.dayHeaderRight}>
                <Text style={styles.dailyTotalLabel}>DAILY TOTAL</Text>
                <Text
                  style={[
                    styles.dailyTotalValue,
                    { color: group.dailyTotal.includes('+') ? '#10b981' : '#eb5656' }
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                >
                  {group.dailyTotal}
                </Text>
              </View>
            </View>
          ) : null
        )}
        renderItem={({ item, index }: any) => (
          <TransactionRow
            item={item}
            index={index}
            isExpanded={expandedId === item.id}
            showAllHistory={showAllHistory}
            currency={currency}
            format={format}
            showAlert={showAlert}
            handleDeleteTransaction={handleDeleteTransaction}
            setExpandedId={setExpandedId}
            truncatedItems={truncatedItems}
            setTruncatedItems={setTruncatedItems}
            onLongPress={() => setOptionsMenuTransaction(item)}
          />
        )}
        ListEmptyComponent={
          (showAllHistory && isLoadingAll) || (!showAllHistory && isMonthLoading && monthTransactions.length === 0) ? (
            <TransactionSkeletonList count={5} />
          ) : (
            <View style={styles.emptyState}>
              <Wallet size={48} color="rgba(255,255,255,0.1)" strokeWidth={1} />
              <Text style={styles.emptyStateTitle}>
                {showAllHistory ? "No transactions found" : `Nothing found for Week ${weeks[selectedWeekIndex]?.label}`}
              </Text>
              <Text style={styles.emptyStateText}>
                {showAllHistory ? "Adjust your filters or add a new transaction." : "Try selecting another week or add a new transaction."}
              </Text>
            </View>
          )
        }
      />
      <MonthYearPicker
        isVisible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        isAllSelected={showAllHistory}
        onSelectMonth={(m) => {
          setSelectedMonth(m);
          setShowAllHistory(false);
          setIsCustomRangeActive(false);
        }}
        onSelectYear={(y) => {
          setSelectedYear(y);
          setShowAllHistory(false);
          setIsCustomRangeActive(false);
        }}
      />

      <DatePicker
        isVisible={isRangePickerVisible}
        onClose={() => setIsRangePickerVisible(false)}
        title="HISTORY FILTER"
        subtitle="Select a custom range"
        onSave={(start, end) => {
          setCustomRange({ start, end });
          setIsCustomRangeActive(true);
        }}
        initialStartDate={customRange?.start}
        initialDeadline={customRange?.end}
      />

      <TransactionOptionsMenu
        isVisible={optionsMenuTransaction !== null}
        onClose={() => setOptionsMenuTransaction(null)}
        transaction={optionsMenuTransaction}
        onDelete={() => {
          const item = optionsMenuTransaction;
          setOptionsMenuTransaction(null);
          showAlert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            'alert',
            () => { handleDeleteTransaction(item) },
            true,
            false
          );
        }}
      />
    </View>
  );
}
