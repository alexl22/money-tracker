import {
  collection,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from '@react-native-firebase/firestore';
import { auth, db } from '../firebaseConfig';

export interface CurrencyBreakdown {
  income: number;
  expense: number;
}

export interface WeekStats {
  incomeUSD: number;
  expenseUSD: number;
  count: number;
  byCurrency?: Record<string, CurrencyBreakdown>;
}

export interface MonthlyStatsDoc {
  incomeUSD: number;
  expenseUSD: number;
  txCount: number;
  byCurrency?: Record<string, CurrencyBreakdown>;
  weeks: {
    '0': WeekStats;
    '1': WeekStats;
    '2': WeekStats;
    '3': WeekStats;
  };
}

export interface BestDayEver {
  dateStr: string;
  profitUSD: number;
}

export interface BestWeekEver {
  weekKey: string;
  weekLabel: string;
  profitUSD: number;
}

export interface UserInsights {
  avgWeeklyProfitUSD: number;
  avgMonthlyProfitUSD: number;
  bestDayEver: BestDayEver | null;
  bestWeekEver: BestWeekEver | null;
  lastCalculatedAt: string;
}

export interface UserStatsDoc {
  totalIncomeUSD: number;
  totalExpenseUSD: number;
  totalTransactionsCount: number;
  firstIncomeDate?: string | null;
  firstTransactionDate?: string | null;
  lastTransactionDate?: string | null;
  byCurrency?: Record<string, CurrencyBreakdown>;
  statsCalibrated?: boolean;
  insights?: UserInsights;
}

/**
 * Returns Monday-start calendar week key (YYYY-MM-DD)
 */
export const getWeekKey = (date: Date): string => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
};

/**
 * Maps a date to a week index in the month:
 * 0: Days 1-7
 * 1: Days 8-14
 * 2: Days 15-21
 * 3: Days 22-end of month
 */
export const getWeekIndexForDate = (date: Date): number => {
  const day = date.getDate();
  if (day <= 7) return 0;
  if (day <= 14) return 1;
  if (day <= 21) return 2;
  return 3;
};

/**
 * Returns month key in YYYY-MM format
 */
export const getMonthKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

/**
 * Parses raw Firestore date into JavaScript Date
 */
export const parseRawDate = (rawDate: any): Date => {
  let d: Date;
  if (rawDate && typeof rawDate.toDate === 'function') {
    d = rawDate.toDate();
  } else if (rawDate instanceof Date) {
    d = rawDate;
  } else if (rawDate && typeof rawDate.seconds === 'number') {
    d = new Date(rawDate.seconds * 1000);
  } else if (rawDate) {
    d = new Date(rawDate);
  } else {
    d = new Date();
  }
  return isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Safely parse any input (number, string with currency signs/spaces) to a clean finite number
 */
export const parseNumeric = (val: any): number => {
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  if (!val) return 0;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isFinite(num) ? num : 0;
  }
  return 0;
};

/**
 * Helper to compute display totals for a given currency from a stat item
 */
