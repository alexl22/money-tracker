import { collection, doc, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { ShoppingBag, Wallet } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { parseCompatibleDate, useTransactions } from '../../context/TransactionsContext';
import { auth, db } from '../../firebaseConfig';
import { computeDisplayFromStats, MonthlyStatsDoc } from '../../utils/statsManager';
import { RawTransaction, TransactionGroup } from './types';
import { WeekInfo } from './WeekSelector';

export interface UseHistoryDataParams {
  selectedMonth: string;
  selectedYear: number;
  selectedWeekIndex: number;
  filterMode: 'all' | 'income' | 'expense';
  sortOrder: 'none' | 'amount-desc' | 'amount-asc';
  showAllHistory: boolean;
  isCustomRangeActive: boolean;
  customRange: { start: Date; end: Date } | null;
  displayLimit: number;
  weeks: WeekInfo[];
  currentWeek: WeekInfo;
}

export function useHistoryData({
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
}: UseHistoryDataParams) {
  const { transactions: allRawTransactions, userStats, searchQuery, isSearching, loadAllTransactions } = useTransactions();
  const { format, currency, rates } = useCurrency();
  const user = auth.currentUser;

  const [monthTransactions, setMonthTransactions] = useState<RawTransaction[]>([]);
  const [monthlyStatsDoc, setMonthlyStatsDoc] = useState<MonthlyStatsDoc | null>(null);
  const [isMonthLoading, setIsMonthLoading] = useState(false);

  // Load all transactions on-demand only when user is searching or viewing All History
  useEffect(() => {
    if (showAllHistory || isSearching || (searchQuery && searchQuery.trim().length > 0)) {
      loadAllTransactions();
    }
  }, [showAllHistory, isSearching, searchQuery, loadAllTransactions]);

  // Listener for MonthlyStatsDoc
  useEffect(() => {
    if (!user) {
      setMonthlyStatsDoc(null);
      return;
    }
    const docId = `${selectedYear}-${String(Number(selectedMonth) + 1).padStart(2, '0')}`;
    const monthlyRef = doc(db, 'users', user.uid, 'monthlyStats', docId);
    const unsub = onSnapshot(
      monthlyRef,
      (snap) => {
        if (snap && snap.exists()) {
          setMonthlyStatsDoc(snap.data() as MonthlyStatsDoc);
        } else {
          setMonthlyStatsDoc(null);
        }
      },
      (err) => {
        console.error('History monthly stats snapshot error:', err);
      }
    );
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

    const unsub = onSnapshot(
      q,
      (snapshot) => {
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
      },
      (err) => {
        setIsMonthLoading(false);
        console.error('[History] Month transactions snapshot error:', err);
        // Fallback: If month query fails (e.g. index building), load all transactions so screen is not blank
        loadAllTransactions();
      }
    );

    return () => unsub();
  }, [user, selectedMonth, selectedYear, showAllHistory, isSearching, searchQuery, loadAllTransactions]);

  const historyData = useMemo(() => {
    if (!user) {
      return {
        transactions: [] as TransactionGroup[],
        monthIncome: 0,
        monthExpense: 0,
        monthProfit: 0,
        weekIncome: 0,
        weeksWithData: {} as Record<number, boolean>,
        txCount: 0,
      };
    }

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

    const activeTransactionsList =
      showAllHistory || isSearching || (searchQuery && searchQuery.trim().length > 0) || monthTransactions.length === 0
        ? allRawTransactions.length > 0
          ? allRawTransactions
          : monthTransactions
        : monthTransactions;

    const monthList = activeTransactionsList.filter((t: RawTransaction) => {
      if (showAllHistory && !isCustomRangeActive) return true;
      return t.createdAt >= startOfMonth && t.createdAt <= endOfMonth;
    });

    const weekFilteredList = monthList.filter((t) => {
      const filterMatch = filterMode === 'all' || t.type === filterMode;
      const searchMatch =
        !searchQuery ||
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
        const valToSum =
          t.currency === currency
            ? t.amount
            : (t.amountUSD || t.amount / (rates?.[t.currency] || 1)) * (rates?.[currency] || 1);
        if (t.type === 'income') grossIncome += valToSum;
        else grossExpense += valToSum;
      });
    } else if (!hasMonthlyStats && !hasAllStats) {
      monthList.forEach((t) => {
        const valToSum =
          t.currency === currency
            ? t.amount
            : (t.amountUSD || t.amount / (rates?.[t.currency] || 1)) * (rates?.[currency] || 1);
        if (t.type === 'income') grossIncome += valToSum;
        else grossExpense += valToSum;
      });
    }

    let weekBalance = 0;
    const grouped: TransactionGroup[] = [];
    const dayTotals: Record<string, number> = {};

    weekFilteredList.forEach((t) => {
      const dateLabel =
        t.createdAt.toDateString() === new Date().toDateString()
          ? 'Today'
          : t.createdAt.toDateString() === new Date(Date.now() - 86400000).toDateString()
          ? 'Yesterday'
          : t.createdAt.toLocaleDateString('en-US', { weekday: 'long' });

      const fullDate = t.createdAt
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        .toUpperCase();

      let dayGroup = grouped.find((g) => g.fullDate === fullDate);
      if (!dayGroup) {
        dayGroup = {
          date: dateLabel,
          fullDate: fullDate,
          dailyTotal: '',
          data: [],
        };
        grouped.push(dayGroup);
        dayTotals[fullDate] = 0;
      }
      const isSameCurrency = t.currency === currency;
      const displayValue = isSameCurrency
        ? t.type === 'income'
          ? t.amount
          : -t.amount
        : t.type === 'income'
        ? t.amountUSD || t.amount
        : -(t.amountUSD || t.amount);

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
        userId: t.userId || user?.uid,
      });

      const valForTotal =
        t.currency === currency
          ? t.amount
          : (t.amountUSD || t.amount / (rates?.[t.currency] || 1)) * (rates?.[currency] || 1);
      const signedVal = t.type === 'income' ? valForTotal : -valForTotal;
      dayTotals[fullDate] += signedVal;
    });

    grouped.forEach((g) => {
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
        weeksStatus[i] = monthList.some(
          (t) => t.createdAt.getTime() >= w.start.getTime() && t.createdAt.getTime() <= w.end.getTime()
        );
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
        const val =
          t.currency === currency
            ? t.amount
            : (t.amountUSD || t.amount / (rates?.[t.currency] || 1)) * (rates?.[currency] || 1);
        if (filterMode === 'all') {
          currentWeekBalance += t.type === 'income' ? val : -val;
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
      grouped.forEach((g) => allItems.push(...g.data));
      allItems.sort((a, b) => {
        return sortOrder === 'amount-desc' ? b.amountUSD - a.amountUSD : a.amountUSD - b.amountUSD;
      });
      const pagedItems = allItems.slice(0, displayLimit);
      return {
        transactions: [
          {
            date: sortOrder === 'amount-desc' ? 'HIGHEST TRANSACTIONS' : 'LOWEST TRANSACTIONS',
            fullDate: 'ALL TIME',
            dailyTotal: '',
            data: pagedItems,
          },
        ],
        monthIncome: grossIncome,
        monthExpense: grossExpense,
        monthProfit: grossIncome - grossExpense,
        weekIncome: weekBalance,
        weeksWithData: weeksStatus,
        txCount: totalCount,
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
            data: g.data.slice(0, remaining),
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
      txCount: totalCount,
    };
  }, [
    allRawTransactions,
    monthTransactions,
    userStats,
    monthlyStatsDoc,
    displayLimit,
    selectedMonth,
    selectedYear,
    selectedWeekIndex,
    filterMode,
    sortOrder,
    currency,
    rates,
    user,
    showAllHistory,
    isCustomRangeActive,
    customRange,
    format,
    searchQuery,
    isSearching,
    currentWeek,
    weeks,
  ]);

  return {
    ...historyData,
    monthTransactions,
    monthlyStatsDoc,
    isMonthLoading,
  };
}
