import { CurrencyBreakdown } from './types';

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
