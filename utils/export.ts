import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface ExportTransaction {
  id: string;
  title: string;
  amount: number;
  amountUSD: number;
  currency: string;
  type: 'income' | 'expense';
  createdAt: Date;
  notes?: string;
  category?: string;
}

export const exportToCSV = async (
  transactions: ExportTransaction[],
  format: (amount: number, options?: any) => string,
  currency: string,
  rates?: any
) => {
  if (transactions.length === 0) throw new Error("No transactions to export.");

  const header = ["Date", "Time", "Title", "Category/Notes", "Type", "Amount"].join(",");

  const rows = transactions.map(t => {
    const date = t.createdAt.toLocaleDateString();
    const time = t.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isSameCurrency = t.currency === currency;
    const displayValue = isSameCurrency ? t.amount : t.amountUSD;
    const amount = format(t.type === 'income' ? displayValue : -displayValue, { showSign: true, isConverted: isSameCurrency });

    const escapedTitle = t.title.includes(',') || t.title.includes('"') ? `"${t.title.replace(/"/g, '""')}"` : t.title;
    const escapedNotes = (t.notes || 'General').includes(',') || (t.notes || 'General').includes('"') ? `"${(t.notes || 'General').replace(/"/g, '""')}"` : (t.notes || 'General');

    return [date, time, escapedTitle, escapedNotes, t.type.toUpperCase(), amount].join(",");
  });

  const csvString = [header, ...rows].join("\n");
  const fileName = `Transactions_${new Date().toISOString().split('T')[0]}.csv`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  try {
    await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Share CSV Report' });
  } catch (error) {
    console.error("CSV Export failed:", error);
    throw error;
  }
};

export const exportToPDF = async (
  transactions: ExportTransaction[],
  format: (amount: number, options?: any) => string,
  currency: string,
  rates: any,
  userName?: string,
) => {
  if (transactions.length === 0) throw new Error("No transactions to export.");

  const totalIncome =  transactions.filter(t => t.type === 'income').reduce((sum, t) =>{
    const actualValue = t.currency === currency ? t.amount : (t.amountUSD * (rates?.[currency] || 1));
    return sum + actualValue;
  }, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => {
     const actualValue = t.currency === currency ? t.amount : (t.amountUSD * (rates?.[currency] || 1));
    return sum + actualValue;
  }, 0);
  const netBalance = totalIncome - totalExpense;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Transaction Report</title>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #3b82f6; margin: 0; font-size: 28px; }
          .header p { margin: 5px 0 0 0; color: #666; }
          .summary { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 10px; }
          .summary-item { text-align: center; flex: 1; }
          .summary-item .label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
          .summary-item .value { font-size: 18px; font-weight: bold; }
          .income { color: #10b981; }
          .expense { color: #ef4444; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f1f5f9; text-align: left; padding: 12px; font-size: 13px; color: #475569; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Money Tracker</h1>
          <p>Financial Report for ${userName || 'User'}</p>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="label">Total Income</div>
            <div class="value income">${format(totalIncome, {isConverted: true})}</div>
          </div>
          <div class="summary-item">
            <div class="label">Total Expense</div>
            <div class="value expense">${format(-totalExpense, {isConverted: true})}</div>
          </div>
          <div class="summary-item">
            <div class="label">Net Balance</div>
            <div class="value ${netBalance >= 0 ? 'income' : 'expense'}">${format(netBalance, { showSign: true, isConverted: true })}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Category/Notes</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t =>{
              const isSameCurrency = t.currency === currency;
              const displayValue = isSameCurrency ? t.amount : (t.amountUSD || t.amount);
              return `
              <tr>
                <td>${t.createdAt.toLocaleDateString()}</td>
                <td>${t.title}</td>
                <td>${t.notes || 'General'}</td>
                <td style="color: ${t.type === 'income' ? '#10b981' : '#ef4444'}">${t.type.toUpperCase()}</td>
                <td style="font-weight: bold; color: ${t.type === 'income' ? '#10b981' : '#ef4444'}">
                  ${format(t.type === 'income' ? displayValue : -displayValue, { showSign: true, isConverted: isSameCurrency })}
                </td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>

        <div class="footer">
          Generated by Money Tracker App &copy; ${new Date().getFullYear()}
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    const fileName = `MoneyTracker_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    const newUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.moveAsync({
      from: uri,
      to: newUri
    });
    await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: 'Share Report', UTI: 'com.adobe.pdf' });
  } catch (error) {
    console.error("PDF Export failed:", error);
    throw error;
  }
};
