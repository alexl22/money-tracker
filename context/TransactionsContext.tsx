import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { auth, db, onAuthChanged } from '../firebaseConfig';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  amountUSD: number;
  currency: string;
  type: 'income' | 'expense';
  createdAt: Date;
  date?: Date;
  notes?: string;
  userId: string;
  [key: string]: any; // Allow other properties from Firestore
}

interface TransactionsContextType {
  transactions: Transaction[];
  loading: boolean;
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

  useEffect(() => {
    // Listen to Auth State Changes
    const unsubscribeAuth = onAuthChanged((user: any) => {
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

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        if (!snapshot) {
          setTransactions([]);
          setLoading(false);
          return;
        }

        const rawList = snapshot.docs.map((doc) => {
          const data = doc.data({ serverTimestamps: 'estimate' });
          const rawDate = data.date || data.createdAt;
          const compatibleDate = parseCompatibleDate(rawDate);

          return {
            id: doc.id,
            ...data,
            // Keep original date if it existed, but make it compatible
            date: data.date ? parseCompatibleDate(data.date) : compatibleDate,
            createdAt: compatibleDate,
          } as Transaction;
        });

        // Sort descending by date
        rawList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        setTransactions(rawList);
        setLoading(false);
      }, (error) => {
        console.error("Transactions Context Firestore Error:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <TransactionsContext.Provider value={{ transactions, loading }}>
      {children}
    </TransactionsContext.Provider>
  );
};
