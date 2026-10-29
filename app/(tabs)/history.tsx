import { collection, deleteDoc, doc, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowUpDown, Calendar, CalendarDays, ChevronDown, ShoppingBag, SlidersHorizontal, Wallet, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, SectionList, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInDown, LinearTransition, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { DatePicker } from '../../components/DatePicker';
import MonthYearPicker, { LUNI } from '../../components/MonthYearPicker';
import { useAlert } from '../../context/AlertContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTabBar } from '../../context/TabBarContext';
import { parseCompatibleDate, useTransactions } from '../../context/TransactionsContext';
import { auth, db } from '../../firebaseConfig';
import { computeDisplayFromStats, MonthlyStatsDoc, onTransactionDeleted } from '../../utils/statsManager';
import styles from '../../styles/history.styles';
import { horizontalScale, moderateScale } from '../../utils/scaling';

import { useLocalSearchParams, useRouter } from 'expo-router';
import TransactionOptionsMenu from '../../components/TransactionOptionsMenu';
import { TransactionSkeletonList } from '../../components/TransactionSkeleton';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);
const renderGhostActions = () => <View style={{ width: 80 }} />;

interface TransactionItem {
  id: string;
  title: string;
  sub: string;
  amount: string;
  icon: any;
  rawAmount: number;
  amountUSD: number;
  currency: string;
  type: 'income' | 'expense';
  notes?: string;
  time: string;
  date?: Date;
  dateString?: string;
  createdAt?: Date;
  userId?: string;
}

interface TransactionGroup {
  date: string;
  fullDate: string;
  dailyTotal: string;
  data: TransactionItem[];
}

interface RawTransaction {
  id: string;
  title: string;
  amount: number;
  amountUSD: number;
  currency: string;
  type: 'income' | 'expense';
  createdAt: Date;
  date?: Date;
  dateString?: string;
  notes?: string;
  userId: string;
}


