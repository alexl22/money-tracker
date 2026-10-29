import { doc, onSnapshot } from '@react-native-firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { useTransactions } from '../../context/TransactionsContext';
import { auth, db } from '../../firebaseConfig';
import { computeDisplayFromStats, MonthlyStatsDoc } from '../../utils/statsManager';

interface UseHomeMetricsParams {
  viewMode: 'total' | 'month' | 'range';
  selectedMonth: string;
  selectedYear: number;
  rangeStart: Date;
  rangeEnd: Date;
}

export function useHomeMetrics({
  viewMode,
  selectedMonth,
  selectedYear,
  rangeStart,
  rangeEnd,
}: UseHomeMetricsParams) {
  const { transactions: rawTransactions, userStats } = useTransactions();
  const { currency, rates } = useCurrency();
  const [monthlyStatsDoc, setMonthlyStatsDoc] = useState<MonthlyStatsDoc | null>(null);

  useEffect(() => {
    if (viewMode !== 'month' || !auth.currentUser) return;
    const mKey = `${selectedYear}-${String(parseInt(selectedMonth, 10) + 1).padStart(2, '0')}`;
    const monthlyRef = doc(db, 'users', auth.currentUser.uid, 'monthlyStats', mKey);
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
        console.warn('Home monthlyStats listener error:', err);
      }
    );
    return () => unsub();
  }, [viewMode, selectedMonth, selectedYear]);

  const metrics = useMemo(() => {
    // 1. FAST PATH FOR TOTAL MODE: Use userStats directly without iterating transactions
    if (viewMode === 'total' && userStats && userStats.statsCalibrated && (userStats.totalTransactionsCount || 0) > 0) {
      const display = computeDisplayFromStats(userStats, currency, rates);
      const earliestDate = userStats.firstTransactionDate || userStats.firstIncomeDate
        ? new Date(userStats.firstTransactionDate || userStats.firstIncomeDate!)
        : new Date();
      const now = new Date();
      const startYear = earliestDate.getFullYear();
      const startMonth = earliestDate.getMonth();
      const currentYearLocal = now.getFullYear();
      const currentMonthLocal = now.getMonth();
      const monthsDiff = Math.max(1, (currentYearLocal - startYear) * 12 + (currentMonthLocal - startMonth) + 1);

      return {
        totalIncome: display.income,
        totalExpenses: display.expense,
        averageIncome: display.income / monthsDiff,
        averageExpenses: display.expense / monthsDiff,
      };
    }

    // 2. FAST PATH FOR MONTH MODE: Use monthlyStatsDoc directly
    if (viewMode === 'month' && monthlyStatsDoc) {
      const display = computeDisplayFromStats(monthlyStatsDoc, currency, rates);
      const daysInSelectedMonth = new Date(selectedYear, parseInt(selectedMonth, 10) + 1, 0).getDate();
      return {
        totalIncome: display.income,
        totalExpenses: display.expense,
        averageIncome: display.income / daysInSelectedMonth,
        averageExpenses: display.expense / daysInSelectedMonth,
      };
    }

    // 3. Fallback or RANGE mode: calculate from rawTransactions
    let currentTotalIncome = 0;
    let currentTotalExpenses = 0;
    let earliestDate = new Date();
    let hasTransactions = false;

    rawTransactions.forEach((t: any) => {
      let transactionDate: Date;

      const rawDate = t.date || t.createdAt;
      if (rawDate && typeof rawDate.toDate === 'function') {
        transactionDate = rawDate.toDate();
      } else if (rawDate instanceof Date) {
        transactionDate = rawDate;
      } else if (rawDate && typeof rawDate.seconds === 'number') {
        transactionDate = new Date(rawDate.seconds * 1000);
      } else if (rawDate) {
        transactionDate = new Date(rawDate);
      } else {
        transactionDate = new Date();
      }

      if (!hasTransactions || transactionDate < earliestDate) {
        earliestDate = transactionDate;
        hasTransactions = true;
      }

      const matchesFilter =
        viewMode === 'total' ||
        (viewMode === 'month' &&
          transactionDate.getMonth().toString() === selectedMonth &&
          transactionDate.getFullYear() === selectedYear) ||
        (viewMode === 'range' && transactionDate >= rangeStart && transactionDate <= rangeEnd);

      const valueToSum =
        t.currency === currency
          ? t.amount
          : (t.amountUSD || t.amount / (rates?.[t.currency] || 1)) * (rates?.[currency] || 1);

      if (matchesFilter) {
        if (t.type === 'income') {
          currentTotalIncome += valueToSum;
        } else {
          currentTotalExpenses += valueToSum;
        }
      }
    });

    let computedAvgIncome = 0;
    let computedAvgExpenses = 0;

    if (viewMode === 'month') {
      const daysInSelectedMonth = new Date(selectedYear, parseInt(selectedMonth, 10) + 1, 0).getDate();
      computedAvgIncome = currentTotalIncome / daysInSelectedMonth;
      computedAvgExpenses = currentTotalExpenses / daysInSelectedMonth;
    } else if (viewMode === 'range') {
      const diffTime = Math.abs(rangeEnd.getTime() - rangeStart.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      computedAvgIncome = currentTotalIncome / diffDays;
      computedAvgExpenses = currentTotalExpenses / diffDays;
    } else {
      const now = new Date();
      const startYear = earliestDate.getFullYear();
      const startMonth = earliestDate.getMonth();
      const currentYearLocal = now.getFullYear();
      const currentMonthLocal = now.getMonth();
      const monthsDiff = hasTransactions
        ? (currentYearLocal - startYear) * 12 + (currentMonthLocal - startMonth) + 1
        : 1;
      computedAvgIncome = currentTotalIncome / monthsDiff;
      computedAvgExpenses = currentTotalExpenses / monthsDiff;
    }

    return {
      totalIncome: currentTotalIncome,
      totalExpenses: currentTotalExpenses,
      averageIncome: computedAvgIncome,
      averageExpenses: computedAvgExpenses,
    };
  }, [
    rawTransactions,
    userStats,
    monthlyStatsDoc,
    viewMode,
    selectedMonth,
    selectedYear,
    rangeStart,
    rangeEnd,
    currency,
    rates,
  ]);

  return {
    ...metrics,
    monthlyStatsDoc,
  };
}
