export interface Loan {
  id: string;
  amount: number;
  currency: string;
  amountUSD: number;
  date: Date;
  note: string;
  personName: string;
  personEmail?: string;
  status: 'active' | 'settled';
  type: 'lent' | 'borrowed';
  userId: string;
  ownerName?: string;
  ownerEmail?: string;
}
