import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/transactionOptions.styles';

export const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface InlineMonthCalendarProps {
  cursorDate: Date;
  onChangeCursor: (newCursor: Date) => void;
  selectedDate: Date;
  onSelectDate: (newDate: Date) => void;
}

export function InlineMonthCalendar({
  cursorDate,
  onChangeCursor,
  selectedDate,
  onSelectDate,
}: InlineMonthCalendarProps) {
  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let firstDayIndex = new Date(year, month, 1).getDay();
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
    const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;

    days.push(
      <TouchableOpacity
        key={`day-${d}`}
        style={[
          styles.calendarDayButton,
          isSelected && styles.calendarDaySelected
        ]}
        onPress={() => {
          const newDate = new Date(selectedDate);
          newDate.setFullYear(year);
          newDate.setMonth(month);
          newDate.setDate(d);
          onSelectDate(newDate);
        }}
      >
        <Text style={[
          styles.calendarDayText,
          isSelected && styles.calendarDaySelectedText,
          isToday && !isSelected && styles.calendarDayTodayText
        ]}>
          {d}
        </Text>
      </TouchableOpacity>
    );
  }

  const totalSlots = Math.ceil(days.length / 7) * 7;
  const remaining = totalSlots - days.length;
  for (let i = 0; i < remaining; i++) {
    days.push(<View key={`empty-next-${i}`} style={styles.calendarDayEmpty} />);
  }

  const currentYear = new Date().getFullYear();
  const canPrev = month > 0 || year > currentYear;
  const canNext = month < 11 || year < currentYear;

  const prevMonth = () => {
    if (canPrev) {
      onChangeCursor(new Date(year, month - 1, 1));
    }
  };

  const nextMonth = () => {
    if (canNext) {
      onChangeCursor(new Date(year, month + 1, 1));
    }
  };

  return (
    <View style={styles.inlineCalendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={prevMonth}
          style={[styles.calendarNavBtn, !canPrev && { opacity: 0.3 }]}
          disabled={!canPrev}
        >
          <ChevronLeft color="#fff" size={18} />
        </TouchableOpacity>
        <Text style={styles.calendarMonthText}>
          {MONTHS[month]} {year}
        </Text>
        <TouchableOpacity
          onPress={nextMonth}
          style={[styles.calendarNavBtn, !canNext && { opacity: 0.3 }]}
          disabled={!canNext}
        >
          <ChevronRight color="#fff" size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarWeekLabels}>
        {DAYS_OF_WEEK.map((day, idx) => (
          <Text
            key={idx}
            style={[
              styles.calendarWeekLabelText,
              idx === 6 && { color: '#eb5656' }
            ]}
          >
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {days}
      </View>
    </View>
  );
}
