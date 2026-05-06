import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { db } from '../firebaseConfig';

const API_KEY = process.env.EXPO_PUBLIC_EXCHANGE_RATE_API_KEY;
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;
const CACHE_KEY = 'cached_exchange_rates';
const CACHE_EXPIRY = 1000 * 60 * 60 * 24;

export const getExchangeRates = async () => {
  try {
    const cachedLocal = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedLocal) {
      const { rates, timestamp } = JSON.parse(cachedLocal);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        console.log("Currency: Using Local Cache");
        return rates;
      }
    }

    let globalData: any = null;
    try {
      const globalRef = doc(db, "global_configs", "exchange_rates");
      const globalSnap = await getDoc(globalRef);
      if (globalSnap.exists()) {
        globalData = globalSnap.data();
      }

      if (globalData) {
        const rawUpdatedAt = globalData.updatedAt;
        let updatedAtDate: Date;

        if (rawUpdatedAt && typeof rawUpdatedAt.toDate === 'function') {
          updatedAtDate = rawUpdatedAt.toDate();
        } else if (rawUpdatedAt instanceof Date) {
          updatedAtDate = rawUpdatedAt;
        } else if (rawUpdatedAt?.seconds) {
          updatedAtDate = new Date(rawUpdatedAt.seconds * 1000);
        } else {
          updatedAtDate = new Date(0);
        }

        if (Date.now() - updatedAtDate.getTime() < CACHE_EXPIRY) {
          console.log("Currency: Using Firestore Global Cache");
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
            rates: globalData.rates,
            timestamp: updatedAtDate.getTime()
          }));
          return globalData.rates;
        }
      }
    } catch (firestoreError) {
      console.warn("Firestore Currency Cache read error:", firestoreError);
    }

    console.group("Currency Update Required");
    console.log("Currency: Fetching from External API...");

    if (!API_KEY) {
      console.warn("Currency: API Key is missing.");
      if (globalData) return globalData.rates;
      return null;
    }

    const response = await fetch(BASE_URL);
    const apiData = await response.json();

    if (apiData.result === 'success') {
      const rates = apiData.conversion_rates;

      try {
        const globalRef = doc(db, "global_configs", "exchange_rates");
        await setDoc(globalRef, {
          rates: rates,
          updatedAt: serverTimestamp()
        });
        console.log("Currency: Global Cache updated in Firestore.");
      } catch (firestoreWriteError) {
        console.warn("Firestore Currency Cache write error:", firestoreWriteError);
      }

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        rates: rates,
        timestamp: Date.now()
      }));

      console.groupEnd();
      return rates;
    }

    console.groupEnd();
    if (globalData) return globalData.rates;
    return null;
  } catch (error) {
    console.error("Eroare la preluarea ratelor valutare:", error);
    const cachedLocal = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedLocal) {
      return JSON.parse(cachedLocal).rates;
    }
    return null;
  }
}