const TransactionRow = React.memo(({
  item, index, isExpanded, showAllHistory, currency, format,
  showAlert, handleDeleteTransaction, setExpandedId, truncatedItems, setTruncatedItems,
  onLongPress
}: any) => {
  const rowRef = React.useRef<any>(null);

  return (
    <Animated.View
      entering={showAllHistory ? undefined : FadeInDown.delay(index * 60).springify().damping(15)}
      layout={LinearTransition}
      key={item.id}
      style={{ marginBottom: horizontalScale(10) }}
    >
      <Swipeable
        ref={rowRef}
        renderRightActions={renderGhostActions}
        renderLeftActions={renderGhostActions}
        onSwipeableWillOpen={() => {
          setTimeout(() => {
            rowRef.current?.close();
          }, 150);
          showAlert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            'alert',
            () => { handleDeleteTransaction(item) },
            true,
            false
          );
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            const isCompactAmount = item.amount.includes('M') || item.amount.includes('K') || item.amount.includes('B');
            const isTruncated = truncatedItems[item.id]?.title || truncatedItems[item.id]?.sub;

            if (isCompactAmount || isTruncated || !!item.notes) {
              setExpandedId(isExpanded ? null : item.id);
            }
          }}
          onLongPress={onLongPress}
          delayLongPress={300}
          style={[
            styles.transactionCard,
            { borderColor: item.type === 'income' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(235, 86, 86, 0.6)' }
          ]}
        >
          <View style={styles.cardMainRow}>
            <View style={[
              styles.iconCircle,
              { backgroundColor: item.type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(235, 86, 86, 0.1)' }
            ]}>
              <item.icon color={item.type === 'income' ? '#10b981' : '#eb5656'} size={22} strokeWidth={2.5} />
            </View>
            <View style={styles.transactionInfo}>
              <Text
                style={styles.transactionTitle}
                numberOfLines={isExpanded ? undefined : 1}
                onTextLayout={(e) => {
                  if (!isExpanded && e.nativeEvent.lines.length > 0) {
                    const isTruncated = e.nativeEvent.lines.length > 1 || e.nativeEvent.lines[0].width > (moderateScale(150));
                    if (isTruncated && !truncatedItems[item.id]?.title) {
                      setTruncatedItems((prev: any) => ({ ...prev, [item.id]: { ...prev[item.id], title: true } }));
                    }
                  }
                }}
              >
                {item.title}
              </Text>
              <Text
                style={styles.transactionSub}
                numberOfLines={isExpanded ? undefined : 1}
                onTextLayout={(e) => {
                  if (!isExpanded && e.nativeEvent.lines.length > 0) {
                    const isTruncated = e.nativeEvent.lines.length > 1;
                    if (isTruncated && !truncatedItems[item.id]?.sub) {
                      setTruncatedItems((prev: any) => ({ ...prev, [item.id]: { ...prev[item.id], sub: true } }));
                    }
                  }
                }}
              >
                {item.sub}
              </Text>
            </View>
            <Text
              style={[styles.transactionAmount, { color: item.type === 'income' ? '#10b981' : '#eb5656' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {item.amount}
            </Text>
          </View>

          {(isExpanded && (item.amount.includes('M') || item.amount.includes('K') || item.amount.includes('B') || !!item.notes)) && (
            <View
              style={styles.expandedContent}
            >
              {(item.amount.includes('M') || item.amount.includes('K') || item.amount.includes('B')) && <View style={styles.detailDivider} />}

              {(item.amount.includes('M') || item.amount.includes('K') || item.amount.includes('B')) && (
                <View style={[styles.detailSectionRow, { marginBottom: horizontalScale(8) }]}>
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>EXACT AMOUNT</Text>
                    <Text
                      style={[styles.detailValueLarge, { color: item.type === 'income' ? '#10b981' : '#eb5656' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {format(
                        item.currency === currency ? (item.type === 'income' ? item.rawAmount : -item.rawAmount) : (item.type === 'income' ? item.amountUSD : -item.amountUSD),
                        { showSign: true, isConverted: item.currency === currency }
                      )}
                    </Text>
                  </View>
                </View>
              )}

            </View>
          )}
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
});

function getWeeksOfMonth(year: number, month: number) {
  const weeks = [];
  const lastDayDate = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < 3; i++) {
    const start = i * 7 + 1;
    const end = (i + 1) * 7;
    weeks.push({
      start: new Date(year, month, start, 0, 0, 0),
      end: new Date(year, month, end, 23, 59, 59),
      label: (i + 1).toString().padStart(2, '0'),
      range: `${start.toString().padStart(2, '0')}-${end.toString().padStart(2, '0')}`
    });
  }

  weeks.push({
    start: new Date(year, month, 22, 0, 0, 0),
    end: new Date(year, month, lastDayDate, 23, 59, 59),
    label: "04",
    range: `22-${lastDayDate.toString().padStart(2, '0')}`
  });

  return weeks;
}

export default function HistoryScreen() {
  const { transactions: allRawTransactions, userStats, searchQuery, setSearchQuery, isSearching, setIsSearching, loadAllTransactions } = useTransactions();
  const { search } = useLocalSearchParams<{ search?: string }>();
  const router = useRouter();

  const [monthTransactions, setMonthTransactions] = useState<RawTransaction[]>([]);
  const [optionsMenuTransaction, setOptionsMenuTransaction] = useState<any | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [monthlyStatsDoc, setMonthlyStatsDoc] = useState<MonthlyStatsDoc | null>(null);
  const [displayLimit, setDisplayLimit] = useState(25);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [isMonthLoading, setIsMonthLoading] = useState(false);

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



  // Load all transactions on-demand only when user is searching or viewing All History
  useEffect(() => {
    if (showAllHistory || isSearching || (searchQuery && searchQuery.trim().length > 0)) {
      loadAllTransactions();
    }
  }, [showAllHistory, isSearching, searchQuery, loadAllTransactions]);

  useEffect(() => {
    if (!user) {
      setMonthlyStatsDoc(null);
      return;
    }
    const docId = `${selectedYear}-${String(Number(selectedMonth) + 1).padStart(2, '0')}`;
    const monthlyRef = doc(db, 'users', user.uid, 'monthlyStats', docId);
    const unsub = onSnapshot(monthlyRef, (snap) => {
      if (snap && snap.exists()) {
        setMonthlyStatsDoc(snap.data() as MonthlyStatsDoc);
      } else {
        setMonthlyStatsDoc(null);
      }
    }, (err) => {
      console.error("History monthly stats snapshot error:", err);
    });
    return () => unsub();
  }, [user, selectedMonth, selectedYear]);

  // Variant 1: Query transactions ONLY for the selected month
  useEffect(() => {
    if (!user || showAllHistory || isSearching || (searchQuery && searchQuery.trim().length > 0)) {
      setMonthTransactions([]);
      setIsMonthLoading(false);
      return;
    }
    setIsMonthLoading(true);
    const docId = `${selectedYear}-${String(Number(selectedMonth) + 1).padStart(2, '0')}`;
    const startStr = `${docId}-01`;
    const endStr = `${docId}-31`;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      where('dateString', '>=', startStr),
      where('dateString', '<=', endStr)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setIsMonthLoading(false);
      if (!snapshot) {
        setMonthTransactions([]);
        return;
      }
      const list: RawTransaction[] = snapshot.docs.map((d) => {
        const data = d.data({ serverTimestamps: 'estimate' });
        const rawDate = data.date || data.createdAt;
        let compatibleDate = parseCompatibleDate(rawDate);

        if (data.dateString && typeof data.dateString === 'string') {
          const parts = data.dateString.split('-');
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            compatibleDate = new Date(y, m, d, compatibleDate.getHours(), compatibleDate.getMinutes(), compatibleDate.getSeconds());
          }
        }

        return {
          id: d.id,
          ...data,
          date: compatibleDate,
          createdAt: compatibleDate,
          dateString: data.dateString,
        } as RawTransaction;
      });

      list.sort((a, b) => (b.date?.getTime() || b.createdAt.getTime()) - (a.date?.getTime() || a.createdAt.getTime()));
      setMonthTransactions(list);
    }, (err) => {
      setIsMonthLoading(false);
      console.error('[History] Month transactions snapshot error:', err);
      // Fallback: If month query fails (e.g. index building), load all transactions so screen is not blank
      loadAllTransactions();
    });

    return () => unsub();
  }, [user, selectedMonth, selectedYear, showAllHistory, isSearching, searchQuery, loadAllTransactions]);

  const historyData = React.useMemo(() => {
    if (!user) return {
      transactions: [],
      monthIncome: 0,
      monthExpense: 0,
      monthProfit: 0,
      weekIncome: 0,
      weeksWithData: {} as Record<number, boolean>
    };

    let startOfMonth = new Date(selectedYear, Number(selectedMonth), 1);
    let endOfMonth = new Date(selectedYear, Number(selectedMonth) + 1, 0, 23, 59, 59);

    if (showAllHistory && isCustomRangeActive && customRange) {
      startOfMonth = customRange.start;
      endOfMonth = customRange.end;
    }

    const hasMonthlyStats = !showAllHistory && !searchQuery && !!monthlyStatsDoc;
    const hasAllStats = showAllHistory && !isCustomRangeActive && !searchQuery && !!userStats && !!userStats.statsCalibrated;

    let grossIncome = 0;
    let grossExpense = 0;

    if (hasMonthlyStats) {
      const mDisp = computeDisplayFromStats(monthlyStatsDoc!, currency, rates);
      grossIncome = mDisp.income;
      grossExpense = mDisp.expense;
    } else if (hasAllStats) {
      const allDisp = computeDisplayFromStats(userStats!, currency, rates);
      grossIncome = allDisp.income;
      grossExpense = allDisp.expense;
    }

    const activeTransactionsList = (showAllHistory || isSearching || (searchQuery && searchQuery.trim().length > 0) || monthTransactions.length === 0)
      ? (allRawTransactions.length > 0 ? allRawTransactions : monthTransactions)
      : monthTransactions;

    const monthList = activeTransactionsList.filter((t: RawTransaction) => {
      if (showAllHistory && !isCustomRangeActive) return true;
      return t.createdAt >= startOfMonth && t.createdAt <= endOfMonth;
    });

    const weekFilteredList = monthList.filter(t => {
      const filterMatch = filterMode === 'all' || t.type === filterMode;
      const searchMatch = !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      if (showAllHistory) return filterMatch && searchMatch;

      const txDate = t.createdAt.getTime();
      const dateMatch = txDate >= currentWeek.start.getTime() && txDate <= currentWeek.end.getTime();
      return dateMatch && filterMatch && searchMatch;
    });

    if (searchQuery) {
      grossIncome = 0;
      grossExpense = 0;
      weekFilteredList.forEach((t) => {
        const valToSum = (t.currency === currency)
          ? t.amount
          : ((t.amountUSD || (t.amount / (rates?.[t.currency] || 1))) * (rates?.[currency] || 1));
        if (t.type === "income") grossIncome += valToSum;
        else grossExpense += valToSum;
      });
    } else if (!hasMonthlyStats && !hasAllStats) {
      monthList.forEach((t) => {
        const valToSum = (t.currency === currency)
          ? t.amount
          : ((t.amountUSD || (t.amount / (rates?.[t.currency] || 1))) * (rates?.[currency] || 1));
        if (t.type === "income") grossIncome += valToSum;
        else grossExpense += valToSum;
      });
    }

    let weekBalance = 0;
    const grouped: TransactionGroup[] = [];
    const dayTotals: Record<string, number> = {};

    weekFilteredList.forEach((t) => {
      const dateLabel = t.createdAt.toDateString() === new Date().toDateString() ? "Today" :
        t.createdAt.toDateString() === new Date(Date.now() - 86400000).toDateString() ? "Yesterday" :
          t.createdAt.toLocaleDateString('en-US', { weekday: 'long' });

      const fullDate = t.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

      let dayGroup = grouped.find((g) => g.fullDate === fullDate);
      if (!dayGroup) {
        dayGroup = {
          date: dateLabel,
          fullDate: fullDate,
          dailyTotal: "",
          data: []
        };
        grouped.push(dayGroup);
        dayTotals[fullDate] = 0;
      }
      const isSameCurrency = t.currency === currency;
      const displayValue = isSameCurrency
        ? (t.type === 'income' ? t.amount : -t.amount)
        : (t.type === 'income' ? (t.amountUSD || t.amount) : -(t.amountUSD || t.amount));

      const dateStr = t.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = t.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      dayGroup.data.push({
        id: t.id,
        title: t.title,
        sub: showAllHistory
          ? `${dateStr} • ${timeStr} • ${t.notes || 'General'}`
          : `${t.notes || 'General'} • ${timeStr}`,
        amount: format(displayValue, { compact: true, showSign: true, isConverted: isSameCurrency }),
        icon: t.type === 'income' ? Wallet : ShoppingBag,
        rawAmount: t.amount,
        amountUSD: t.amountUSD || t.amount,
        currency: t.currency || 'USD',
        type: t.type,
        notes: t.notes,
        time: timeStr,
        date: t.date,
        createdAt: t.createdAt,
        dateString: t.dateString,
        userId: t.userId || user?.uid
      });

      const valForTotal = (t.currency === currency)
        ? t.amount
        : ((t.amountUSD || (t.amount / (rates?.[t.currency] || 1))) * (rates?.[currency] || 1));
      const signedVal = t.type === 'income' ? valForTotal : -valForTotal;
      dayTotals[fullDate] += signedVal;
    });

    grouped.forEach(g => {
      const total = dayTotals[g.fullDate];
      g.dailyTotal = format(total, { compact: true, showSign: true, threshold: 1000000000, isConverted: true });
      if (sortOrder === 'amount-desc') {
        g.data.sort((a, b) => b.amountUSD - a.amountUSD);
      } else if (sortOrder === 'amount-asc') {
        g.data.sort((a, b) => a.amountUSD - b.amountUSD);
      }
    });

    const weeksStatus: Record<number, boolean> = {};
    if (hasMonthlyStats && monthlyStatsDoc?.weeks) {
      weeks.forEach((_, i) => {
        const key = String(i) as '0' | '1' | '2' | '3';
        const wCount = monthlyStatsDoc.weeks?.[key]?.count || 0;
        weeksStatus[i] = wCount > 0;
      });
    } else {
      weeks.forEach((w, i) => {
        weeksStatus[i] = monthList.some(t => t.createdAt.getTime() >= w.start.getTime() && t.createdAt.getTime() <= w.end.getTime());
      });
    }

    const selectedKey = String(selectedWeekIndex) as '0' | '1' | '2' | '3';
    if (searchQuery) {
      if (filterMode === 'all') weekBalance = grossIncome - grossExpense;
      else if (filterMode === 'income') weekBalance = grossIncome;
      else if (filterMode === 'expense') weekBalance = -grossExpense;
    } else if (showAllHistory) {
      if (filterMode === 'all') weekBalance = grossIncome - grossExpense;
      else if (filterMode === 'income') weekBalance = grossIncome;
      else if (filterMode === 'expense') weekBalance = -grossExpense;
    } else if (hasMonthlyStats && monthlyStatsDoc?.weeks?.[selectedKey] && !searchQuery && filterMode === 'all') {
      const wStats = monthlyStatsDoc.weeks[selectedKey];
      const wDisp = computeDisplayFromStats(wStats, currency, rates);
      weekBalance = wDisp.income - wDisp.expense;
    } else {
      let currentWeekBalance = 0;
      weekFilteredList.forEach((t) => {
        const val = (t.currency === currency)
          ? t.amount
          : ((t.amountUSD || (t.amount / (rates?.[t.currency] || 1))) * (rates?.[currency] || 1));
        if (filterMode === 'all') {
          currentWeekBalance += (t.type === 'income' ? val : -val);
        } else if (filterMode === 'income' && t.type === 'income') {
          currentWeekBalance += val;
        } else if (filterMode === 'expense' && t.type === 'expense') {
          currentWeekBalance -= val;
        }
      });
      weekBalance = currentWeekBalance;
    }

    let totalCount = weekFilteredList.length;
    if (!searchQuery) {
      if (hasMonthlyStats && filterMode === 'all') {
        totalCount = monthlyStatsDoc?.weeks?.[selectedKey]?.count ?? weekFilteredList.length;
      } else if (hasAllStats && filterMode === 'all') {
        totalCount = userStats?.totalTransactionsCount ?? weekFilteredList.length;
      }
    }

    if (showAllHistory && sortOrder !== 'none') {
      const allItems: any[] = [];
      grouped.forEach(g => allItems.push(...g.data));
      allItems.sort((a, b) => {
        return sortOrder === 'amount-desc' ? b.amountUSD - a.amountUSD : a.amountUSD - b.amountUSD;
      });
      const pagedItems = allItems.slice(0, displayLimit);
      return {
        transactions: [{
          date: sortOrder === 'amount-desc' ? 'HIGHEST TRANSACTIONS' : 'LOWEST TRANSACTIONS',
          fullDate: 'ALL TIME',
          dailyTotal: '',
          data: pagedItems
        }],
        monthIncome: grossIncome,
        monthExpense: grossExpense,
        monthProfit: grossIncome - grossExpense,
        weekIncome: weekBalance,
        weeksWithData: weeksStatus,
        txCount: totalCount
      };
    }

    let finalGrouped = grouped;
    if (showAllHistory) {
      let count = 0;
      const paginatedGroups: TransactionGroup[] = [];
      for (const g of grouped) {
        if (count >= displayLimit) break;
        const remaining = displayLimit - count;
        if (g.data.length <= remaining) {
          paginatedGroups.push(g);
          count += g.data.length;
        } else {
          paginatedGroups.push({
            ...g,
            data: g.data.slice(0, remaining)
          });
          count += remaining;
          break;
        }
      }
      finalGrouped = paginatedGroups;
    }

    return {
      transactions: finalGrouped,
      monthIncome: grossIncome,
      monthExpense: grossExpense,
      monthProfit: grossIncome - grossExpense,
      weekIncome: weekBalance,
      weeksWithData: weeksStatus,
      txCount: totalCount
    };
  }, [allRawTransactions, monthTransactions, userStats, monthlyStatsDoc, displayLimit, selectedMonth, selectedYear, selectedWeekIndex, filterMode, sortOrder, currency, rates, user, showAllHistory, isCustomRangeActive, customRange, format, searchQuery, isSearching]);

  const {
    transactions,
    monthIncome,
    monthExpense,
    monthProfit,
    weekIncome,
    weeksWithData,
    txCount
  } = historyData;



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

            <Animated.View style={animatedCardStyle} pointerEvents={isSearching ? 'none' : 'auto'}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => showAlert('Total Income Details', `Total Income: ${format(monthIncome, { isConverted: true })}\nTotal Expense: ${format(-monthExpense, { isConverted: true })}\nNet Profit/Loss: ${format(monthProfit, { isConverted: true })}`, 'info')}
              >
                <View style={[styles.summaryCardLarge, { height: cardHeight }]}>
                  <View style={styles.summaryTop}>
                    <View style={styles.summaryMetric}>
                      <Text style={[styles.summaryLabel, { color: 'rgba(49, 230, 169, 0.4)' }]}>TOTAL INCOME</Text>
                      <Text
                        style={[styles.summaryValue, { color: '#10b981' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                      >
                        {format(monthIncome, { compact: true, showSign: true, isConverted: true })}
                      </Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.summaryMetric}>
                      <Text style={[styles.summaryLabel, { color: 'rgba(235, 86, 86, 0.68)' }]}>TOTAL EXPENSE</Text>
                      <Text
                        style={[styles.summaryValue, { color: '#eb5656' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                      >
                        {format(-monthExpense, { compact: true, isConverted: true })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.horizontalDivider} />

                  <View style={styles.summaryBottom}>
                    <Text style={styles.profitLabel}>NET PROFIT / LOSS</Text>
                    <Text
                      style={[styles.profitValue, { color: monthProfit >= 0 ? '#10b981' : '#eb5656' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                    >
                      {format(monthProfit, { compact: true, showSign: true, isConverted: true })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {!showAllHistory && (
              <View
                style={styles.weekSelectorScroll}
                onLayout={(e) => {
                  transactionsListY.current = e.nativeEvent.layout.y;
                }}
              >
                <View style={styles.weekContainer}>
                  {['01', '02', '03', '04'].map((weekLabel, index) => (
                    <Pressable
                      key={index}
                      onPress={() => {
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
                            animated: true
                          });
                        }
                      }}
                      style={({ pressed }) => [
                        styles.weekCard,
                        selectedWeekIndex === index && styles.weekCardActive,
                        { transform: [{ scale: (selectedWeekIndex === index || pressed) ? 1.01 : 1 }] }
                      ]}
                    >
                      <Text style={[styles.weekLabel, selectedWeekIndex === index && styles.weekLabelActive]}>WEEK</Text>
                      <Text style={[styles.weekNumber, selectedWeekIndex === index && styles.weekNumberActive]}>{weekLabel}</Text>
                      <Text style={[styles.weekRange, selectedWeekIndex === index && styles.weekRangeActive]}>
                        {weeks[index]?.range || ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.weekHeader}>
              <View style={styles.weekTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: horizontalScale(6), flex: 1, flexShrink: 1, marginRight: horizontalScale(4) }}>
                  <Text
                    style={[
                      styles.weekTitle,
                      {
                        flex: 0,
                        flexGrow: 0,
                        flexShrink: 1,
                        marginRight: 0,
                        fontSize: showAllHistory ? moderateScale(24) : moderateScale(26)
                      }
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {showAllHistory
                      ? (isCustomRangeActive && customRange ? `${customRange.start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${customRange.end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`.replace(/ /g, '\u00A0') : "All\u00A0History")
                      : `Week\u00A0${weeks[selectedWeekIndex]?.label}`}
                  </Text>
                  <View style={[styles.weekTitleBadge, { flexShrink: 0 }]}>
                    <Text style={styles.weekTitleBadgeText}>{txCount}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: horizontalScale(5), alignItems: 'center', flexShrink: 0 }}>
                  {showAllHistory && (
                    <View style={[styles.filterIconButton, isCustomRangeActive && styles.filterIconButtonActive, { overflow: 'hidden' }]}>
                      <Pressable
                        onPress={() => setIsRangePickerVisible(true)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: horizontalScale(6),
                          paddingVertical: horizontalScale(7),
                          paddingLeft: horizontalScale(9),
                          paddingRight: isCustomRangeActive ? horizontalScale(4) : horizontalScale(10)
                        }}
                      >
                        <CalendarDays color={isCustomRangeActive ? "#4A8AF4" : "rgba(255,255,255,0.4)"} size={14} strokeWidth={2.5} />
                        <Text style={[styles.filterModeLabel, { color: isCustomRangeActive ? "#4A8AF4" : "rgba(255,255,255,0.4)" }]}>RANGE</Text>
                      </Pressable>

                      {isCustomRangeActive && (
                        <Pressable
                          onPress={() => {
                            setIsCustomRangeActive(false);
                            setCustomRange(null);
                          }}
                          style={{
                            paddingHorizontal: horizontalScale(8),
                            borderLeftWidth: 1,
                            borderLeftColor: 'rgba(74, 138, 244, 0.3)',
                            height: horizontalScale(20),
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <X color="#4A8AF4" size={14} strokeWidth={3} />
                        </Pressable>
                      )}
                    </View>
                  )}
                  {!showAllHistory && (
                    <TouchableOpacity
                      style={[
                        styles.filterIconButton,
                        sortOrder !== 'none' && styles.filterIconButtonActive,
                        {
                          borderColor: sortOrder === 'none' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(74, 138, 244, 0.7)',
                          height: horizontalScale(32),
                          width: horizontalScale(66),
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: horizontalScale(5)
                        }
                      ]}
                      onPress={() => {
                        const modes: ('none' | 'amount-desc' | 'amount-asc')[] = ['none', 'amount-desc', 'amount-asc'];
                        const nextMode = modes[(modes.indexOf(sortOrder) + 1) % modes.length];
                        setSortOrder(nextMode);
                      }}
                    >
                      <ArrowUpDown
                        color={sortOrder === 'none' ? 'rgba(255,255,255,0.4)' : '#4A8AF4'}
                        size={14}
                        strokeWidth={2.5}
                      />
                      <Text style={[styles.filterModeLabel, { color: sortOrder !== 'none' ? '#4A8AF4' : 'rgba(255,255,255,0.4)' }]}>
                        {sortOrder === 'none' ? 'SORT' : (sortOrder === 'amount-desc' ? 'MAX' : 'MIN')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.filterIconButton,
                      filterMode !== 'all' && styles.filterIconButtonActive,
                      {
                        borderColor: filterMode === 'all' ? 'rgba(255, 255, 255, 0.18)' : (filterMode === 'income' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(235, 86, 86, 0.7)'),
                        paddingVertical: horizontalScale(7),
                        paddingHorizontal: horizontalScale(9),
                        height: horizontalScale(32),
                        gap: horizontalScale(6)
                      }
                    ]}
                    onPress={() => {
                      const modes: ('all' | 'income' | 'expense')[] = ['all', 'income', 'expense'];
                      const nextMode = modes[(modes.indexOf(filterMode) + 1) % modes.length];
                      setFilterMode(nextMode);
                    }}
                  >
                    {filterMode === 'all' && (
                      <SlidersHorizontal
                        color='rgba(255,255,255,0.4)'
                        size={14}
                        strokeWidth={2.5}
                      />
                    )}
                    <Text style={[styles.filterModeLabel, { color: filterMode !== 'all' ? (filterMode === 'income' ? '#10b981' : '#eb5656') : 'rgba(255,255,255,0.4)' }]}>
                      {filterMode === 'all' ? 'ANY' : filterMode.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: horizontalScale(6) }}>
                <Text style={[styles.weekIncomeLabelSmall, { flexShrink: 1, marginRight: horizontalScale(8) }]}>
                  {showAllHistory ? 'TOTAL BALANCE: ' : 'WEEK BALANCE: '}<Text
                    style={[styles.weekIncomeValueSmall, { color: weekIncome >= 0 ? '#10b981' : '#eb5656' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {format(weekIncome, { compact: true, showSign: true, isConverted: true })}
                  </Text>
                </Text>
                {showAllHistory && (
                  <TouchableOpacity
                    style={[
                      styles.filterIconButton,
                      sortOrder !== 'none' && styles.filterIconButtonActive,
                      {
                        borderColor: sortOrder === 'none' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(74, 138, 244, 0.7)',
                        height: horizontalScale(32),
                        width: horizontalScale(66),
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: horizontalScale(5)
                      }
                    ]}
                    onPress={() => {
                      const modes: ('none' | 'amount-desc' | 'amount-asc')[] = ['none', 'amount-desc', 'amount-asc'];
                      const nextMode = modes[(modes.indexOf(sortOrder) + 1) % modes.length];
                      setSortOrder(nextMode);
                    }}
                  >
                    <ArrowUpDown
                      color={sortOrder === 'none' ? 'rgba(255,255,255,0.4)' : '#4A8AF4'}
                      size={14}
                      strokeWidth={2.5}
                    />
                    <Text style={[styles.filterModeLabel, { color: sortOrder !== 'none' ? '#4A8AF4' : 'rgba(255,255,255,0.4)' }]}>
                      {sortOrder === 'none' ? 'SORT' : (sortOrder === 'amount-desc' ? 'MAX' : 'MIN')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

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
