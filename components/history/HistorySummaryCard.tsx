import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import styles from '../../styles/history.styles';

interface HistorySummaryCardProps {
  animatedCardStyle: any;
  isSearching: boolean;
  monthIncome: number;
  monthExpense: number;
  monthProfit: number;
  format: (amount: number, options?: any) => string;
  onPress: () => void;
  cardHeight: number;
}

export function HistorySummaryCard({
  animatedCardStyle,
  isSearching,
  monthIncome,
  monthExpense,
  monthProfit,
  format,
  onPress,
  cardHeight,
}: HistorySummaryCardProps) {
  return (
    <Animated.View style={animatedCardStyle} pointerEvents={isSearching ? 'none' : 'auto'}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <View style={[styles.summaryCardLarge, { height: cardHeight }]}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryLabel, { color: 'rgba(49, 230, 169, 0.4)' }]}>TOTAL INCOME</Text>
              <Text
                style={[styles.summaryValue, { color: '#10b981' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {format(monthIncome, { compact: true, showSign: true, isConverted: true })}
              </Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryLabel, { color: 'rgba(235, 86, 86, 0.68)' }]}>TOTAL EXPENSE</Text>
              <Text
                style={[styles.summaryValue, { color: '#eb5656' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {format(-monthExpense, { compact: true, isConverted: true })}
              </Text>
            </View>
          </View>

          <View style={styles.horizontalDivider} />

          <View style={styles.summaryBottom}>
            <Text style={styles.profitLabel}>NET PROFIT / LOSS</Text>
            <Text
              style={[styles.profitValue, { color: monthProfit >= 0 ? '#10b981' : '#eb5656' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {format(monthProfit, { compact: true, showSign: true, isConverted: true })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
