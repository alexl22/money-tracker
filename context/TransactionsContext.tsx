import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { auth, db, onAuthChanged } from '../firebaseConfig';
// ---------------------------------------------------------------------------------------------------------------------
import { syncUserStats } from '../utils/syncStats';
// ---------------------------------------------------------------------------------------------------------------------

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
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (!context) throw new Error('useTransactions must be used within a TransactionsProvider');
  return context;
};

// Helper function to parse Firestore timestamps or other date formats into a compatible Date object
const parseCompatibleDate = (rawDate: any): Date => {
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // ---------------------------------------------------------------------------------------------------------------------  
  const hasSyncedStats = useRef(false);
  // ---------------------------------------------------------------------------------------------------------------------  

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    // Listen to Auth State Changes
    const unsubscribeAuth = onAuthChanged((user: any) => {
      // Clean up previous snapshot listener if it exists (e.g. on user log out/switch)
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
    
      hasSyncedStats.current = false;
      if (!user) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid)
      );

      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        if (!snapshot) {
          setTransactions([]);
          setLoading(false);
          return;
        }

        const rawList = snapshot.docs.map((doc) => {
          const data = doc.data({ serverTimestamps: 'estimate' });
          const rawDate = data.date || data.createdAt;
          let compatibleDate = parseCompatibleDate(rawDate);

          // If dateString is stored, anchor the Date object to that calendar day so it never shifts
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

        setTransactions(rawList);
        setLoading(false);

        // Run the biweekly stats sync check exactly once per login session -------------------------------------------
        if (!hasSyncedStats.current) {
          hasSyncedStats.current = true;
          syncUserStats(user.uid, rawList);
        }
        // ----------------------------------------------------------------------------------------------------------------
      }, (error) => {
        console.error("Transactions Context Firestore Error:", error);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  return (
    <TransactionsContext.Provider value={{
      transactions,
      loading,
      searchQuery,
      setSearchQuery,
      isSearching,
      setIsSearching
    }}>
      {children}
    </TransactionsContext.Provider>
  );
};
