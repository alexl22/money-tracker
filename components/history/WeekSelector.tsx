import React from 'react';
import { Pressable, Text, View } from 'react-native';
import styles from '../../styles/history.styles';

export interface WeekInfo {
  start: Date;
  end: Date;
  label: string;
  range: string;
}

export function getWeeksOfMonth(year: number, month: number): WeekInfo[] {
  const weeks: WeekInfo[] = [];
  const lastDayDate = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < 3; i++) {
    const start = i * 7 + 1;
    const end = (i + 1) * 7;
    weeks.push({
      start: new Date(year, month, start, 0, 0, 0),
      end: new Date(year, month, end, 23, 59, 59),
      label: (i + 1).toString().padStart(2, '0'),
      range: `${start.toString().padStart(2, '0')}-${end.toString().padStart(2, '0')}`,
    });
  }

  weeks.push({
    start: new Date(year, month, 22, 0, 0, 0),
    end: new Date(year, month, lastDayDate, 23, 59, 59),
    label: '04',
    range: `22-${lastDayDate.toString().padStart(2, '0')}`,
  });

  return weeks;
}

interface WeekSelectorProps {
  weeks: WeekInfo[];
  selectedWeekIndex: number;
  onSelectWeek: (index: number) => void;
  onLayoutY: (y: number) => void;
}

export function WeekSelector({
  weeks,
  selectedWeekIndex,
  onSelectWeek,
  onLayoutY,
}: WeekSelectorProps) {
  return (
    <View
      style={styles.weekSelectorScroll}
      onLayout={(e) => {
        onLayoutY(e.nativeEvent.layout.y);
      }}
    >
      <View style={styles.weekContainer}>
        {['01', '02', '03', '04'].map((weekLabel, index) => (
          <Pressable
            key={index}
            onPress={() => onSelectWeek(index)}
            style={({ pressed }) => [
              styles.weekCard,
              selectedWeekIndex === index && styles.weekCardActive,
              { transform: [{ scale: selectedWeekIndex === index || pressed ? 1.01 : 1 }] },
            ]}
          >
            <Text style={[styles.weekLabel, selectedWeekIndex === index && styles.weekLabelActive]}>
              WEEK
            </Text>
            <Text style={[styles.weekNumber, selectedWeekIndex === index && styles.weekNumberActive]}>
              {weekLabel}
            </Text>
            <Text style={[styles.weekRange, selectedWeekIndex === index && styles.weekRangeActive]}>
              {weeks[index]?.range || ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
