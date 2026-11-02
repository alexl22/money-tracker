import { collection, doc, getDocs, query, where, writeBatch } from '@react-native-firebase/firestore';
import { db, deleteUserAccount as helperDeleteAccount } from '../../firebaseConfig';
import { resetUserStats } from '../../utils/statsManager';

export async function clearAllUserTransactions(userId: string): Promise<boolean> {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return false;
  }

  const batchSize = 500;
  const totalDocs = snapshot.docs.length;

  for (let i = 0; i < totalDocs; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = snapshot.docs.slice(i, i + batchSize);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await resetUserStats(userId);
  return true;
}

export async function clearAllUserLoans(userId: string): Promise<boolean> {
  const q = query(collection(db, 'loans'), where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return false;
  }

  const batchSize = 500;
  const totalDocs = snapshot.docs.length;

  for (let i = 0; i < totalDocs; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = snapshot.docs.slice(i, i + batchSize);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  return true;
}

export async function deleteAccountCascade(userId: string): Promise<void> {
  const txSnapshot = await getDocs(query(collection(db, 'transactions'), where('userId', '==', userId)));
  for (let i = 0; i < txSnapshot.docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = txSnapshot.docs.slice(i, i + 500);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  const lSnapshot = await getDocs(query(collection(db, 'loans'), where('userId', '==', userId)));
  for (let i = 0; i < lSnapshot.docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = lSnapshot.docs.slice(i, i + 500);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  const gSnapshot = await getDocs(query(collection(db, 'goals'), where('userId', '==', userId)));
  for (let i = 0; i < gSnapshot.docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = gSnapshot.docs.slice(i, i + 500);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await writeBatch(db).delete(doc(db, 'users', userId)).commit();
  await helperDeleteAccount();
}
