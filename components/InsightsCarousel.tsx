import {
  BarChart2,
  Calendar,
  Clock,
  Flame,
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
import { Transaction } from '../context/TransactionsContext';
import { horizontalScale, moderateScale } from '../utils/scaling';
import { UserStatsDoc } from '../utils/statsManager';

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
  userStats?: UserStatsDoc | null;
  transactions?: Transaction[];
  currency: string;
  rates?: Record<string, number>;
  format: (value: number, options?: any) => string;
}

export function InsightsCarousel({ userStats, currency, rates, format }: InsightsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const opacity = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const insights: Insight[] = useMemo(() => {
    if (!userStats?.insights || (userStats.totalTransactionsCount || 0) === 0) {
      return [];
    }

    const targetRate = rates?.[currency] || 1;
    const ins = userStats.insights;
    const result: Insight[] = [];

    // 0. Daily avg (live from userStats: first/last transaction date and live profit)
    const firstDateRaw = userStats?.firstTransactionDate || userStats?.firstIncomeDate;
    const firstDate = firstDateRaw ? new Date(firstDateRaw) : null;
    const lastDate = userStats?.lastTransactionDate ? new Date(userStats.lastTransactionDate) : null;
    const now = new Date();
    const msSinceLast = lastDate ? now.getTime() - lastDate.getTime() : 0;
    const isFrozen = (msSinceLast / (1000 * 60 * 60 * 24)) >= 7 && lastDate !== null;
    const refDate = isFrozen && lastDate ? lastDate : now;
    const msElapsed = firstDate ? refDate.getTime() - firstDate.getTime() : 0;
    const daysTotalElapsed = Math.max(1, Math.ceil(msElapsed / (1000 * 60 * 60 * 24)));

    const liveIncomeUSD = userStats?.totalIncomeUSD ?? 0;
    const liveExpenseUSD = userStats?.totalExpenseUSD ?? 0;
    const liveProfitUSD = liveIncomeUSD - liveExpenseUSD;
    const liveDailyAvgUSD = liveProfitUSD / daysTotalElapsed;
    const avgDailyProfit = liveDailyAvgUSD * targetRate;

    result.push({
      icon: <Clock color="#10b981" size={16} strokeWidth={2.5} />,
      label: 'DAILY AVERAGE',
      value: format(avgDailyProfit, { isConverted: true, showSign: true }),
      sub: `across ${daysTotalElapsed} day${daysTotalElapsed !== 1 ? 's' : ''}`,
      color: avgDailyProfit >= 0 ? '#10b981' : '#eb5656',
    });

    // 1. Weekly avg
    const avgWeeklyProfit = ins.avgWeeklyProfitUSD * targetRate;
    const weeksElapsed = Math.max(1, Math.floor(daysTotalElapsed / 7));
    result.push({
      icon: <BarChart2 color="#3b82f6" size={16} strokeWidth={2.5} />,
      label: 'WEEKLY AVERAGE',
      value: format(avgWeeklyProfit, { isConverted: true, showSign: true }),
      sub: `across ${weeksElapsed} week${weeksElapsed !== 1 ? 's' : ''}`,
      color: avgWeeklyProfit >= 0 ? '#3b82f6' : '#eb5656',
    });

    // 2. Monthly avg
    const avgMonthlyProfit = ins.avgMonthlyProfitUSD * targetRate;
    const monthsElapsed = Math.max(1, Math.floor(daysTotalElapsed / 30.4));
    result.push({
      icon: <Calendar color="#a78bfa" size={16} strokeWidth={2.5} />,
      label: 'MONTHLY AVERAGE',
      value: format(avgMonthlyProfit, { isConverted: true, showSign: true }),
      sub: `across ${monthsElapsed} month${monthsElapsed !== 1 ? 's' : ''}`,
      color: avgMonthlyProfit >= 0 ? '#a78bfa' : '#eb5656',
    });

    // 3. Best week ever
    if (ins.bestWeekEver && ins.bestWeekEver.profitUSD > 0) {
      const bestProfit = ins.bestWeekEver.profitUSD * targetRate;
      result.push({
        icon: <Star color="#fbbf24" size={16} strokeWidth={2.5} />,
        label: 'BEST WEEK EVER',
        value: format(bestProfit, { isConverted: true, showSign: true }),
        sub: `week of ${ins.bestWeekEver.weekLabel}`,
        color: '#fbbf24',
      });
    }

    // 4. Best day ever
    if (ins.bestDayEver && ins.bestDayEver.profitUSD > 0) {
      const bestProfit = ins.bestDayEver.profitUSD * targetRate;
      const bestDateParts = ins.bestDayEver.dateStr.split('-');
      let formattedBestDate = ins.bestDayEver.dateStr;
      if (bestDateParts.length === 3) {
        const dObj = new Date(parseInt(bestDateParts[0], 10), parseInt(bestDateParts[1], 10) - 1, parseInt(bestDateParts[2], 10));
        formattedBestDate = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      }
      result.push({
        icon: <Flame color="#f97316" size={16} strokeWidth={2.5} />,
        label: 'BEST DAY EVER',
        value: format(bestProfit, { isConverted: true, showSign: true }),
        sub: `single-day record on ${formattedBestDate}`,
        color: '#f97316',
      });
    }

    // 5. Saving rate (live from userStats)
    const liveIncome = userStats?.totalIncomeUSD ?? 0;
    const liveExpense = userStats?.totalExpenseUSD ?? 0;
    const savingRate = liveIncome > 0
      ? Math.max(0, ((liveIncome - liveExpense) / liveIncome) * 100)
      : 0;
    const isGood = savingRate >= 20;
    result.push({
      icon: isGood
        ? <TrendingUp color="#10b981" size={16} strokeWidth={2.5} />
        : <TrendingDown color="#f59e0b" size={16} strokeWidth={2.5} />,
      label: 'SAVING RATE',
      value: `${savingRate.toFixed(1)}%`,
      sub: isGood ? 'healthy surplus' : 'below target (20%)',
      color: isGood ? '#10b981' : '#f59e0b',
    });

    return result;
  }, [
    userStats?.insights,
    userStats?.totalTransactionsCount,
    userStats?.totalIncomeUSD,
    userStats?.totalExpenseUSD,
    userStats?.firstTransactionDate,
    userStats?.firstIncomeDate,
    userStats?.lastTransactionDate,
    currency,
    rates,
    format,
  ]);

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
