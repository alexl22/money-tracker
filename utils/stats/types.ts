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