export const computeDisplayFromStats = (
  statItem: any,
  targetCurrency: string,
  rates?: Record<string, number>
) => {
  if (!statItem) {
    return { income: 0, expense: 0, profit: 0 };
  }

  // Support totalIncomeUSD / totalExpenseUSD (from userStats) as well as incomeUSD / expenseUSD (from monthlyStats / weekStats)
  const incUSD = Number(
    statItem.totalIncomeUSD !== undefined
      ? statItem.totalIncomeUSD
      : (statItem.incomeUSD !== undefined
        ? statItem.incomeUSD
        : (statItem.totalIncome || 0))
  );
  const expUSD = Number(
    statItem.totalExpenseUSD !== undefined
      ? statItem.totalExpenseUSD
      : (statItem.expenseUSD !== undefined
        ? statItem.expenseUSD
        : (statItem.totalExpense || 0))
  );

  // If viewing in USD
  if (targetCurrency === 'USD') {
    return {
      income: Math.round(incUSD * 100) / 100,
      expense: Math.round(expUSD * 100) / 100,
      profit: Math.round((incUSD - expUSD) * 100) / 100
    };
  }

  // Build byCurr normalizing nested byCurrency map and any flat 'byCurrency.XXX.income' fields
  const byCurr: Record<string, CurrencyBreakdown> = {};
  if (statItem.byCurrency && typeof statItem.byCurrency === 'object') {
    Object.entries(statItem.byCurrency).forEach(([c, val]: [string, any]) => {
      if (val && typeof val === 'object') {
        byCurr[c] = {
          income: Number(val.income || 0),
          expense: Number(val.expense || 0)
        };
      }
    });
  }

  // Only check flat dot-notation fields if byCurrency map was empty
  if (Object.keys(byCurr).length === 0) {
    Object.keys(statItem).forEach((k) => {
      if (k.startsWith('byCurrency.') && typeof statItem[k] === 'number') {
        const parts = k.split('.');
        if (parts.length === 3) {
          const [, c, field] = parts;
          if (!byCurr[c]) byCurr[c] = { income: 0, expense: 0 };
          if (field === 'income') byCurr[c].income = statItem[k];
          if (field === 'expense') byCurr[c].expense = statItem[k];
        }
      }
    });
  }

  const nativeData = byCurr[targetCurrency];
  const targetRate = rates?.[targetCurrency] || 1;

  if (nativeData && (nativeData.income > 0 || nativeData.expense > 0)) {
    let totalIncome = nativeData.income;
    let totalExpense = nativeData.expense;

    Object.keys(byCurr).forEach((currCode) => {
      if (currCode !== targetCurrency) {
        const item = byCurr[currCode];
        const rateForCurr = rates?.[currCode] || 1;
        if (item.income > 0) {
          totalIncome += (item.income / rateForCurr) * targetRate;
        }
        if (item.expense > 0) {
          totalExpense += (item.expense / rateForCurr) * targetRate;
        }
      }
    });

    return {
      income: Math.round(totalIncome * 100) / 100,
      expense: Math.round(totalExpense * 100) / 100,
      profit: Math.round((totalIncome - totalExpense) * 100) / 100
    };
  }

  // Fallback: convert USD values using exchange rate
  const convIncome = Math.round(incUSD * targetRate * 100) / 100;
  const convExpense = Math.round(expUSD * targetRate * 100) / 100;

  return {
    income: convIncome,
    expense: convExpense,
    profit: Math.round((convIncome - convExpense) * 100) / 100
  };
};

/**
 * Atomic update when a new transaction is created
 */
