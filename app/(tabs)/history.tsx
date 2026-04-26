import { collection, deleteDoc, doc, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { useFocusEffect } from 'expo-router';
import { Calendar, CalendarDays, ChevronDown, ShoppingBag, SlidersHorizontal, Wallet } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { DatePicker } from '../../components/DatePicker';
import MonthYearPicker, { LUNI } from '../../components/MonthYearPicker';
import { useAlert } from '../../context/AlertContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTabBar } from '../../context/TabBarContext';
import { auth, db } from '../../firebaseConfig';
import styles from '../../styles/history.styles';
import { horizontalScale } from '../../utils/scaling';
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
  notes?: string;
  userId: string;
}

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
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [monthProfit, setMonthProfit] = useState(0);
  const [weekIncome, setWeekIncome] = useState(0);

  const [transactions, setTransactions] = useState<TransactionGroup[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'income' | 'expense'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      return () => {
        setExpandedId(null);
      };
    }, [])
  );




  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isRangePickerVisible, setIsRangePickerVisible] = useState(false);
  const [customRange, setCustomRange] = useState<{ start: Date, end: Date } | null>(null);
  const [isCustomRangeActive, setIsCustomRangeActive] = useState(false);

  const scrollRef = React.useRef<Animated.ScrollView>(null);
  const transactionsListY = React.useRef(0);
  const [weeksWithData, setWeeksWithData] = useState<Record<number, boolean>>({});
  const { format, currency } = useCurrency();
  const user = auth.currentUser;
  const weeks = getWeeksOfMonth(selectedYear, Number(selectedMonth));
  const currentWeek = weeks[selectedWeekIndex] || weeks[0];

  useEffect(() => {
    setSelectedWeekIndex(0);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (!user) return;

    let startOfMonth = new Date(selectedYear, Number(selectedMonth), 1);
    let endOfMonth = new Date(selectedYear, Number(selectedMonth) + 1, 0, 23, 59, 59);

    if (showAllHistory && isCustomRangeActive && customRange) {
      startOfMonth = customRange.start;
      endOfMonth = customRange.end;
    }

    const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      handleSnapshot(snapshot);
    }, (error: any) => {
      console.error("Firestore Error:", error);
    });

    function handleSnapshot(snapshot: any) {
      let grossIncome = 0;
      let grossExpense = 0;

      const rawList: RawTransaction[] = snapshot.docs.map((doc: any) => {
        const data = doc.data({ serverTimestamps: 'estimate' });
        const rawDate = data.date || data.createdAt;
        let finalDate: Date;

        if (rawDate && typeof rawDate.toDate === 'function') {
          finalDate = rawDate.toDate();
        } else if (rawDate instanceof Date) {
          finalDate = rawDate;
        } else if (rawDate) {
          finalDate = new Date(rawDate);
        } else {
          finalDate = new Date();
        }

        return {
          id: doc.id,
          ...data,
          createdAt: finalDate,
        } as RawTransaction;
      }).filter((t: RawTransaction) => {
        if (showAllHistory && !isCustomRangeActive) return true;
        return t.createdAt >= startOfMonth && t.createdAt <= endOfMonth;
      }).sort((a: RawTransaction, b: RawTransaction) => b.createdAt.getTime() - a.createdAt.getTime());

      rawList.forEach((t) => {
        if (t.type === "income") grossIncome += t.amountUSD || t.amount;
        else grossExpense += t.amountUSD || t.amount;
      });


      let weekBalance = 0;
      const grouped: TransactionGroup[] = [];
      const dayTotals: Record<string, number> = {};

      const weekFilteredList = rawList.filter(t => {
        const filterMatch = filterMode === 'all' || t.type === filterMode;
        if (showAllHistory) return filterMatch;

        const txDate = t.createdAt.getTime();
        const dateMatch = txDate >= currentWeek.start.getTime() && txDate <= currentWeek.end.getTime();
        return dateMatch && filterMatch;
      });

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
          time: timeStr
        });

        const valForTotal = (t.amountUSD || t.amount || 0);
        const signedVal = t.type === 'income' ? valForTotal : -valForTotal;
        dayTotals[fullDate] += signedVal;
        weekBalance += signedVal;
      });

      grouped.forEach(g => {
        const total = dayTotals[g.fullDate];
        g.dailyTotal = format(total, { compact: true, showSign: true, threshold: 1000000000 });
      });

      const weeksStatus: Record<number, boolean> = {};
      weeks.forEach((w, i) => {
        weeksStatus[i] = rawList.some(t => t.createdAt.getTime() >= w.start.getTime() && t.createdAt.getTime() <= w.end.getTime());
      });
      setWeeksWithData(weeksStatus);

      setTransactions(grouped);
      setMonthIncome(grossIncome);
      setMonthExpense(grossExpense);
      setMonthProfit(grossIncome - grossExpense);
      setWeekIncome(weekBalance);
    }


    return () => unsubscribe && unsubscribe();
  }, [selectedMonth, selectedYear, selectedWeekIndex, filterMode, currency, user, showAllHistory, isCustomRangeActive, customRange]);

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
        // Scroll Down -> Hide Tab Bar
        tabBarOffset.value = 150;
      } else if (deltaY < -2) {
        // Scroll Up -> Show Tab Bar
        tabBarOffset.value = 0;
      }
      lastScrollY.value = currentY;
    },
  });

  const handleDeleteTransaction = (transactionId: string, title: string) => {
    try {
      // OPTIMISTIC DELETE: Don't await
      deleteDoc(doc(db, "transactions", transactionId))
        .catch(err => console.error("History Delete Error", err));

      showAlert('Action Recorded', 'The transaction is being deleted and will sync soon.', 'success');
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      showAlert('Error', 'We could not delete the transaction. Please try again.', 'alert');
    }


  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >

        <View style={styles.headerRow}>
          <View style={styles.splitHeaderContainer}>
            <Pressable style={styles.monthSelectorPart} onPress={() => setIsPickerVisible(true)}>
              <View style={styles.calendarIconContainer}>
                <Calendar color="#3b82f6" size={20} fill="rgba(59, 130, 246, 0.1)" strokeWidth={2.5} />
              </View>
              <Text style={styles.monthText} numberOfLines={1} adjustsFontSizeToFit>
                {showAllHistory
                  ? "ALL TRANSACTIONS"
                  : `${LUNI.find(l => l.value === selectedMonth)?.label} ${selectedYear}`}
              </Text>
              <View style={styles.chevronIconContainer}>
                <ChevronDown color="#3b82f6" size={18} strokeWidth={2.5} />
              </View>
            </Pressable>

            <TouchableOpacity
              style={[styles.historyTogglePart, showAllHistory && styles.historyTogglePartActive]}
              onPress={() => {
                setShowAllHistory(!showAllHistory);
                setIsCustomRangeActive(false);
              }}
            >
              <Text style={[styles.historyToggleText, showAllHistory && styles.historyToggleTextActive]}>ALL</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => showAlert('Total Income Details', `Total Income: ${format(monthIncome)}\nTotal Expense: ${format(-monthExpense)}\nNet Profit/Loss: ${format(monthProfit)}`, 'info')}
        >


          <View style={styles.summaryCardLarge}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryMetric}>
                <Text style={[styles.summaryLabel, { color: 'rgba(49, 230, 169, 0.4)' }]}>TOTAL INCOME</Text>
                <Text
                  style={[styles.summaryValue, { color: '#10b981' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {format(monthIncome, { compact: true, showSign: true })}
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
                  {format(-monthExpense, { compact: true })}
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
                {format(monthProfit, { compact: true, showSign: true })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>


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
                    setSelectedWeekIndex(index);
                    // Animated scroll ONLY if the week has transactions
                    if (weeksWithData[index]) {
                      scrollRef.current?.scrollTo({
                        y: transactionsListY.current - 10,
                        animated: true
                      });
                    }
                  }}
                  style={[
                    styles.weekCard,
                    selectedWeekIndex === index && styles.weekCardActive
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
            <Text style={styles.weekTitle} numberOfLines={1} adjustsFontSizeToFit>
              {showAllHistory
                ? (isCustomRangeActive && customRange ? `${customRange.start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${customRange.end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : "All History")
                : `Week ${weeks[selectedWeekIndex]?.label}`}
            </Text>
            <View style={{ flexDirection: 'row', gap: horizontalScale(8) }}>
              {showAllHistory && (
                <TouchableOpacity
                  style={[styles.filterIconButton, isCustomRangeActive && styles.filterIconButtonActive]}
                  onPress={() => setIsRangePickerVisible(true)}
                >
                  <CalendarDays color={isCustomRangeActive ? "#3b82f6" : "rgba(255,255,255,0.4)"} size={14} strokeWidth={2.5} />
                  <Text style={[styles.filterModeLabel, { color: isCustomRangeActive ? "#3b82f6" : "rgba(255,255,255,0.4)" }]}>RANGE</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.filterIconButton,
                  filterMode !== 'all' && styles.filterIconButtonActive,
                  { borderColor: filterMode === 'all' ? 'rgba(255,255,255,0.2)' : (filterMode === 'income' ? 'rgba(16, 183, 127, 0.4)' : 'rgba(235, 86, 86, 0.4)') }
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
                  {filterMode === 'all' ? 'ALL TYPES' : filterMode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.weekIncomeLabelSmall}>
            {showAllHistory ? 'TOTAL BALANCE: ' : 'WEEK BALANCE: '}<Text
              style={[styles.weekIncomeValueSmall, { color: weekIncome >= 0 ? '#10b981' : '#eb5656' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {format(weekIncome, { compact: true, showSign: true })}
            </Text>
          </Text>
        </View>

        <View style={styles.separator} />

        {transactions.length > 0 ? (
          transactions.map((group, idx) => (
            <View key={idx} style={[styles.dayGroup, showAllHistory && { marginBottom: horizontalScale(10) }]}>
              {!showAllHistory && (
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
              )}

              <View style={styles.transactionsContainerLegacy}>
                {group.data.map((item: TransactionItem) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      onPress={() => setExpandedId(isExpanded ? null : item.id)}
                      onLongPress={() => showAlert(
                        'Delete Transaction',
                        'Are you sure you want to delete this transaction?',
                        'alert',
                        async () => { handleDeleteTransaction(item.id, item.title) },
                        true,
                        true

                      )}
                      delayLongPress={300}
                      style={[
                        styles.transactionCard,
                        { borderColor: item.type === 'income' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(235, 86, 86, 0.6)' },
                        isExpanded && styles.transactionCardExpanded
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
                          <Text style={styles.transactionTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.transactionSub} numberOfLines={isExpanded ? undefined : 1}>{item.sub}</Text>
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

                      {isExpanded && (
                        <View style={styles.expandedContent}>
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
                  );
                })}
              </View>
              {!showAllHistory && idx < transactions.length - 1 && (
                <View style={styles.daySeparator} />
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Wallet size={48} color="rgba(255,255,255,0.1)" strokeWidth={1} />
            <Text style={styles.emptyStateTitle}>
              {showAllHistory ? "No transactions found" : `Nothing found for Week ${weeks[selectedWeekIndex]?.label}`}
            </Text>
            <Text style={styles.emptyStateText}>Try selecting another week or add a new transaction.</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
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
    </View>
  );
};
