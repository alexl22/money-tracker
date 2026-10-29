import { ArrowUpDown, CalendarDays, SlidersHorizontal, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import styles from '../../styles/history.styles';
import { horizontalScale, moderateScale } from '../../utils/scaling';
import { WeekInfo } from './WeekSelector';

interface HistoryFilterBarProps {
  showAllHistory: boolean;
  isCustomRangeActive: boolean;
  customRange: { start: Date; end: Date } | null;
  weeks: WeekInfo[];
  selectedWeekIndex: number;
  txCount: number;
  sortOrder: 'none' | 'amount-desc' | 'amount-asc';
  setSortOrder: (order: 'none' | 'amount-desc' | 'amount-asc') => void;
  filterMode: 'all' | 'income' | 'expense';
  setFilterMode: (mode: 'all' | 'income' | 'expense') => void;
  weekIncome: number;
  format: (amount: number, options?: any) => string;
  onOpenRangePicker: () => void;
  onClearCustomRange: () => void;
}

export function HistoryFilterBar({
  showAllHistory,
  isCustomRangeActive,
  customRange,
  weeks,
  selectedWeekIndex,
  txCount,
  sortOrder,
  setSortOrder,
  filterMode,
  setFilterMode,
  weekIncome,
  format,
  onOpenRangePicker,
  onClearCustomRange,
}: HistoryFilterBarProps) {
  const toggleSortOrder = () => {
    const modes: ('none' | 'amount-desc' | 'amount-asc')[] = ['none', 'amount-desc', 'amount-asc'];
    const nextMode = modes[(modes.indexOf(sortOrder) + 1) % modes.length];
    setSortOrder(nextMode);
  };

  const toggleFilterMode = () => {
    const modes: ('all' | 'income' | 'expense')[] = ['all', 'income', 'expense'];
    const nextMode = modes[(modes.indexOf(filterMode) + 1) % modes.length];
    setFilterMode(nextMode);
  };

  const titleText = showAllHistory
    ? isCustomRangeActive && customRange
      ? `${customRange.start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${customRange.end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`.replace(/ /g, '\u00A0')
      : 'All\u00A0History'
    : `Week\u00A0${weeks[selectedWeekIndex]?.label}`;

  return (
    <View style={styles.weekHeader}>
      <View style={styles.weekTitleRow}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: horizontalScale(6),
            flex: 1,
            flexShrink: 1,
            marginRight: horizontalScale(4),
          }}
        >
          <Text
            style={[
              styles.weekTitle,
              {
                flex: 0,
                flexGrow: 0,
                flexShrink: 1,
                marginRight: 0,
                fontSize: showAllHistory ? moderateScale(24) : moderateScale(26),
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {titleText}
          </Text>
          <View style={[styles.weekTitleBadge, { flexShrink: 0 }]}>
            <Text style={styles.weekTitleBadgeText}>{txCount}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: horizontalScale(5), alignItems: 'center', flexShrink: 0 }}>
          {showAllHistory && (
            <View
              style={[
                styles.filterIconButton,
                isCustomRangeActive && styles.filterIconButtonActive,
                { overflow: 'hidden' },
              ]}
            >
              <Pressable
                onPress={onOpenRangePicker}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: horizontalScale(6),
                  paddingVertical: horizontalScale(7),
                  paddingLeft: horizontalScale(9),
                  paddingRight: isCustomRangeActive ? horizontalScale(4) : horizontalScale(10),
                }}
              >
                <CalendarDays
                  color={isCustomRangeActive ? '#4A8AF4' : 'rgba(255,255,255,0.4)'}
                  size={14}
                  strokeWidth={2.5}
                />
                <Text
                  style={[
                    styles.filterModeLabel,
                    { color: isCustomRangeActive ? '#4A8AF4' : 'rgba(255,255,255,0.4)' },
                  ]}
                >
                  RANGE
                </Text>
              </Pressable>

              {isCustomRangeActive && (
                <Pressable
                  onPress={onClearCustomRange}
                  style={{
                    paddingHorizontal: horizontalScale(8),
                    borderLeftWidth: 1,
                    borderLeftColor: 'rgba(74, 138, 244, 0.3)',
                    height: horizontalScale(20),
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <X color="#4A8AF4" size={14} strokeWidth={3} />
                </Pressable>
              )}
            </View>
          )}

          {!showAllHistory && (
            <TouchableOpacity
              style={[
                styles.filterIconButton,
                sortOrder !== 'none' && styles.filterIconButtonActive,
                {
                  borderColor: sortOrder === 'none' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(74, 138, 244, 0.7)',
                  height: horizontalScale(32),
                  width: horizontalScale(66),
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: horizontalScale(5),
                },
              ]}
              onPress={toggleSortOrder}
            >
              <ArrowUpDown
                color={sortOrder === 'none' ? 'rgba(255,255,255,0.4)' : '#4A8AF4'}
                size={14}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.filterModeLabel,
                  { color: sortOrder !== 'none' ? '#4A8AF4' : 'rgba(255,255,255,0.4)' },
                ]}
              >
                {sortOrder === 'none' ? 'SORT' : sortOrder === 'amount-desc' ? 'MAX' : 'MIN'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.filterIconButton,
              filterMode !== 'all' && styles.filterIconButtonActive,
              {
                borderColor:
                  filterMode === 'all'
                    ? 'rgba(255, 255, 255, 0.18)'
                    : filterMode === 'income'
                    ? 'rgba(16, 185, 129, 0.7)'
                    : 'rgba(235, 86, 86, 0.7)',
                paddingVertical: horizontalScale(7),
                paddingHorizontal: horizontalScale(9),
                height: horizontalScale(32),
                gap: horizontalScale(6),
              },
            ]}
            onPress={toggleFilterMode}
          >
            {filterMode === 'all' && (
              <SlidersHorizontal color="rgba(255,255,255,0.4)" size={14} strokeWidth={2.5} />
            )}
            <Text
              style={[
                styles.filterModeLabel,
                {
                  color:
                    filterMode !== 'all'
                      ? filterMode === 'income'
                        ? '#10b981'
                        : '#eb5656'
                      : 'rgba(255,255,255,0.4)',
                },
              ]}
            >
              {filterMode === 'all' ? 'ANY' : filterMode.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: horizontalScale(6),
        }}
      >
        <Text style={[styles.weekIncomeLabelSmall, { flexShrink: 1, marginRight: horizontalScale(8) }]}>
          {showAllHistory ? 'TOTAL BALANCE: ' : 'WEEK BALANCE: '}
          <Text
            style={[styles.weekIncomeValueSmall, { color: weekIncome >= 0 ? '#10b981' : '#eb5656' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {format(weekIncome, { compact: true, showSign: true, isConverted: true })}
          </Text>
        </Text>

        {showAllHistory && (
          <TouchableOpacity
            style={[
              styles.filterIconButton,
              sortOrder !== 'none' && styles.filterIconButtonActive,
              {
                borderColor: sortOrder === 'none' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(74, 138, 244, 0.7)',
                height: horizontalScale(32),
                width: horizontalScale(66),
                justifyContent: 'center',
                alignItems: 'center',
                gap: horizontalScale(5),
              },
            ]}
            onPress={toggleSortOrder}
          >
            <ArrowUpDown
              color={sortOrder === 'none' ? 'rgba(255,255,255,0.4)' : '#4A8AF4'}
              size={14}
              strokeWidth={2.5}
            />
            <Text
              style={[
                styles.filterModeLabel,
                { color: sortOrder !== 'none' ? '#4A8AF4' : 'rgba(255,255,255,0.4)' },
              ]}
            >
              {sortOrder === 'none' ? 'SORT' : sortOrder === 'amount-desc' ? 'MAX' : 'MIN'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
