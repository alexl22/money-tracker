export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  targetAmountUSD: number;
  currency: string;
  startDate: Date;
  deadline: Date;
  userId: string;
  isAddCard?: boolean;
  completedAt?: Date;
  initialNetUSD?: number;
  initialNetCalibrated?: boolean;
}