export const onTransactionCreated = async (tx: {
  userId: string;
  amount: number;
  amountUSD: number;
  currency: string;
  type: 'income' | 'expense';
  date: Date | any;
  dateString?: string;
}) => {
  try {
    const date = parseRawDate(tx.date);
    const monthKey = getMonthKey(date);
    const weekIdx = getWeekIndexForDate(date);
    const dateString = tx.dateString || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isIncome = tx.type === 'income';
    const amountUSD = parseNumeric(tx.amountUSD ?? tx.amount);
    const nativeAmount = parseNumeric(tx.amount);
    const curr = tx.currency || 'USD';

    const userRef = doc(db, 'users', tx.userId);
    const monthlyRef = doc(db, 'users', tx.userId, 'monthlyStats', monthKey);

    const userUpdates: Record<string, any> = {
      totalTransactionsCount: increment(1),
      byCurrency: {
        [curr]: {
          [isIncome ? 'income' : 'expense']: increment(nativeAmount)
        }
      }
    };

    if (isIncome) {
      userUpdates.totalIncomeUSD = increment(amountUSD);
    } else {
      userUpdates.totalExpenseUSD = increment(amountUSD);
    }

    const monthlyUpdates: Record<string, any> = {
      txCount: increment(1),
      byCurrency: {
        [curr]: {
          [isIncome ? 'income' : 'expense']: increment(nativeAmount)
        }
      },
      weeks: {
        [String(weekIdx)]: {
          count: increment(1),
          incomeUSD: increment(isIncome ? amountUSD : 0),
          expenseUSD: increment(isIncome ? 0 : amountUSD),
          byCurrency: {
            [curr]: {
              [isIncome ? 'income' : 'expense']: increment(nativeAmount)
            }
          }
        }
      }
    };

    if (isIncome) {
      monthlyUpdates.incomeUSD = increment(amountUSD);
    } else {
      monthlyUpdates.expenseUSD = increment(amountUSD);
    }

    // Ensure firstTransactionDate / lastTransactionDate and check Best Day Ever
    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data() as UserStatsDoc;
        if (!uData?.firstIncomeDate && !uData?.firstTransactionDate) {
          userUpdates.firstIncomeDate = date.toISOString();
          userUpdates.firstTransactionDate = date.toISOString();
        }
        if (!uData?.lastTransactionDate || date >= new Date(uData.lastTransactionDate)) {
          userUpdates.lastTransactionDate = date.toISOString();
        }

        // Query transactions for this specific dateString to check daily profit
        const daySnap = await getDocs(
          query(collection(db, 'transactions'), where('userId', '==', tx.userId), where('dateString', '==', dateString))
        );
        let dayProfitUSD = 0;
        daySnap.docs.forEach((d) => {
          const dData = d.data();
          const amt = parseNumeric(dData.amountUSD ?? dData.amount);
          if (String(dData.type || '').toLowerCase() === 'income') {
            dayProfitUSD += amt;
          } else {
            dayProfitUSD -= amt;
          }
        });

        const currentBestDay = uData?.insights?.bestDayEver;
        const currentRecordProfit = currentBestDay?.profitUSD ?? 0;
        if (dayProfitUSD > currentRecordProfit && dayProfitUSD > 0) {
          userUpdates.insights = {
            ...(uData?.insights || {}),
            bestDayEver: {
              dateStr: dateString,
              profitUSD: Math.round(dayProfitUSD * 100) / 100,
            }
          };
        } else if (currentBestDay?.dateStr === dateString) {
          if (dayProfitUSD <= 0) {
            // Profit fell to <= 0 on record day -> recalculate
            recomputeAndSaveInsights(tx.userId);
          } else {
            userUpdates.insights = {
              ...(uData?.insights || {}),
              bestDayEver: {
                dateStr: dateString,
                profitUSD: Math.round(dayProfitUSD * 100) / 100,
              }
            };
          }
        }
      }
    } catch (err) {
      console.warn('[statsManager] Error checking firstTransactionDate / bestDay in onTransactionCreated:', err);
    }

    // Apply atomically with merge: true (works offline and online)
    await Promise.all([
      setDoc(userRef, userUpdates, { merge: true }),
      setDoc(monthlyRef, monthlyUpdates, { merge: true })
    ]);
  } catch (err) {
    console.error('[statsManager] Error in onTransactionCreated:', err);
  }
};

/**
 * Atomic update when a transaction is deleted
 */
