import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import styles from '../../styles/history.styles';
import { horizontalScale, moderateScale } from '../../utils/scaling';
import { TransactionItem } from './types';

const renderGhostActions = () => <View style={{ width: 80 }} />;

interface TransactionRowProps {
  item: TransactionItem;
  index: number;
  isExpanded: boolean;
  showAllHistory: boolean;
  currency: string;
  format: (amount: number, options?: any) => string;
  showAlert: (
    title: string,
    message: string,
    type?: any,
    onConfirm?: () => void,
    showCancel?: boolean,
    isDismissible?: boolean
  ) => void;
  handleDeleteTransaction: (item: any) => void;
  setExpandedId: (id: string | null) => void;
  truncatedItems: Record<string, { title?: boolean; sub?: boolean }>;
  setTruncatedItems: React.Dispatch<React.SetStateAction<Record<string, { title: boolean; sub: boolean }>>>;
  onLongPress: () => void;
}

export const TransactionRow = React.memo(function TransactionRow({
  item,
  index,
  isExpanded,
  showAllHistory,
  currency,
  format,
  showAlert,
  handleDeleteTransaction,
  setExpandedId,
  truncatedItems,
  setTruncatedItems,
  onLongPress,
}: TransactionRowProps) {
  const rowRef = React.useRef<any>(null);

  return (
    <Animated.View
      entering={showAllHistory ? undefined : FadeInDown.delay(index * 60).springify().damping(15)}
      layout={LinearTransition}
      key={item.id}
      style={{ marginBottom: horizontalScale(10) }}
    >
      <Swipeable
        ref={rowRef}
        renderRightActions={renderGhostActions}
        renderLeftActions={renderGhostActions}
        onSwipeableWillOpen={() => {
          setTimeout(() => {
            rowRef.current?.close();
          }, 150);
          showAlert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            'alert',
            () => {
              handleDeleteTransaction(item);
            },
            true,
            false
          );
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            const isCompactAmount =
              item.amount.includes('M') || item.amount.includes('K') || item.amount.includes('B');
            const isTruncated = truncatedItems[item.id]?.title || truncatedItems[item.id]?.sub;

            if (isCompactAmount || isTruncated || !!item.notes) {
              setExpandedId(isExpanded ? null : item.id);
            }
          }}
          onLongPress={onLongPress}
          delayLongPress={300}
          style={[
            styles.transactionCard,
            { borderColor: item.type === 'income' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(235, 86, 86, 0.6)' },
          ]}
        >
          <View style={styles.cardMainRow}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: item.type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(235, 86, 86, 0.1)' },
              ]}
            >
              <item.icon color={item.type === 'income' ? '#10b981' : '#eb5656'} size={22} strokeWidth={2.5} />
            </View>
            <View style={styles.transactionInfo}>
              <Text
                style={styles.transactionTitle}
                numberOfLines={isExpanded ? undefined : 1}
                onTextLayout={(e) => {
                  if (!isExpanded && e.nativeEvent.lines.length > 0) {
                    const isTruncated =
                      e.nativeEvent.lines.length > 1 || e.nativeEvent.lines[0].width > moderateScale(150);
                    if (isTruncated && !truncatedItems[item.id]?.title) {
                      setTruncatedItems((prev: any) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], title: true },
                      }));
                    }
                  }
                }}
              >
                {item.title}
              </Text>
              <Text
                style={styles.transactionSub}
                numberOfLines={isExpanded ? undefined : 1}
                onTextLayout={(e) => {
                  if (!isExpanded && e.nativeEvent.lines.length > 0) {
                    const isTruncated = e.nativeEvent.lines.length > 1;
                    if (isTruncated && !truncatedItems[item.id]?.sub) {
                      setTruncatedItems((prev: any) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], sub: true },
                      }));
                    }
                  }
                }}
              >
                {item.sub}
              </Text>
            </View>
            <Text
              style={[styles.transactionAmount, { color: item.type === 'income' ? '#10b981' : '#eb5656' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {item.amount}
            </Text>
          </View>

          {isExpanded &&
            (item.amount.includes('M') ||
              item.amount.includes('K') ||
              item.amount.includes('B') ||
              !!item.notes) && (
              <View style={styles.expandedContent}>
                {(item.amount.includes('M') || item.amount.includes('K') || item.amount.includes('B')) && (
                  <View style={styles.detailDivider} />
                )}

                {(item.amount.includes('M') || item.amount.includes('K') || item.amount.includes('B')) && (
                  <View style={[styles.detailSectionRow, { marginBottom: horizontalScale(8) }]}>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>EXACT AMOUNT</Text>
                      <Text
                        style={[styles.detailValueLarge, { color: item.type === 'income' ? '#10b981' : '#eb5656' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {format(
                          item.currency === currency
                            ? item.type === 'income'
                              ? item.rawAmount
                              : -item.rawAmount
                            : item.type === 'income'
                            ? item.amountUSD
                            : -item.amountUSD,
                          { showSign: true, isConverted: item.currency === currency }
                        )}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
});
