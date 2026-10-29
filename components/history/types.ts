export interface TransactionItem {
  id: string;
  title: string;
  sub: string;
  amount: string;
  icon: any;
  rawAmount: number;
  amountUSD: number;
  currency: string;
  type: 'income' | 'expense';
  notes?: string;
  time: string;
  date?: Date;
  dateString?: string;
  createdAt?: Date;
  userId?: string;
}

export interface TransactionGroup {
  date: string;
  fullDate: string;
  dailyTotal: string;
  data: TransactionItem[];
}

export interface RawTransaction {
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
}
