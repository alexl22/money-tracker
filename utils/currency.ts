import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const API_KEY = process.env.EXPO_PUBLIC_EXCHANGE_RATE_API_KEY;
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;
const CACHE_KEY = 'exchange_rates_cache';
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 ore 

export const getExchangeRates = async () => {
  try {
    // 1. Verificare Cache Local (AsyncStorage)
    const cachedLocal = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedLocal) {
      const { rates, timestamp } = JSON.parse(cachedLocal);
      // Dacă avem date locale valide, le folosim instant
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        console.log("Currency: Using Local Cache");
        return rates;
      }
    }

    // 2. Dacă Cache Local lipsește/e expirat, verificăm Cache Global (Firestore)
    try {
      const globalRef = doc(db, "global_configs", "exchange_rates");
      const globalSnap = await getDoc(globalRef);

      if (globalSnap.exists()) {
        const data = globalSnap.data();
        const updatedAt = data.updatedAt?.toDate() || new Date(0);
        
        // Dacă datele din Firestore sunt de astăzi (mai noi de 24h)
        if (Date.now() - updatedAt.getTime() < CACHE_EXPIRY) {
          console.log("Currency: Using Firestore Global Cache");
          // Updatează cache-ul local pentru acest user pentru a nu mai citi din Firestore data viitoare
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
            rates: data.rates,
            timestamp: Date.now()
          }));
          return data.rates;
        }
      }
    } catch (firestoreError) {
      console.warn("Firestore Currency Cache read error:", firestoreError);
      // Continuăm la API dacă Firestore e indisponibil
    }

    // 3. Dacă nici Firestore nu are date proaspete, facem Fetch de la API Extern (limitat la 1500/lună)
    console.group("Currency Update Required");
    console.log("Currency: Fetching from External API...");
    const response = await fetch(BASE_URL);
    const apiData = await response.json();

    if (apiData.result === 'success') {
      const rates = apiData.conversion_rates;

      // Updatează Cache Global (Firestore) pentru ca alți utilizatori să nu mai consume API
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

      // Updatează Cache Local (AsyncStorage) pentru user-ul curent
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        rates: rates,
        timestamp: Date.now()
      }));

      console.groupEnd();
      return rates;
    }
    
    console.groupEnd();
    return null;
  } catch (error) {
    console.error("Eroare la preluarea ratelor valutare:", error);
    
    // Ultimul Fallback: returnează ce avem local chiar dacă e expirat, mai bine decât nimic
    const cachedLocal = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedLocal) {
        return JSON.parse(cachedLocal).rates;
    }
    return null;
  }
}
