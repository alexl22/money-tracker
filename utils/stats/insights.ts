import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from '@react-native-firebase/firestore';
import { db } from '../../firebaseConfig';
import { getMonthKey, getWeekKey, parseNumeric, parseRawDate } from './calculators';
import { UserInsights } from './types';

/**
 * Computes all insights mathematically identical to InsightsCarousel
 */
export const computeInsightsFromTransactions = (
  txList: any[],
  now: Date = new Date()
): { insights: UserInsights; firstTxDate: Date | null; lastTxDate: Date | null } => {
  if (!txList || txList.length === 0) {
    return {
      insights: {
        avgWeeklyProfitUSD: 0,
        avgMonthlyProfitUSD: 0,
        bestDayEver: null,
        bestWeekEver: null,
        lastCalculatedAt: now.toISOString(),
      },
      firstTxDate: null,
      lastTxDate: null,
    };
  }

  // 1. Find earliest and latest dates
  let firstTxDate: Date | null = null;
  let lastTxDate: Date | null = null;

  for (const t of txList) {
    const d = parseRawDate(t.date || t.createdAt);
    if (!isNaN(d.getTime())) {
      if (!firstTxDate || d < firstTxDate) firstTxDate = d;
      if (!lastTxDate || d > lastTxDate) lastTxDate = d;
    }
  }

  // 2. Check 7-day freeze rule
  const msSinceLastTx = lastTxDate ? now.getTime() - lastTxDate.getTime() : 0;
  const daysSinceLastTx = msSinceLastTx / (1000 * 60 * 60 * 24);
  const isPeriodFrozen = daysSinceLastTx >= 7 && lastTxDate !== null;
  const referenceDate = isPeriodFrozen && lastTxDate ? lastTxDate : now;

  const msTotalElapsed = firstTxDate ? referenceDate.getTime() - firstTxDate.getTime() : 0;
  const daysTotalElapsed = Math.max(1, Math.ceil(msTotalElapsed / (1000 * 60 * 60 * 24)));

  let activeIncomeUSD = 0;
  let activeExpenseUSD = 0;
  const calendarWeekMap: Record<string, { incomeUSD: number; expenseUSD: number }> = {};
  const monthlyMap: Record<string, { incomeUSD: number; expenseUSD: number; earliestDay: number }> = {};
  const dailyProfitMap: Record<string, number> = {};

  txList.forEach((t) => {
    const date = parseRawDate(t.date || t.createdAt);
    if (isNaN(date.getTime())) return;

    const cWeekKey = getWeekKey(date);
    const mKey = getMonthKey(date);
    const dStr =
      t.dateString ||
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const amtUSD = parseNumeric(t.amountUSD ?? t.amount);
    const dayOfMonth = date.getDate();
    const isIncome = String(t.type || '').toLowerCase() === 'income';

    if (!calendarWeekMap[cWeekKey]) calendarWeekMap[cWeekKey] = { incomeUSD: 0, expenseUSD: 0 };
    if (!monthlyMap[mKey]) {
      monthlyMap[mKey] = { incomeUSD: 0, expenseUSD: 0, earliestDay: dayOfMonth };
    } else if (dayOfMonth < monthlyMap[mKey].earliestDay) {
      monthlyMap[mKey].earliestDay = dayOfMonth;
    }
    if (!dailyProfitMap[dStr]) dailyProfitMap[dStr] = 0;

    if (isIncome) {
      activeIncomeUSD += amtUSD;
      calendarWeekMap[cWeekKey].incomeUSD += amtUSD;
      monthlyMap[mKey].incomeUSD += amtUSD;
      dailyProfitMap[dStr] += amtUSD;
    } else {
      activeExpenseUSD += amtUSD;
      calendarWeekMap[cWeekKey].expenseUSD += amtUSD;
      monthlyMap[mKey].expenseUSD += amtUSD;
      dailyProfitMap[dStr] -= amtUSD;
    }
  });

  const activeProfitUSD = activeIncomeUSD - activeExpenseUSD;

  // Weekly Average & Best Week Ever
  const refCopy = new Date(referenceDate);
  refCopy.setHours(0, 0, 0, 0);
  const refDay = refCopy.getDay();
  const refDiff = refCopy.getDate() - refDay + (refDay === 0 ? -6 : 1);
  refCopy.setDate(refDiff);
  const currentCalendarWeekKey = refCopy.toISOString().slice(0, 10);
  const dayInWeek = referenceDate.getDay() === 0 ? 7 : referenceDate.getDay();
  const isCurrentWeekEligible = dayInWeek / 7 >= 0.75; // Saturday (85.7%) or Sunday (100%)

  const eligibleCWeekKeys = Object.keys(calendarWeekMap)
    .sort()
    .filter((k) => {
      if (k === currentCalendarWeekKey) return isCurrentWeekEligible;
      return true;
    });

  const cWeekProfits = eligibleCWeekKeys.map((k) => calendarWeekMap[k].incomeUSD - calendarWeekMap[k].expenseUSD);
  const avgWeeklyProfitUSD =
    cWeekProfits.length > 0
      ? cWeekProfits.reduce((a, b) => a + b, 0) / cWeekProfits.length
      : activeProfitUSD / Math.max(1, Math.floor(daysTotalElapsed / 7));

  let bestWeekProfitUSD = -Infinity;
  let bestWeekLabel = '';
  let bestWeekKey = '';
  eligibleCWeekKeys.forEach((k) => {
    const profit = calendarWeekMap[k].incomeUSD - calendarWeekMap[k].expenseUSD;
    if (profit > bestWeekProfitUSD) {
      bestWeekProfitUSD = profit;
      bestWeekKey = k;
      const bDate = new Date(k);
      const eDate = new Date(bDate);
      eDate.setDate(bDate.getDate() + 6);
      bestWeekLabel = `${bDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${eDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
    }
  });

  // Monthly Average
  const currentMonthKey = getMonthKey(referenceDate);
  const totalDaysInCurMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
  const isCurMonthEligible = referenceDate.getDate() / totalDaysInCurMonth >= 0.75;

  const eligibleMonthKeys = Object.keys(monthlyMap)
    .sort()
    .filter((k) => {
      const mData = monthlyMap[k];
      if (!mData || mData.incomeUSD <= 0) return false;
      if (mData.earliestDay > 15) return false;
      if (k === currentMonthKey) return isCurMonthEligible;
      return true;
    });

  const eligibleMonthProfits = eligibleMonthKeys.map((k) => monthlyMap[k].incomeUSD - monthlyMap[k].expenseUSD);
  const monthsElapsed = firstTxDate
    ? Math.max(
        1,
        (referenceDate.getFullYear() - firstTxDate.getFullYear()) * 12 +
          referenceDate.getMonth() -
          firstTxDate.getMonth()
      )
    : 1;
  const eligibleMonthsCount = Math.max(1, monthsElapsed + (isCurMonthEligible ? 1 : 0));
  const avgMonthlyProfitUSD =
    eligibleMonthProfits.length > 0
      ? eligibleMonthProfits.reduce((a, b) => a + b, 0) / eligibleMonthProfits.length
      : activeProfitUSD / eligibleMonthsCount;

  // Best Day Ever
  let bestDayProfitUSD = -Infinity;
  let bestDayDate = '';
  Object.entries(dailyProfitMap).forEach(([dStr, profitUSD]) => {
    if (profitUSD > bestDayProfitUSD) {
      bestDayProfitUSD = profitUSD;
      bestDayDate = dStr;
    }
  });

  return {
    insights: {
      avgWeeklyProfitUSD: Math.round(avgWeeklyProfitUSD * 100) / 100,
      avgMonthlyProfitUSD: Math.round(avgMonthlyProfitUSD * 100) / 100,
      bestDayEver:
        bestDayDate && bestDayProfitUSD > 0
          ? { dateStr: bestDayDate, profitUSD: Math.round(bestDayProfitUSD * 100) / 100 }
          : null,
      bestWeekEver:
        bestWeekLabel && bestWeekProfitUSD > 0
          ? { weekKey: bestWeekKey, weekLabel: bestWeekLabel, profitUSD: Math.round(bestWeekProfitUSD * 100) / 100 }
          : null,
      lastCalculatedAt: now.toISOString(),
    },
    firstTxDate,
    lastTxDate,
  };
};

/**
 * Recomputes all insights directly from Firestore and updates users/{userId}
 */
export const recomputeAndSaveInsights = async (
  userId: string,
  txListOverride?: any[]
): Promise<UserInsights | null> => {
  try {
    let txList = txListOverride;
    if (!txList) {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      txList = snapshot.docs.map((d) => d.data());
    }
    const { insights, lastTxDate, firstTxDate } = computeInsightsFromTransactions(txList);

    const userRef = doc(db, 'users', userId);
    const updates: Record<string, any> = {
      insights,
    };
    if (lastTxDate) {
      updates.lastTransactionDate = lastTxDate.toISOString();
    }
    if (firstTxDate) {
      updates.firstTransactionDate = firstTxDate.toISOString();
    }
    await setDoc(userRef, updates, { merge: true });
    return insights;
  } catch (err) {
    console.error('[statsManager] Error in recomputeAndSaveInsights:', err);
    return null;
  }
};
