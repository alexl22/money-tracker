import { Goal } from '../components/goals/types';

export function isGoalActive(g: Goal): boolean {
  if (g.isAddCard || !g.startDate) return false;
  if (!g.targetAmount || g.targetAmount <= 0) return false;
  if (g.completedAt) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(g.deadline);
  deadline.setHours(0, 0, 0, 0);

  return deadline >= today;
}

export function formatDays(days: number, isShort: boolean = false): string {
  if (days === Infinity) return isShort ? "∞" : "Infinity";
  if (days <= 100) return `${days}${isShort ? 'd' : (days === 1 ? ' day' : ' days')}`;
  if (days <= 365) {
    const months = Math.floor(days / 30.44);
    return `${months}${isShort ? 'mo' : (months === 1 ? ' month' : ' months')}`;
  }
  const years = (days / 365.25).toFixed(1);
  const yearsDisplay = years.endsWith('.0') ? years.slice(0, -2) : years;
  return `${yearsDisplay}${isShort ? 'y' : (yearsDisplay === '1' ? ' year' : ' years')}`;
}

export interface GoalMetrics {
  totalProfit: number;
  todayProfit: number;
  iTarget: number;
  iIsTargetSet: boolean;
  isGoalAccomplished: boolean;
  isDeadlinePassed: boolean;
  iProgress: number;
  iOffset: number;
  daysAhead: number;
  iTotalGoalDays: number;
  iDaysLeft: number;
  iIsUpcoming: boolean;
  iDaysUntilStart: number;
  iElapsedDays: number;
  iCurrentPace: number;
  iRemaining: number;
  iDaysUntilTarget: number;
  iDailyTarget: number;
  iIsAhead: boolean;
  iIsOnTrack: boolean;
  iDaysDiff: number;
  iStatusMsg: string;
  isGoalFinished: boolean;
  displayTotalAchieved: number;
  shouldCalibrateInitialNet: boolean;
  calibratedInitialNetUSD?: number;
}

