import { doc, getDoc, updateDoc } from '@react-native-firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Checks the last time stats were synced to Firestore.
 * If >= 14 days, recalculates and updates totalIncome, totalExpense, and totalProfit for the user.
 */
export const syncUserStats = async (userId: string, transactionsList: any[]) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const lastUpdatedRaw = userData.statsLastUpdated;
    let shouldSync = false;

    if (!lastUpdatedRaw) {
      // If never synced, sync now
      shouldSync = true;
    } else {
      // Convert Firestore timestamp or string to JS Date
      const lastUpdated = lastUpdatedRaw.toDate ? lastUpdatedRaw.toDate() : new Date(lastUpdatedRaw);
      const diffInTime = new Date().getTime() - lastUpdated.getTime();
      const diffInDays = diffInTime / (1000 * 3600 * 24);

      if (diffInDays >= 7) {
        shouldSync = true;
      }
    }

    if (shouldSync) {
      let income = 0;
      let expense = 0;
      
      transactionsList.forEach(tx => {
        // Use amountUSD for correct cross-currency comparison, fallback to nominal amount
        const amount = tx.amountUSD !== undefined ? tx.amountUSD : (tx.amount || 0);
        if (tx.type === 'income') {
          income += amount;
        } else if (tx.type === 'expense') {
          expense += amount;
        }
      });

      const roundedIncome = Math.round(income * 100) / 100;
      const roundedExpense = Math.round(expense * 100) / 100;
      const roundedProfit = Math.round((roundedIncome - roundedExpense) * 100) / 100;

      await updateDoc(userRef, {
        totalIncome: roundedIncome,
        totalExpense: roundedExpense,
        totalProfit: roundedProfit,
        statsLastUpdated: new Date()
      });
      
      console.log(`[Sync] Successfully updated overall stats in Firestore for user: ${userId}`);
    }
  } catch (error) {
    console.error("[Sync] Error updating user stats:", error);
  }
};