export const onTransactionDeleted = async (tx: {
  userId?: string;
  amount?: any;
  rawAmount?: any;
  amountUSD?: any;
  currency?: string;
  type?: 'income' | 'expense';
  date?: Date | any;
  createdAt?: Date | any;
  dateString?: string;
}) => {
  try {
    const userId = tx.userId || auth.currentUser?.uid;
    if (!userId) {
      console.warn('[statsManager] onTransactionDeleted: missing userId, skipping atomic decrement');
      return;
    }

    const date = parseRawDate(tx.date || tx.createdAt);
    const monthKey = getMonthKey(date);
    const weekIdx = getWeekIndexForDate(date);
    const dateString = tx.dateString || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isIncome = tx.type === 'income';
    const amountUSD = parseNumeric(tx.amountUSD ?? tx.rawAmount ?? tx.amount);
    const nativeAmount = parseNumeric(tx.rawAmount ?? tx.amount);
    const curr = tx.currency || 'USD';

    const userRef = doc(db, 'users', userId);
    const monthlyRef = doc(db, 'users', userId, 'monthlyStats', monthKey);

    const userUpdates: Record<string, any> = {
      totalTransactionsCount: increment(-1),
      byCurrency: {
        [curr]: {
          [isIncome ? 'income' : 'expense']: increment(-nativeAmount)
        }
      }
    };

    if (isIncome) {
      userUpdates.totalIncomeUSD = increment(-amountUSD);
    } else {
      userUpdates.totalExpenseUSD = increment(-amountUSD);
    }

    const monthlyUpdates: Record<string, any> = {
      txCount: increment(-1),
      byCurrency: {
        [curr]: {
          [isIncome ? 'income' : 'expense']: increment(-nativeAmount)
        }
      },
      weeks: {
        [String(weekIdx)]: {
          count: increment(-1),
          incomeUSD: increment(isIncome ? -amountUSD : 0),
          expenseUSD: increment(isIncome ? 0 : -amountUSD),
          byCurrency: {
            [curr]: {
              [isIncome ? 'income' : 'expense']: increment(-nativeAmount)
            }
          }
        }
      }
    };

    if (isIncome) {
      monthlyUpdates.incomeUSD = increment(-amountUSD);
    } else {
      monthlyUpdates.expenseUSD = increment(-amountUSD);
    }

    // Check if deleted transaction was on Best Day Ever or Best Week Ever
    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data() as UserStatsDoc;
        const bestDayDateStr = uData?.insights?.bestDayEver?.dateStr;
        const bestWeekKey = uData?.insights?.bestWeekEver?.weekKey;
        const lastTxDateStr = uData?.lastTransactionDate ? new Date(uData.lastTransactionDate).toISOString().slice(0, 10) : null;
        const cWeekKey = getWeekKey(date);
        const isLastTxOrAfter = !uData?.lastTransactionDate || date >= new Date(uData.lastTransactionDate) || lastTxDateStr === dateString;

        if (bestDayDateStr === dateString || bestWeekKey === cWeekKey || isLastTxOrAfter) {
          console.log('[statsManager] Deleted transaction was on Best Day, Best Week, or Last Active Date -> Recalibrating insights & dates!');
          // Recalibrate insights and lastTransactionDate so the true remaining date is saved!
          recomputeAndSaveInsights(userId);
        }
      }
    } catch (err) {
      console.warn('[statsManager] Error checking best day in onTransactionDeleted:', err);
    }

    await Promise.all([
      setDoc(userRef, userUpdates, { merge: true }),
      setDoc(monthlyRef, monthlyUpdates, { merge: true })
    ]);
  } catch (err) {
    console.error('[statsManager] Error in onTransactionDeleted:', err);
  }
};

/**
 * Atomic update when a transaction is edited
 */
