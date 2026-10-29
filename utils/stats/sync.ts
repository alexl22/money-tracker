import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { getMonthKey, getWeekIndexForDate, getWeekKey, parseNumeric, parseRawDate } from './calculators';
import { computeInsightsFromTransactions, recomputeAndSaveInsights } from './insights';
import { CurrencyBreakdown, UserStatsDoc, WeekStats } from './types';

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
    const dateString =
      tx.dateString ||
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
          [isIncome ? 'income' : 'expense']: increment(nativeAmount),
        },
      },
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
          [isIncome ? 'income' : 'expense']: increment(nativeAmount),
        },
      },
      weeks: {
        [String(weekIdx)]: {
          count: increment(1),
          incomeUSD: increment(isIncome ? amountUSD : 0),
          expenseUSD: increment(isIncome ? 0 : amountUSD),
          byCurrency: {
            [curr]: {
              [isIncome ? 'income' : 'expense']: increment(nativeAmount),
            },
          },
        },
      },
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
            },
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
              },
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
      setDoc(monthlyRef, monthlyUpdates, { merge: true }),
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
    const dateString =
      tx.dateString ||
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
          [isIncome ? 'income' : 'expense']: increment(-nativeAmount),
        },
      },
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
          [isIncome ? 'income' : 'expense']: increment(-nativeAmount),
        },
      },
      weeks: {
        [String(weekIdx)]: {
          count: increment(-1),
          incomeUSD: increment(isIncome ? -amountUSD : 0),
          expenseUSD: increment(isIncome ? 0 : -amountUSD),
          byCurrency: {
            [curr]: {
              [isIncome ? 'income' : 'expense']: increment(-nativeAmount),
            },
          },
        },
      },
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
        const lastTxDateStr = uData?.lastTransactionDate
          ? new Date(uData.lastTransactionDate).toISOString().slice(0, 10)
          : null;
        const cWeekKey = getWeekKey(date);
        const isLastTxOrAfter =
          !uData?.lastTransactionDate ||
          date >= new Date(uData.lastTransactionDate) ||
          lastTxDateStr === dateString;

        if (bestDayDateStr === dateString || bestWeekKey === cWeekKey || isLastTxOrAfter) {
          console.log(
            '[statsManager] Deleted transaction was on Best Day, Best Week, or Last Active Date -> Recalibrating insights & dates!'
          );
          recomputeAndSaveInsights(userId);
        }
      }
    } catch (err) {
      console.warn('[statsManager] Error checking best day in onTransactionDeleted:', err);
    }

    await Promise.all([
      setDoc(userRef, userUpdates, { merge: true }),
      setDoc(monthlyRef, monthlyUpdates, { merge: true }),
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

    const isSameTimeAndType =
      oldMonth === newMonth &&
      oldWeek === newWeek &&
      oldTx.type === newTx.type &&
      oldTx.currency === newTx.currency;

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

      const dateString =
        newTx.dateString ||
        `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
      const userRef = doc(db, 'users', userId);
      const monthlyRef = doc(db, 'users', userId, 'monthlyStats', newMonth);

      const userUpdates: Record<string, any> = {
        byCurrency: {
          [curr]: {
            [isIncome ? 'income' : 'expense']: increment(deltaNative),
          },
        },
      };
      if (isIncome) {
        userUpdates.totalIncomeUSD = increment(deltaUSD);
      } else {
        userUpdates.totalExpenseUSD = increment(deltaUSD);
      }

      const monthlyUpdates: Record<string, any> = {
        byCurrency: {
          [curr]: {
            [isIncome ? 'income' : 'expense']: increment(deltaNative),
          },
        },
        weeks: {
          [String(newWeek)]: {
            incomeUSD: increment(isIncome ? deltaUSD : 0),
            expenseUSD: increment(isIncome ? 0 : deltaUSD),
            byCurrency: {
              [curr]: {
                [isIncome ? 'income' : 'expense']: increment(deltaNative),
              },
            },
          },
        },
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
        setDoc(monthlyRef, monthlyUpdates, { merge: true }),
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
 * Resets all stats when "Clear Transactions" is pressed in Settings
 */
export const resetUserStats = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        totalIncomeUSD: 0,
        totalExpenseUSD: 0,
        totalTransactionsCount: 0,
        byCurrency: {},
        statsCalibrated: true,
      },
      { merge: true }
    );

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
      txList = snapshot.docs.map((d) => d.data());

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
      await setDoc(
        userRef,
        {
          totalIncomeUSD: 0,
          totalExpenseUSD: 0,
          totalTransactionsCount: 0,
          byCurrency: {},
          statsCalibrated: true,
        },
        { merge: true }
      );
      return true;
    }

    let lifetimeIncomeUSD = 0;
    let lifetimeExpenseUSD = 0;
    const lifetimeByCurrency: Record<string, CurrencyBreakdown> = {};

    const now = new Date();

    const monthlyGroups: Record<
      string,
      {
        incomeUSD: number;
        expenseUSD: number;
        txCount: number;
        byCurrency: Record<string, CurrencyBreakdown>;
        weeks: Record<string, WeekStats>;
      }
    > = {};

    for (const t of txList) {
      const date = parseRawDate(t.date || t.createdAt);
      const isIncome = String(t.type || '').toLowerCase() === 'income';
      const nativeAmount = parseNumeric(t.amount);
      const amountUSD = parseNumeric(t.amountUSD ?? t.amount);
      const curr =
        t.currency && typeof t.currency === 'string' && t.currency.trim()
          ? t.currency.trim().toUpperCase()
          : 'USD';

      if (!lifetimeByCurrency[curr]) {
        lifetimeByCurrency[curr] = { income: 0, expense: 0 };
      }

      if (isIncome) {
        lifetimeIncomeUSD += amountUSD;
        lifetimeByCurrency[curr].income =
          Math.round((lifetimeByCurrency[curr].income + nativeAmount) * 100) / 100;
      } else {
        lifetimeExpenseUSD += amountUSD;
        lifetimeByCurrency[curr].expense =
          Math.round((lifetimeByCurrency[curr].expense + nativeAmount) * 100) / 100;
      }

      // Group by month and week for monthlyStats
      const monthKey = getMonthKey(date);
      const weekIdx = String(getWeekIndexForDate(date));

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
            '3': { incomeUSD: 0, expenseUSD: 0, count: 0, byCurrency: {} },
          },
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
        mGroup.byCurrency[curr].income =
          Math.round((mGroup.byCurrency[curr].income + nativeAmount) * 100) / 100;
        wGroup.incomeUSD = Math.round((wGroup.incomeUSD + amountUSD) * 100) / 100;
        wGroup.byCurrency[curr].income =
          Math.round((wGroup.byCurrency[curr].income + nativeAmount) * 100) / 100;
      } else {
        mGroup.expenseUSD = Math.round((mGroup.expenseUSD + amountUSD) * 100) / 100;
        mGroup.byCurrency[curr].expense =
          Math.round((mGroup.byCurrency[curr].expense + nativeAmount) * 100) / 100;
        wGroup.expenseUSD = Math.round((wGroup.expenseUSD + amountUSD) * 100) / 100;
        wGroup.byCurrency[curr].expense =
          Math.round((wGroup.byCurrency[curr].expense + nativeAmount) * 100) / 100;
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
        setDoc(
          doc(db, 'users', userId, 'monthlyStats', mKey),
          {
            incomeUSD: Math.round(mData.incomeUSD * 100) / 100,
            expenseUSD: Math.round(mData.expenseUSD * 100) / 100,
            txCount: mData.txCount || 0,
            byCurrency: mData.byCurrency || {},
            weeks: mData.weeks,
          },
          { merge: true }
        )
      )
    );

    console.log('[statsManager] Calibration completed successfully for user:', userId, 'totalCount:', txList.length);
    return true;
  } catch (err) {
    console.error('[statsManager] Calibration error:', err);
    return false;
  }
};
