import { collection, getDocs, orderBy, query, where } from '@react-native-firebase/firestore';
import { db } from '../../firebaseConfig';
import { exportToCSV, exportToPDF } from '../../utils/export';

interface ExportAuditParams {
  userId: string;
  currency: string;
  rates: any;
  format: (amount: number, options?: any) => string;
  exportFormat: 'PDF' | 'CSV' | string;
  userName?: string;
}

export async function generateAuditExport({
  userId,
  currency,
  rates,
  format,
  exportFormat,
  userName,
}: ExportAuditParams): Promise<{ count: number }> {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc: any) => {
    const d = doc.data();
    let finalDate: Date;
    const rawDate = d.date || d.createdAt;

    if (rawDate && typeof rawDate.toDate === 'function') {
      finalDate = rawDate.toDate();
    } else if (rawDate instanceof Date) {
      finalDate = rawDate;
    } else if (rawDate) {
      finalDate = new Date(rawDate);
    } else {
      finalDate = new Date();
    }

    return {
      id: doc.id,
      title: d.title || 'Untitled',
      amount: d.amount || 0,
      currency: d.currency || currency,
      amountUSD: d.amountUSD || 0,
      type: d.type || 'expense',
      notes: d.notes || '',
      category: d.category || 'General',
      createdAt: finalDate,
    };
  });

  if (data.length === 0) {
    return { count: 0 };
  }

  if (exportFormat === 'CSV') {
    await exportToCSV(data, format, currency, rates);
  } else {
    await exportToPDF(data, format, currency, rates, userName);
  }

  return { count: data.length };
}
