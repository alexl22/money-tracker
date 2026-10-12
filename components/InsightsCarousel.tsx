import {
  BarChart2,
  Calendar,
  Clock,
  Flame,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useCurrency } from '../context/CurrencyContext';
import { Transaction } from '../context/TransactionsContext';
import { moderateScale, horizontalScale } from '../utils/scaling';


const INTERVAL_MS = 3000;
const FADE_DURATION = 350;

interface Insight {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}

interface InsightsCarouselProps {
  transactions: Transaction[];
  currency: string;
  rates?: Record<string, number>;
  format: (value: number, options?: any) => string;
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function InsightsCarousel({ transactions, currency, rates, format }: InsightsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const opacity = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const insights: Insight[] = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    const now = new Date();

    // --- Helper: convert any transaction amount to current currency ---
    const toCurrentCurrency = (t: Transaction) => {
      if (t.currency === currency) return t.amount;
      return (t.amountUSD || (t.amount / (rates?.[t.currency] || 1))) * (rates?.[currency] || 1);
    };

    const currentYear = now.getFullYear();
    const yearTransactions = transactions.filter(t => {
      const raw = (t.date || t.createdAt) as any;
      const d = raw?.toDate ? raw.toDate() : raw instanceof Date ? raw : new Date(raw?.seconds ? raw.seconds * 1000 : raw);
      return d.getFullYear() === currentYear;
    });

    // Find the first income transaction of the current year to establish when active tracking began
    const incomeTransactions = yearTransactions.filter(t => t.type === 'income');
    const firstIncomeDate = incomeTransactions.length > 0
      ? incomeTransactions.reduce((min, t) => {
          const raw = (t.date || t.createdAt) as any;
          const d = raw?.toDate ? raw.toDate() : raw instanceof Date ? raw : new Date(raw?.seconds ? raw.seconds * 1000 : raw);
          return d < min ? d : min;
        }, new Date())
      : null;

    // Only consider transactions on or after the first income transaction to clean up pre-active tests/expenses
    const activeTransactions = firstIncomeDate
      ? yearTransactions.filter(t => {
          const raw = (t.date || t.createdAt) as any;
          const d = raw?.toDate ? raw.toDate() : raw instanceof Date ? raw : new Date(raw?.seconds ? raw.seconds * 1000 : raw);
          const compareDate = new Date(d);
          compareDate.setHours(0, 0, 0, 0);
          const compareFirst = new Date(firstIncomeDate);
          compareFirst.setHours(0, 0, 0, 0);
          return compareDate >= compareFirst;
        })
      : yearTransactions;
    // --- Group transactions by week, month and calendar date ---
    const weekMap: Record<string, { income: number; expense: number }> = {};
    const monthMap: Record<string, { income: number; expense: number }> = {};
    const dailyProfitMap: Record<string, number> = {}; // "YYYY-MM-DD" -> net profit

    activeTransactions.forEach(t => {
      const raw = (t.date || t.createdAt) as any;
      const date: Date = raw?.toDate ? raw.toDate() : raw instanceof Date ? raw : new Date(raw?.seconds ? raw.seconds * 1000 : raw);
      const amount = toCurrentCurrency(t);
      const weekKey = getWeekKey(date);
      const monthKey = getMonthKey(date);

      // Construct timezone-safe local date string "YYYY-MM-DD"
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!weekMap[weekKey]) weekMap[weekKey] = { income: 0, expense: 0 };
      if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expense: 0 };
      if (!dailyProfitMap[dateString]) dailyProfitMap[dateString] = 0;

      const sign = t.type === 'income' ? 1 : -1;
      weekMap[weekKey].income += t.type === 'income' ? amount : 0;
      weekMap[weekKey].expense += t.type === 'expense' ? amount : 0;
      monthMap[monthKey].income += t.type === 'income' ? amount : 0;
      monthMap[monthKey].expense += t.type === 'expense' ? amount : 0;
      dailyProfitMap[dateString] += sign * amount;
    });

    const weekKeys = Object.keys(weekMap).sort();
    const monthKeys = Object.keys(monthMap).sort();

    // Determine current week/month eligibility (>= 75% completed)
    const currentWeekKey = getWeekKey(now);
    const isCurrentWeekEligible = now.getDay() === 0 || now.getDay() === 6; // Sunday (0) or Saturday (6)

    const currentMonthKey = getMonthKey(now);
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const isCurrentMonthEligible = (now.getDate() / totalDaysInMonth) >= 0.75;

    const filteredWeekKeys = weekKeys.filter(k => {
      if (k === currentWeekKey) return isCurrentWeekEligible;
      return true;
    });

    const filteredMonthKeys = monthKeys.filter(k => {
      if (k === currentMonthKey) return isCurrentMonthEligible;
      return true;
    });

    // --- 1. Daily average profit ---
    const msTotalElapsed = firstIncomeDate ? now.getTime() - firstIncomeDate.getTime() : 0;
    const daysTotalElapsed = Math.max(1, Math.ceil(msTotalElapsed / (1000 * 60 * 60 * 24)));
    const totalIncomeAll = activeTransactions.filter(t => t.type === 'income').reduce((s, t) => s + toCurrentCurrency(t), 0);
    const totalExpenseAll = activeTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + toCurrentCurrency(t), 0);
    const avgDailyProfit = (totalIncomeAll - totalExpenseAll) / daysTotalElapsed;

    // --- Find Best Day Ever (single-day record) ---
    let bestDateString = '';
    let maxDailyProfit = -Infinity;
    Object.entries(dailyProfitMap).forEach(([dateStr, profit]) => {
      if (profit > maxDailyProfit) {
        maxDailyProfit = profit;
        bestDateString = dateStr;
      }
    });

    // --- 2. Weekly average profit ---
    const weekProfits = filteredWeekKeys.map(k => weekMap[k].income - weekMap[k].expense);
    const avgWeeklyProfit = weekProfits.length > 0 ? weekProfits.reduce((a, b) => a + b, 0) / weekProfits.length : 0;

    // --- 3. Monthly average profit ---
    const monthProfits = filteredMonthKeys.map(k => monthMap[k].income - monthMap[k].expense);
    const avgMonthlyProfit = monthProfits.length > 0 ? monthProfits.reduce((a, b) => a + b, 0) / monthProfits.length : 0;
    const result: Insight[] = [];

    // 0. Daily avg
    result.push({
      icon: <Clock color="#10b981" size={16} strokeWidth={2.5} />,
      label: 'DAILY AVERAGE',
      value: format(avgDailyProfit, { isConverted: true, showSign: true }),
      sub: `across ${daysTotalElapsed} day${daysTotalElapsed !== 1 ? 's' : ''}`,
      color: avgDailyProfit >= 0 ? '#10b981' : '#eb5656',
    });

    // 1. Weekly avg
    result.push({
      icon: <BarChart2 color="#3b82f6" size={16} strokeWidth={2.5} />,
      label: 'WEEKLY AVERAGE',
      value: format(avgWeeklyProfit, { isConverted: true, showSign: true }),
      sub: `across ${weekProfits.length} week${weekProfits.length !== 1 ? 's' : ''}`,
      color: avgWeeklyProfit >= 0 ? '#3b82f6' : '#eb5656',
    });

    // 2. Monthly avg
    result.push({
      icon: <Calendar color="#a78bfa" size={16} strokeWidth={2.5} />,
      label: 'MONTHLY AVERAGE',
      value: format(avgMonthlyProfit, { isConverted: true, showSign: true }),
      sub: `across ${monthProfits.length} month${monthProfits.length !== 1 ? 's' : ''}`,
      color: avgMonthlyProfit >= 0 ? '#a78bfa' : '#eb5656',
    });

    // 4. Best week ever
    if (weekProfits.length > 0) {
      const bestProfit = Math.max(...weekProfits);
      const bestWeekKey = filteredWeekKeys[weekProfits.indexOf(bestProfit)];
      const bestDate = new Date(bestWeekKey);
      const endDate = new Date(bestDate);
      endDate.setDate(bestDate.getDate() + 6);
      const bestWeekLabel = `${bestDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
      result.push({
        icon: <Star color="#fbbf24" size={16} strokeWidth={2.5} />,
        label: 'BEST WEEK EVER',
        value: format(bestProfit, { isConverted: true, showSign: true }),
        sub: `week of ${bestWeekLabel}`,
        color: '#fbbf24',
      });
    }

    // 7. Best day ever (highest single-day net profit)
    if (bestDateString) {
      const bestDateParts = bestDateString.split('-');
      const bestDateObj = new Date(parseInt(bestDateParts[0]), parseInt(bestDateParts[1]) - 1, parseInt(bestDateParts[2]));
      const formattedBestDate = bestDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      result.push({
        icon: <Flame color="#f97316" size={16} strokeWidth={2.5} />,
        label: 'BEST DAY EVER',
        value: format(maxDailyProfit, { isConverted: true, showSign: true }),
        sub: `single-day record on ${formattedBestDate}`,
        color: '#f97316',
      });
    }

    // 3. Projection to end of summer (visible between June 1st and September 30th)
    const startOfSummer = new Date(now.getFullYear(), 5, 1); // June 1st
    const endOfSummer = new Date(now.getFullYear(), 8, 30, 23, 59, 59); // September 30th

    // Find the first transaction of any type in the current summer period (June 1st to September 30th)
    const summerTransactions = activeTransactions.filter(t => {
      const raw = (t.date || t.createdAt) as any;
      const d = raw?.toDate ? raw.toDate() : raw instanceof Date ? raw : new Date(raw?.seconds ? raw.seconds * 1000 : raw);
      return d >= startOfSummer && d <= endOfSummer;
    });

    let firstSummerTxDate: Date | null = null;
    if (summerTransactions.length > 0) {
      firstSummerTxDate = summerTransactions.reduce((min, t) => {
        const raw = (t.date || t.createdAt) as any;
        const d = raw?.toDate ? raw.toDate() : raw instanceof Date ? raw : new Date(raw?.seconds ? raw.seconds * 1000 : raw);
        return d < min ? d : min;
      }, new Date(endOfSummer));
    }

    // Determine activation date for the summer projection card (requires at least one summer transaction + 7 days)
    const activeStartDate = firstSummerTxDate
      ? new Date(firstSummerTxDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;

    if (activeStartDate && now >= activeStartDate && now <= endOfSummer) {
      let summerIncome = 0;
      let summerExpense = 0;

      activeTransactions.forEach(t => {
        const raw = (t.date || t.createdAt) as any;
        const date: Date = raw?.toDate ? raw.toDate() : raw instanceof Date ? raw : new Date(raw?.seconds ? raw.seconds * 1000 : raw);
        if (date >= startOfSummer && date <= endOfSummer) {
          const amount = toCurrentCurrency(t);
          if (t.type === 'income') summerIncome += amount;
          else if (t.type === 'expense') summerExpense += amount;
        }
      });

      const currentSummerProfit = summerIncome - summerExpense;
      
      // Determine when summer tracking actually started (either June 1st or first income date if later)
      const startOfSummerCalculated = firstIncomeDate && firstIncomeDate > startOfSummer
        ? firstIncomeDate
        : startOfSummer;

      const msElapsed = now.getTime() - startOfSummerCalculated.getTime();
      const weeksElapsed = msElapsed / (1000 * 60 * 60 * 24 * 7);
      const weeksElapsedAdjusted = Math.max(1, weeksElapsed); // Avoid division spikes in first week
      const avgWeeklySummerProfit = currentSummerProfit / weeksElapsedAdjusted;

      const msLeft = endOfSummer.getTime() - now.getTime();
      const weeksLeft = msLeft / (1000 * 60 * 60 * 24 * 7);
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      
      const projection = currentSummerProfit + (avgWeeklySummerProfit * weeksLeft);

      result.push({
        icon: <Sparkles color="#f59e0b" size={16} strokeWidth={2.5} />,
        label: 'SUMMER PROJECTION',
        value: format(projection, { isConverted: true, showSign: true }),
        sub: `total summer profit est. (${daysLeft}d left)`,
        color: projection >= 0 ? '#f59e0b' : '#eb5656',
      });
    }

     // 5. Saving rate
    const totalIncome = activeTransactions.filter(t => t.type === 'income').reduce((s, t) => s + toCurrentCurrency(t), 0);
    const totalExpense = activeTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + toCurrentCurrency(t), 0);
    const savingRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0;
    const isGood = savingRate >= 20;
    
    result.push({
      icon: isGood
        ? <TrendingUp color="#10b981" size={16} strokeWidth={2.5} />
        : <TrendingDown color="#f59e0b" size={16} strokeWidth={2.5} />,
      label: 'SAVING RATE',
      value: `${savingRate.toFixed(1)}%`,
      sub: isGood ? 'Great discipline! 🎯' : 'Room to improve',
      color: isGood ? '#10b981' : '#f59e0b',
    });

    return result;
  }, [transactions, currency, rates, format]);

  const advance = useCallback(() => {
    if (insights.length === 0) return;
    opacity.value = withTiming(0, { duration: FADE_DURATION }, (finished) => {
      if (finished) {
        // Switch index on JS thread after fade-out
      }
    });
    setTimeout(() => {
      setActiveIndex(prev => (prev + 1) % insights.length);
      opacity.value = withTiming(1, { duration: FADE_DURATION });
    }, FADE_DURATION);
  }, [insights.length, opacity]);

  useEffect(() => {
    if (insights.length === 0) return;
    timerRef.current = setInterval(advance, INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance, insights.length]);

  // Reset index if insights shrink
  useEffect(() => {
    if (activeIndex >= insights.length && insights.length > 0) setActiveIndex(0);
  }, [insights.length, activeIndex]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (insights.length === 0) return null;

  const current = insights[activeIndex];

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* Icon + label row */}
        <View style={styles.topRow}>
          {current.icon}
          <Text style={styles.label}>{current.label}</Text>
        </View>

        {/* Main value */}
        <Text style={[styles.value, { color: current.color }]} numberOfLines={1} adjustsFontSizeToFit>
          {current.value}
        </Text>

        {/* Sub text */}
        {current.sub && (
          <Text style={styles.sub} numberOfLines={1}>{current.sub}</Text>
        )}
      </Animated.View>

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {insights.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: horizontalScale(4),
  },
  card: {
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(20),
    paddingVertical: horizontalScale(6),
    paddingHorizontal: horizontalScale(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: horizontalScale(2),
    gap: horizontalScale(6),
  },
  label: {
    fontSize: moderateScale(9),
    color: '#ffffffc7',
    opacity: 0.8,
    letterSpacing: 2,
    fontFamily: 'Manrope_700Bold',
  },
  value: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(18),
    letterSpacing: -0.5,
    marginBottom: 0,
  },
  sub: {
    fontSize: moderateScale(10),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_500Medium',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: horizontalScale(4),
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dotActive: {
    width: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
  },
});
