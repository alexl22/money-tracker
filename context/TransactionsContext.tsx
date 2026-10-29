import { collection, doc, getDocFromCache, onSnapshot, query, where } from '@react-native-firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { auth, db, onAuthChanged } from '../firebaseConfig';
import { calibrateUserStats, recomputeAndSaveInsights, UserStatsDoc } from '../utils/statsManager';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  amountUSD: number;
  currency: string;
  type: 'income' | 'expense';
  createdAt: Date;
  date?: Date;
  dateString?: string;
  notes?: string;
  userId: string;
  [key: string]: any; // Allow other properties from Firestore
}

interface TransactionsContextType {
  transactions: Transaction[];
  userStats: UserStatsDoc | null;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
  loadAllTransactions: () => Promise<Transaction[]>;
  isAllTransactionsLoaded: boolean;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (!context) throw new Error('useTransactions must be used within a TransactionsProvider');
  return context;
};

// Helper function to parse Firestore timestamps or other date formats into a compatible Date object
export const parseCompatibleDate = (rawDate: any): Date => {
  let dateObj: Date;
  if (rawDate && typeof rawDate.toDate === 'function') {
    dateObj = rawDate.toDate();
  } else if (rawDate instanceof Date) {
    dateObj = rawDate;
  } else if (rawDate && typeof rawDate.seconds === 'number') {
    dateObj = new Date(rawDate.seconds * 1000);
  } else if (rawDate) {
    dateObj = new Date(rawDate);
  } else {
    dateObj = new Date();
  }

  // Inject toDate and seconds to remain 100% compatible with existing code
  const seconds = Math.floor(dateObj.getTime() / 1000);
  Object.defineProperties(dateObj, {
    toDate: { value: () => dateObj, writable: true, enumerable: false },
    seconds: { value: seconds, writable: true, enumerable: false },
  });

  return dateObj;
};

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userStats, setUserStats] = useState<UserStatsDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAllTransactionsLoaded, setIsAllTransactionsLoaded] = useState(false);

  const userStatsRef = useRef<UserStatsDoc | null>(null);
  const transactionsRef = useRef<Transaction[]>([]);
  const userStatsLoadedRef = useRef(false);
  const hasSyncedStats = useRef(false);
  const hasCheckedWeeklyRefresh = useRef(false);
  const unsubscribeSnapshotRef = useRef<(() => void) | null>(null);
  const isLoadingTransactionsRef = useRef(false);
  const currentUserRef = useRef<any>(null);



  const loadAllTransactions = useCallback(async (): Promise<Transaction[]> => {
    const user = currentUserRef.current || auth.currentUser;
    if (!user) return [];
    if (isAllTransactionsLoaded && transactionsRef.current.length > 0) {
      return transactionsRef.current;
    }
    if (isLoadingTransactionsRef.current) {
      return transactionsRef.current;
    }

    isLoadingTransactionsRef.current = true;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    return new Promise<Transaction[]>((resolve) => {
      let isFirstCall = true;
      if (!unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current = onSnapshot(q, (snapshot) => {
          isLoadingTransactionsRef.current = false;
          if (!snapshot) {
            setTransactions([]);
            transactionsRef.current = [];
            if (isFirstCall) {
              isFirstCall = false;
              resolve([]);
            }
            return;
          }

          const rawList = snapshot.docs.map((doc) => {
            const data = doc.data({ serverTimestamps: 'estimate' });
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
              id: doc.id,
              ...data,
              date: compatibleDate,
              createdAt: compatibleDate,
              dateString: data.dateString,
            } as Transaction;
          });

          // Sort descending by date
          rawList.sort((a, b) => (b.date?.getTime() || b.createdAt.getTime()) - (a.date?.getTime() || a.createdAt.getTime()));

          transactionsRef.current = rawList;
          setTransactions(rawList);
          setIsAllTransactionsLoaded(true);

          if (isFirstCall) {
            isFirstCall = false;
            resolve(rawList);
          }

          // Zero-read insights refresh: if 7 days passed and we already downloaded transactions for search/history
          if (!hasCheckedWeeklyRefresh.current && user?.uid) {
            const lastCalc = userStatsRef.current?.insights?.lastCalculatedAt
              ? new Date(userStatsRef.current.insights.lastCalculatedAt).getTime()
              : 0;
            if (Date.now() - lastCalc > 7 * 24 * 60 * 60 * 1000) {
              hasCheckedWeeklyRefresh.current = true;
              recomputeAndSaveInsights(user.uid, rawList).catch((err) => {
                console.error('[TransactionsContext] Zero-read weekly insights refresh error:', err);
              });
            }
          }
        }, (error) => {
          isLoadingTransactionsRef.current = false;
          console.error("Transactions Context On-Demand Snapshot Error:", error);
          if (isFirstCall) {
            isFirstCall = false;
            resolve([]);
          }
        });
      } else {
        isLoadingTransactionsRef.current = false;
        resolve(transactionsRef.current);
      }
    });
  }, [isAllTransactionsLoaded]);

  // Load all transactions on-demand when searching is initiated
  useEffect(() => {
    if (isSearching || (searchQuery && searchQuery.trim().length > 0)) {
      loadAllTransactions();
    }
  }, [isSearching, searchQuery, loadAllTransactions]);

  useEffect(() => {
    let unsubscribeUserStats: (() => void) | null = null;

    const checkAutoCalibration = (currentStats: UserStatsDoc | null, uid: string) => {
      if (!userStatsLoadedRef.current || !uid) return;

      // 1. Initial calibration if missing or uncalibrated
      if (
        !hasSyncedStats.current &&
        (!currentStats || !currentStats.statsCalibrated || !currentStats.insights || !currentStats.lastTransactionDate)
      ) {
        hasSyncedStats.current = true;
        calibrateUserStats(uid).then((success) => {
          if (!success) hasSyncedStats.current = false;
        });
        return;
      }

      // 2. Weekly auto-refresh (once every 7 days)
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const lastCalc = currentStats?.insights?.lastCalculatedAt
        ? new Date(currentStats.insights.lastCalculatedAt).getTime()
        : 0;
      const isExpired = Date.now() - lastCalc > SEVEN_DAYS_MS;

      if (isExpired && !hasCheckedWeeklyRefresh.current && (currentStats?.totalTransactionsCount || 0) > 0) {
        hasCheckedWeeklyRefresh.current = true;
        recomputeAndSaveInsights(
          uid,
          transactionsRef.current.length > 0 ? transactionsRef.current : undefined
        ).catch((err) => {
          console.error('[TransactionsContext] Weekly insights recomputation error:', err);
        });
      }
    };

    const handleUser = (user: any) => {
      // 1. If already active for this exact user, keep the live listener & data intact
      if (user?.uid && currentUserRef.current?.uid === user.uid && unsubscribeUserStats) {
        currentUserRef.current = user;
        return;
      }

      // 2. Clean previous listeners & reset user-specific refs
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null;
      }
      if (unsubscribeUserStats) {
        unsubscribeUserStats();
        unsubscribeUserStats = null;
      }

      currentUserRef.current = user;
      hasSyncedStats.current = false;
      hasCheckedWeeklyRefresh.current = false;
      userStatsLoadedRef.current = false;
      userStatsRef.current = null;
      transactionsRef.current = [];
      setIsAllTransactionsLoaded(false);

      if (!user?.uid) {
        setTransactions([]);
        setUserStats(null);
        setLoading(false);
        return;
      }

      // 3. Subscribe to Firestore (immediate 0ms disk cache read + live snapshot)
      const userRef = doc(db, 'users', user.uid);
      getDocFromCache(userRef).then((snap) => {
        if (snap && snap.exists() && !userStatsLoadedRef.current) {
          const data = snap.data() as UserStatsDoc;
          if (data && !userStatsRef.current) {
            userStatsRef.current = data;
            setUserStats(data);
            setLoading(false);
          }
        }
      }).catch(() => {});

      unsubscribeUserStats = onSnapshot(userRef, { includeMetadataChanges: true }, (userSnap) => {
        userStatsLoadedRef.current = true;
        const data = (userSnap && userSnap.exists() ? userSnap.data() : null) as UserStatsDoc | null;
        userStatsRef.current = data;
        setUserStats(data);
        setLoading(false);
        checkAutoCalibration(data, user.uid);
      }, (err) => {
        console.error("UserStats Context Snapshot Error:", err);
        setLoading(false);
      });
    };

    // Fast path: start immediately if auth.currentUser is already in native memory
    if (auth.currentUser?.uid) {
      handleUser(auth.currentUser);
    }

    // Auth listener: handles login/logout/token updates
    const unsubscribeAuth = onAuthChanged(handleUser);

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null;
      }
      if (unsubscribeUserStats) {
        unsubscribeUserStats();
        unsubscribeUserStats = null;
      }
    };
  }, []);

  return (
    <TransactionsContext.Provider value={{
      transactions,
      userStats,
      loading,
      searchQuery,
      setSearchQuery,
      isSearching,
      setIsSearching,
      loadAllTransactions,
      isAllTransactionsLoaded,
    }}>
      {children}
    </TransactionsContext.Provider>
  );
};