export function computeGoalMetrics({
  item,
  goalTransactions,
  currentNetUSD,
  currency,
  rates,
  circumference,
}: {
  item: Goal;
  goalTransactions: any[];
  currentNetUSD: number;
  currency: string;
  rates: Record<string, number> | undefined;
  circumference: number;
}): GoalMetrics {
  let totalProfit = 0;
  let todayProfit = 0;
  const nowDay = new Date();
  nowDay.setHours(0, 0, 0, 0);

  const isThisGoalActive = isGoalActive(item);
  let shouldCalibrateInitialNet = false;
  let calibratedInitialNetUSD: number | undefined;

  if (isThisGoalActive || !item.initialNetCalibrated) {
    goalTransactions.forEach((t) => {
      const amount = (t.currency === currency)
        ? t.amount
        : ((t.amountUSD || (t.amount / (rates?.[t.currency] || 1))) * (rates?.[currency] || 1));
      const date = t.date || t.createdAt || new Date();
      if (date >= item.startDate) {
        if (t.type === 'income') totalProfit += amount;
        else if (t.type === 'expense') totalProfit -= amount;
        if (date >= nowDay) {
          if (t.type === 'income') todayProfit += amount;
          else if (t.type === 'expense') todayProfit -= amount;
        }
      }
    });

    if (item.id && !item.initialNetCalibrated && goalTransactions.length > 0) {
      const profitUSD = currency === 'USD' ? totalProfit : totalProfit / (rates?.[currency] || 1);
      calibratedInitialNetUSD = Math.round((currentNetUSD - profitUSD) * 100) / 100;
      shouldCalibrateInitialNet = true;
    }
  } else {
    const initialNet = item.initialNetUSD !== undefined ? item.initialNetUSD : 0;
    const profitUSD = currentNetUSD - initialNet;
    totalProfit = profitUSD * (rates?.[currency] || 1);
    todayProfit = 0;
  }

  const iTarget = item.currency === currency
    ? item.targetAmount
    : ((item.targetAmountUSD || (item.targetAmount / (rates?.[item.currency] || 1))) * (rates?.[currency] || 1));
  const iIsTargetSet = item.targetAmount > 0;
  const now = new Date();
  const todayAtMidnight = new Date();
  todayAtMidnight.setHours(0, 0, 0, 0);
  const todayForCounting = new Date();
  todayForCounting.setHours(0, 0, 0, 0);
  const deadlineForCounting = new Date(item.deadline);
  deadlineForCounting.setHours(0, 0, 0, 0);

  const isDeadlinePassed = deadlineForCounting < todayAtMidnight;
  const isGoalAccomplished = (iIsTargetSet && iTarget > 0 && totalProfit >= iTarget) || Boolean(item.completedAt);

  const rawProgress = iTarget > 0 ? Math.max(0, Math.min(100, (totalProfit / iTarget) * 100)) : 0;
  const iProgress = isGoalAccomplished ? 100 : rawProgress;
  const iOffset = circumference - (circumference * iProgress / 100);

  const completionDate = item.completedAt ? new Date(item.completedAt) : todayForCounting;
  completionDate.setHours(0, 0, 0, 0);
  const daysAhead = Math.max(0, Math.floor((deadlineForCounting.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24)));

  const iTotalGoalDays = Math.max(1, Math.floor((deadlineForCounting.getTime() - item.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const iDaysLeft = Math.max(0, Math.floor((deadlineForCounting.getTime() - todayForCounting.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const iIsUpcoming = item.startDate > todayAtMidnight;
  const iDaysUntilStart = iIsUpcoming ? Math.max(1, Math.floor((item.startDate.getTime() - todayAtMidnight.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const iStartTime = item.startDate.getTime();
  const iElapsedDays = Math.max(1, Math.floor((now.getTime() - iStartTime) / (1000 * 60 * 60 * 24)) + 1);
  const iCurrentPace = totalProfit / iElapsedDays;

  const iRemaining = Math.max(0, iTarget - totalProfit);
  const iDaysUntilTarget = iCurrentPace > 0 ? Math.ceil(iRemaining / iCurrentPace) : Infinity;

  const iDailyTarget = iIsUpcoming ? iTarget / iTotalGoalDays : (iDaysLeft > 0 ? iRemaining / iDaysLeft : 0);

  const iIsAhead = iCurrentPace > 0 && iDaysUntilTarget < iDaysLeft;
  const iIsOnTrack = iCurrentPace > 0 && iDaysUntilTarget === iDaysLeft;
  const iDaysDiff = Math.abs(Math.round(iDaysLeft - iDaysUntilTarget));

  const iStatusMsg = (() => {
    if (iIsUpcoming) return `Goal starts in ${formatDays(iDaysUntilStart)}. Get ready!`;
    if (isGoalAccomplished) {
      if (daysAhead > 0) {
        return `Goal Accomplished! Reached ${formatDays(daysAhead, false)} ahead of deadline.`;
      }
      if (daysAhead === 0 && deadlineForCounting >= completionDate) {
        return "Goal Accomplished right on schedule!";
      }
      return "Goal Accomplished successfully!";
    }
    if (iDaysLeft <= 0) {
      return "Deadline reached. Target not achieved.";
    }
    if (iIsOnTrack) return "Perfectly on track! You'll reach target exactly on the deadline.";
    if (iIsAhead) return `Ahead of schedule! Estimated ${formatDays(iDaysUntilTarget)} until reached (${formatDays(iDaysDiff)} early).`;
    if (iDaysUntilTarget === Infinity) return "Behind schedule. Please increase your daily profit to see completion forecast.";
    return `Behind schedule. Estimated ${formatDays(iDaysUntilTarget)} until reached (${formatDays(iDaysDiff)} late).`;
  })();

  const isGoalFinished = isGoalAccomplished || iDaysLeft <= 0;
  const displayTotalAchieved = (isGoalAccomplished && totalProfit < iTarget) ? iTarget : totalProfit;

  return {
    totalProfit,
    todayProfit,
    iTarget,
    iIsTargetSet,
    isGoalAccomplished,
    isDeadlinePassed,
    iProgress,
    iOffset,
    daysAhead,
    iTotalGoalDays,
    iDaysLeft,
    iIsUpcoming,
    iDaysUntilStart,
    iElapsedDays,
    iCurrentPace,
    iRemaining,
    iDaysUntilTarget,
    iDailyTarget,
    iIsAhead,
    iIsOnTrack,
    iDaysDiff,
    iStatusMsg,
    isGoalFinished,
    displayTotalAchieved,
    shouldCalibrateInitialNet,
    calibratedInitialNetUSD,
  };
}
