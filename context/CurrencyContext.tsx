import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getExchangeRates } from '../utils/currency';
import { onAuthChanged } from '../firebaseConfig';

type CurrencyCode = string;

interface CurrencyContextType {
  currency: CurrencyCode;
  availableCurrencies: string[];
  setCurrency: (code: CurrencyCode) => Promise<void>;
  format: (amount: number, options?: { compact?: boolean; showSign?: boolean, threshold?: number, isConverted?: boolean }) => string;
  getSymbol: (code?: string) => string;
  isLoading: boolean;
  convertToBase: (amount: number) => number;
  rates: any;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
};

const SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  RON: 'RON ',
  GBP: '£',
  JPY: '¥',
  CHF: 'Fr ',
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setInternalCurrency] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<any>(null);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['USD', 'EUR', 'RON']);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem('user_currency');
        if (savedCurrency) setInternalCurrency(savedCurrency);

        const cachedRates = await AsyncStorage.getItem('cached_exchange_rates');
        const cachedCodes = await AsyncStorage.getItem('cached_currency_codes');

        if (cachedRates) {
          const parsed = JSON.parse(cachedRates);
          setRates(parsed.rates || parsed);
        }
        if (cachedCodes) setAvailableCurrencies(JSON.parse(cachedCodes));
      } catch (e) {
        console.error("Currency Init Error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChanged((user: any) => {
      if (user) {
        getExchangeRates().then(latestRates => {
          if (latestRates) {
            setRates(latestRates);
            const codes = Object.keys(latestRates).sort();
            const priority = ['USD', 'EUR', 'RON'];
            const sortedCodes = [
              ...priority.filter(p => codes.includes(p)),
              ...codes.filter(c => !priority.includes(c))
            ];
            setAvailableCurrencies(sortedCodes);
            AsyncStorage.setItem('cached_currency_codes', JSON.stringify(sortedCodes));
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const convertToBase = (amount: number): number => {
    if (!rates || currency === 'USD') return amount;
    const rate = rates[currency];
    return rate ? amount / rate : amount;
  };

  const setCurrency = async (code: CurrencyCode) => {
    setInternalCurrency(code);
    await AsyncStorage.setItem('user_currency', code);
  };

  const format = (amount: number, options: { compact?: boolean; showSign?: boolean, threshold?: number, isConverted?: boolean } = {}): string => {
    const numericAmount = Number(amount) || 0;
    const { compact = false, showSign = false, threshold = 1000000, isConverted = false } = options;

    let displayValue = numericAmount;
    if (rates && currency !== 'USD' && !isConverted) {
      const rate = Number(rates[currency]);
      if (rate) displayValue = numericAmount * rate;
    }

    const absAmount = Math.abs(displayValue);
    const sign = displayValue > 0 ? (showSign ? '+' : '') : (displayValue < 0 ? '-' : '');
    const symbol = SYMBOLS[currency] || `${currency} `;

    let formattedValue = '';

    const addCommas = (num: number) => {
      const parts = num.toFixed(2).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts.join('.');
    };

    const toCompact = (num: number) => {
      if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
      if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
      if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
      return num.toFixed(2);
    };

    if (compact && absAmount >= (options.threshold || 100000)) {
      formattedValue = toCompact(absAmount);
    } else {
      formattedValue = addCommas(absAmount);
    }

    return `${sign}${symbol}${formattedValue}`;
  };

  const getSymbol = (code?: string): string => {
    const targetCode = code || currency;
    return SYMBOLS[targetCode] || `${targetCode} `;
  };

  return (
    <CurrencyContext.Provider value={{ currency, availableCurrencies, setCurrency, format, getSymbol, isLoading, convertToBase, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
};
