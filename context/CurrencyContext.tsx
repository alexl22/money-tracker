import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getExchangeRates } from '../utils/currency';

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
        // 1. Load basic preferences
        const savedCurrency = await AsyncStorage.getItem('user_currency');
        if (savedCurrency) setInternalCurrency(savedCurrency);

        // 2. Load cached rates for instant UI (Offline Fallback)
        const cachedRates = await AsyncStorage.getItem('cached_exchange_rates');
        const cachedCodes = await AsyncStorage.getItem('cached_currency_codes');

        if (cachedRates) {
          const parsed = JSON.parse(cachedRates);
          setRates(parsed.rates || parsed);
        }
        if (cachedCodes) setAvailableCurrencies(JSON.parse(cachedCodes));

        // 3. Update with fresh rates in background
        const latestRates = await getExchangeRates();
        if (latestRates) {
          setRates(latestRates);
          const codes = Object.keys(latestRates).sort();
          const priority = ['USD', 'EUR', 'RON'];
          const sortedCodes = [
            ...priority.filter(p => codes.includes(p)),
            ...codes.filter(c => !priority.includes(c))
          ];
          setAvailableCurrencies(sortedCodes);

          // Persist fresh currency codes (rates are already persisted in getExchangeRates)
          await AsyncStorage.setItem('cached_currency_codes', JSON.stringify(sortedCodes));
        }
      } catch (e) {
        console.error("Currency Init Error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
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

  /**
   * Global Format Function
   * Assume incoming amounts are in USD (our base storage currency)
   */
  const format = (amount: number, options: { compact?: boolean; showSign?: boolean, threshold?: number, isConverted?: boolean } = {}): string => {
    const { compact = false, showSign = false, threshold = 1000000, isConverted = false } = options;

    // 1. Convert Value
    let displayValue = amount;
    if (rates && currency !== 'USD' && !isConverted) {
      const rate = rates[currency];
      if (rate) displayValue = amount * rate;
    }

    const absAmount = Math.abs(displayValue);
    const sign = displayValue > 0 ? (showSign ? '+' : '') : (displayValue < 0 ? '-' : '');

    // Get Symbol (fallback to code if not in map)
    const symbol = SYMBOLS[currency] || `${currency} `;
  let formattedValue = '';

    if(symbol.length > 2 && absAmount >= 100000 && compact === true){
      formattedValue = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumSignificantDigits: 3
      }).format(absAmount);
        return `${sign}${symbol}${formattedValue}`;
    }
    
    if (compact && absAmount >= threshold) {
      formattedValue = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumSignificantDigits: 3
      }).format(absAmount);
 
    }
     else {
      formattedValue = absAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
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