export const onTransactionUpdated = async (oldTx: any, newTx: any) => {
  try {
    const userId = newTx.userId || oldTx.userId || auth.currentUser?.uid;
    if (!userId) {
      console.warn('[statsManager] onTransactionUpdated: missing userId');
      return;
    }

    const oldDate = parseRawDate(oldTx.date || oldTx.createdAt);
    const newDate = parseRawDate(newTx.date || newTx.createdAt);

    const oldMonth = getMonthKey(oldDate);
    const newMonth = getMonthKey(newDate);

    const oldWeek = getWeekIndexForDate(oldDate);
    const newWeek = getWeekIndexForDate(newDate);

    const isSameTimeAndType = (
      oldMonth === newMonth &&
      oldWeek === newWeek &&
      oldTx.type === newTx.type &&
      oldTx.currency === newTx.currency
    );

    if (isSameTimeAndType) {
      // Simple delta adjustment
      const isIncome = newTx.type === 'income';
      const oldUSD = parseNumeric(oldTx.amountUSD ?? oldTx.rawAmount ?? oldTx.amount);
      const newUSD = parseNumeric(newTx.amountUSD ?? newTx.rawAmount ?? newTx.amount);
      const oldNative = parseNumeric(oldTx.rawAmount ?? oldTx.amount);
      const newNative = parseNumeric(newTx.rawAmount ?? newTx.amount);

      const deltaUSD = newUSD - oldUSD;
      const deltaNative = newNative - oldNative;
      const curr = newTx.currency || 'USD';

      if (deltaUSD === 0 && deltaNative === 0) return;

      const dateString = newTx.dateString || `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
      const userRef = doc(db, 'users', userId);
      const monthlyRef = doc(db, 'users', userId, 'monthlyStats', newMonth);

      const userUpdates: Record<string, any> = {
        byCurrency: {
          [curr]: {
            [isIncome ? 'income' : 'expense']: increment(deltaNative)
          }
        }
      };
      if (isIncome) {
        userUpdates.totalIncomeUSD = increment(deltaUSD);
      } else {
        userUpdates.totalExpenseUSD = increment(deltaUSD);
      }

      const monthlyUpdates: Record<string, any> = {
        byCurrency: {
          [curr]: {
            [isIncome ? 'income' : 'expense']: increment(deltaNative)
          }
        },
        weeks: {
          [String(newWeek)]: {
            incomeUSD: increment(isIncome ? deltaUSD : 0),
            expenseUSD: increment(isIncome ? 0 : deltaUSD),
            byCurrency: {
              [curr]: {
                [isIncome ? 'income' : 'expense']: increment(deltaNative)
              }
            }
          }
        }
      };

      if (isIncome) {
        monthlyUpdates.incomeUSD = increment(deltaUSD);
      } else {
        monthlyUpdates.expenseUSD = increment(deltaUSD);
      }

      // If date was on best day, recalibrate insights
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data() as UserStatsDoc;
          const bestDayDateStr = uData?.insights?.bestDayEver?.dateStr;
          if (bestDayDateStr === dateString) {
            recomputeAndSaveInsights(userId);
          }
        }
      } catch (err) {
        console.warn('[statsManager] Error checking best day in onTransactionUpdated:', err);
      }

      await Promise.all([
        setDoc(userRef, userUpdates, { merge: true }),
        setDoc(monthlyRef, monthlyUpdates, { merge: true })
      ]);
    } else {
      // Date, week, type or currency changed: remove old values and apply new values
      await onTransactionDeleted({ ...oldTx, userId });
      await onTransactionCreated({ ...newTx, userId });
    }
  } catch (err) {
    console.error('[statsManager] Error in onTransactionUpdated:', err);
  }
};

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
    const dStr = t.dateString || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  const avgDailyProfitUSD = activeProfitUSD / daysTotalElapsed;

  // Weekly Average & Best Week Ever
  const refCopy = new Date(referenceDate);
  refCopy.setHours(0, 0, 0, 0);
  const refDay = refCopy.getDay();
  const refDiff = refCopy.getDate() - refDay + (refDay === 0 ? -6 : 1);
  refCopy.setDate(refDiff);
  const currentCalendarWeekKey = refCopy.toISOString().slice(0, 10);
  const dayInWeek = referenceDate.getDay() === 0 ? 7 : referenceDate.getDay();
  const isCurrentWeekEligible = (dayInWeek / 7) >= 0.75; // Saturday (85.7%) or Sunday (100%)

  const eligibleCWeekKeys = Object.keys(calendarWeekMap).sort().filter((k) => {
    if (k === currentCalendarWeekKey) return isCurrentWeekEligible;
    return true;
  });

  const cWeekProfits = eligibleCWeekKeys.map((k) => calendarWeekMap[k].incomeUSD - calendarWeekMap[k].expenseUSD);
  const avgWeeklyProfitUSD = cWeekProfits.length > 0
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
  const isCurMonthEligible = (referenceDate.getDate() / totalDaysInCurMonth) >= 0.75;

  const eligibleMonthKeys = Object.keys(monthlyMap).sort().filter((k) => {
    const mData = monthlyMap[k];
    if (!mData || mData.incomeUSD <= 0) return false;
    if (mData.earliestDay > 15) return false;
    if (k === currentMonthKey) return isCurMonthEligible;
    return true;
  });

  const eligibleMonthProfits = eligibleMonthKeys.map((k) => monthlyMap[k].incomeUSD - monthlyMap[k].expenseUSD);
  const monthsElapsed = firstTxDate
    ? Math.max(1, (referenceDate.getFullYear() - firstTxDate.getFullYear()) * 12 + referenceDate.getMonth() - firstTxDate.getMonth())
    : 1;
  const eligibleMonthsCount = Math.max(1, monthsElapsed + (isCurMonthEligible ? 1 : 0));
  const avgMonthlyProfitUSD = eligibleMonthProfits.length > 0
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
      bestDayEver: bestDayDate && bestDayProfitUSD > 0 ? { dateStr: bestDayDate, profitUSD: Math.round(bestDayProfitUSD * 100) / 100 } : null,
      bestWeekEver: bestWeekLabel && bestWeekProfitUSD > 0 ? { weekKey: bestWeekKey, weekLabel: bestWeekLabel, profitUSD: Math.round(bestWeekProfitUSD * 100) / 100 } : null,
      lastCalculatedAt: now.toISOString(),
    },
    firstTxDate,
    lastTxDate,
  };
};

/**
 * Recomputes all insights directly from Firestore and updates users/{userId}
 */
export const recomputeAndSaveInsights = async (userId: string, txListOverride?: any[]): Promise<UserInsights | null> => {
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

/**
 * Resets all stats when "Clear Transactions" is pressed in Settings
 */
export const resetUserStats = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      totalIncomeUSD: 0,
      totalExpenseUSD: 0,
      totalTransactionsCount: 0,
      byCurrency: {},
      statsCalibrated: true
    }, { merge: true });

    // Delete monthlyStats docs
    const monthlyCol = collection(db, 'users', userId, 'monthlyStats');
    const snapshot = await getDocs(monthlyCol);
    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.error('[statsManager] Error in resetUserStats:', err);
  }
};

/**
 * One-time calibration to populate users/{userId} and monthlyStats from existing transactions
 */
export const calibrateUserStats = async (
  userId: string,
  providedTransactions?: any[]
): Promise<boolean> => {
  try {
    console.log('[statsManager] Starting calibration for user:', userId);
    let txList: any[] = [];
    if (providedTransactions && providedTransactions.length > 0) {
      txList = providedTransactions;
    } else {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      txList = snapshot.docs.map(d => d.data());

      // Backfill dateString for any legacy transactions missing it
      try {
        const legacyBatch = writeBatch(db);
        let backfillCount = 0;
        for (const d of snapshot.docs) {
          const dData = d.data();
          if (!dData.dateString) {
            const rawDate = dData.date || dData.createdAt;
            const parsed = parseRawDate(rawDate);
            if (!isNaN(parsed.getTime())) {
              const ds = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
              legacyBatch.update(d.ref, { dateString: ds });
              backfillCount++;
            }
          }
        }
        if (backfillCount > 0) {
          await legacyBatch.commit();
          console.log(`[statsManager] Backfilled dateString for ${backfillCount} legacy transactions.`);
        }
      } catch (backfillErr) {
        console.warn('[statsManager] Legacy backfill skipped/warn:', backfillErr);
      }
    }

    if (txList.length === 0) {
      // User has no transactions, initialize with zeros
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        totalIncomeUSD: 0,
        totalExpenseUSD: 0,
        totalTransactionsCount: 0,
        byCurrency: {},
        statsCalibrated: true
      }, { merge: true });
      return true;
    }

    let lifetimeIncomeUSD = 0;
    let lifetimeExpenseUSD = 0;
    const lifetimeByCurrency: Record<string, CurrencyBreakdown> = {};

    const now = new Date();
    const currentYear = now.getFullYear();

    // 1. Find earliest transaction date ever
    let earliestDate: Date | null = null;
    for (const t of txList) {
      const date = parseRawDate(t.date || t.createdAt);
      if (!isNaN(date.getTime())) {
        if (!earliestDate || date < earliestDate) {
          earliestDate = date;
        }
      }
    }

    const monthlyGroups: Record<string, {
      incomeUSD: number;
      expenseUSD: number;
      txCount: number;
      byCurrency: Record<string, CurrencyBreakdown>;
      weeks: Record<string, WeekStats>;
    }> = {};

    for (const t of txList) {
      const date = parseRawDate(t.date || t.createdAt);
      const isIncome = String(t.type || '').toLowerCase() === 'income';
      const nativeAmount = parseNumeric(t.amount);
      const amountUSD = parseNumeric(t.amountUSD ?? t.amount);
      const curr = (t.currency && typeof t.currency === 'string' && t.currency.trim()) ? t.currency.trim().toUpperCase() : 'USD';

      if (!lifetimeByCurrency[curr]) {
        lifetimeByCurrency[curr] = { income: 0, expense: 0 };
      }

      if (isIncome) {
        lifetimeIncomeUSD += amountUSD;
        lifetimeByCurrency[curr].income = Math.round((lifetimeByCurrency[curr].income + nativeAmount) * 100) / 100;
      } else {
        lifetimeExpenseUSD += amountUSD;
        lifetimeByCurrency[curr].expense = Math.round((lifetimeByCurrency[curr].expense + nativeAmount) * 100) / 100;
      }

      // Group by month and week for monthlyStats
      const monthKey = getMonthKey(date);
      const weekIdx = String(getWeekIndexForDate(date));
      const dateString = t.dateString || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = {
          incomeUSD: 0,
          expenseUSD: 0,
          txCount: 0,
          byCurrency: {},
          weeks: {
            '0': { incomeUSD: 0, expenseUSD: 0, count: 0, byCurrency: {} },
            '1': { incomeUSD: 0, expenseUSD: 0, count: 0, byCurrency: {} },
            '2': { incomeUSD: 0, expenseUSD: 0, count: 0, byCurrency: {} },
            '3': { incomeUSD: 0, expenseUSD: 0, count: 0, byCurrency: {} }
          }
        };
      }

      const mGroup = monthlyGroups[monthKey];
      mGroup.txCount += 1;
      if (!mGroup.byCurrency[curr]) {
        mGroup.byCurrency[curr] = { income: 0, expense: 0 };
      }

      const wGroup = mGroup.weeks[weekIdx] || mGroup.weeks['3'];
      wGroup.count += 1;
      if (!wGroup.byCurrency) wGroup.byCurrency = {};
      if (!wGroup.byCurrency[curr]) {
        wGroup.byCurrency[curr] = { income: 0, expense: 0 };
      }

      if (isIncome) {
        mGroup.incomeUSD = Math.round((mGroup.incomeUSD + amountUSD) * 100) / 100;
        mGroup.byCurrency[curr].income = Math.round((mGroup.byCurrency[curr].income + nativeAmount) * 100) / 100;
        wGroup.incomeUSD = Math.round((wGroup.incomeUSD + amountUSD) * 100) / 100;
        wGroup.byCurrency[curr].income = Math.round((wGroup.byCurrency[curr].income + nativeAmount) * 100) / 100;
      } else {
        mGroup.expenseUSD = Math.round((mGroup.expenseUSD + amountUSD) * 100) / 100;
        mGroup.byCurrency[curr].expense = Math.round((mGroup.byCurrency[curr].expense + nativeAmount) * 100) / 100;
        wGroup.expenseUSD = Math.round((wGroup.expenseUSD + amountUSD) * 100) / 100;
        wGroup.byCurrency[curr].expense = Math.round((wGroup.byCurrency[curr].expense + nativeAmount) * 100) / 100;
      }
    }

    // 1. Calculate insights and dates
    const { insights, firstTxDate, lastTxDate } = computeInsightsFromTransactions(txList, now);

    // Update user document FIRST so statsCalibrated and insights are guaranteed to be saved
    const userRef = doc(db, 'users', userId);
    const safeLifetimeIncome = Math.round(lifetimeIncomeUSD * 100) / 100;
    const safeLifetimeExpense = Math.round(lifetimeExpenseUSD * 100) / 100;
    const userDataToSet: Record<string, any> = {
      totalIncomeUSD: safeLifetimeIncome,
      totalExpenseUSD: safeLifetimeExpense,
      totalTransactionsCount: txList.length,
      byCurrency: lifetimeByCurrency,
      statsCalibrated: true,
      insights,
    };
    if (firstTxDate) {
      userDataToSet.firstIncomeDate = firstTxDate.toISOString();
      userDataToSet.firstTransactionDate = firstTxDate.toISOString();
    }
    if (lastTxDate) {
      userDataToSet.lastTransactionDate = lastTxDate.toISOString();
    }

    await setDoc(userRef, userDataToSet, { merge: true });
    console.log('[statsManager] User stats & insights written successfully, totalCount:', txList.length);

    // 2. Save monthlyStats documents
    const validEntries = Object.entries(monthlyGroups).filter(([mKey]) => /^\d{4}-\d{2}$/.test(mKey));
    await Promise.all(
      validEntries.map(([mKey, mData]) =>
        setDoc(doc(db, 'users', userId, 'monthlyStats', mKey), {
          incomeUSD: Math.round(mData.incomeUSD * 100) / 100,
          expenseUSD: Math.round(mData.expenseUSD * 100) / 100,
          txCount: mData.txCount || 0,
          byCurrency: mData.byCurrency || {},
          weeks: mData.weeks
        }, { merge: true })
      )
    );

    console.log('[statsManager] Calibration completed successfully for user:', userId, 'totalCount:', txList.length);
    return true;
  } catch (err) {
    console.error('[statsManager] Calibration error:', err);
    return false;
  }
};
