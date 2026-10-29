import { Receipt, Wallet } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import styles from '../../styles/home.styles';
import { AnimatedAmount } from './AnimatedAmount';

interface HomeSummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  averageIncome: number;
  averageExpenses: number;
  viewMode: 'total' | 'month' | 'range';
  format: (amount: number, options?: any) => string;
  showAlert: (title: string, message: string, type?: any) => void;
}

export function HomeSummaryCards({
  totalIncome,
  totalExpenses,
  averageIncome,
  averageExpenses,
  viewMode,
  format,
  showAlert,
}: HomeSummaryCardsProps) {
  const profit = totalIncome - totalExpenses;

  return (
    <>
      <View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            showAlert(
              'Total Income Details',
              `Total: ${format(totalIncome, { isConverted: true })}\n${
                viewMode === 'month' ? 'Daily' : 'Monthly'
              }: ${format(averageIncome, { isConverted: true })}`,
              'info'
            )
          }
          style={styles.largeCard}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Wallet color="#10b981" size={22} strokeWidth={2.5} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statColumn}>
              <Text style={styles.cardLabel}>TOTAL INCOME</Text>
              <AnimatedAmount
                value={totalIncome}
                format={format}
                style={[styles.cardAmount, { color: '#10b981' }]}
                options={{ compact: true, isConverted: true }}
              />
            </View>

            <View style={styles.vDivider} />

            <View style={styles.statColumn}>
              <Text style={styles.footerLabel}>{viewMode === 'total' ? 'Monthly' : 'Daily'}</Text>
              <AnimatedAmount
                value={averageIncome}
                format={format}
                style={[styles.footerValue, { color: '#10b981' }]}
                options={{ compact: true, isConverted: true }}
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            showAlert(
              'Total Expenses Details',
              `Total: ${format(totalExpenses, { isConverted: true })}\n${
                viewMode === 'month' ? 'Daily' : 'Monthly'
              }: ${format(averageExpenses, { isConverted: true })}`,
              'info'
            )
          }
          style={styles.largeCard}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(235, 86, 86, 0.1)' }]}>
              <Receipt color="#eb5656" size={22} strokeWidth={2.5} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statColumn}>
              <Text style={styles.cardLabel}>TOTAL EXPENSES</Text>
              <AnimatedAmount
                value={totalExpenses}
                format={format}
                style={[styles.cardAmount, { color: '#eb5656' }]}
                options={{ compact: true, isConverted: true }}
              />
            </View>

            <View style={styles.vDivider} />

            <View style={styles.statColumn}>
              <Text style={styles.footerLabel}>{viewMode === 'total' ? 'Monthly' : 'Daily'}</Text>
              <AnimatedAmount
                value={averageExpenses}
                format={format}
                style={[styles.footerValue, { color: '#eb5656' }]}
                options={{ compact: true, isConverted: true }}
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            showAlert(
              viewMode === 'total' ? 'Total Profit Details' : 'Period Profit Details',
              `Period Profit: ${format(profit, { isConverted: true, showSign: true })}`,
              'info'
            )
          }
          style={styles.totalBalanceCard}
        >
          <View style={styles.totalBalanceHeader}>
            <Text style={[styles.totalBalanceLabel, { color: '#ffffffc7', opacity: 0.8 }]}>
              {viewMode === 'total' ? 'TOTAL PROFIT' : 'PERIOD PROFIT'}
            </Text>
          </View>
          <AnimatedAmount
            value={profit}
            format={format}
            style={[styles.totalBalanceAmount, { color: profit >= 0 ? '#10b981' : '#eb5656' }]}
            options={{ compact: true, isConverted: true, showSign: true }}
          />
        </TouchableOpacity>
      </View>
    </>
  );
}
