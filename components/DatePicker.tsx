import { BlurView } from 'expo-blur';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface DatePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (startDate: Date, deadline: Date) => void;
  initialStartDate ?: Date;
  initialDeadline ?: Date;
}

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function DatePicker({
  isVisible,
  onClose,
  onSave,
  initialStartDate,
  initialDeadline
}: DatePickerProps) {
  const [activeMode, setActiveMode] = useState<'start' | 'deadline'>('start');
  const [tempStart, setTempStart] = useState(new Date(initialStartDate || new Date()));
  const [tempDeadline, setTempDeadline] = useState(new Date(initialDeadline || new Date()));
  const [cursor, setCursor] = useState(new Date(tempStart));

  useEffect(() => {
    if (isVisible) {
      const s = new Date(initialStartDate || new Date());
      const d = new Date(initialDeadline || new Date());
      setTempStart(s);
      setTempDeadline(d);
      setCursor(new Date(s));
      setActiveMode('start');
    }
  }, [isVisible]);

  // Sync cursor with mode changes
  useEffect(() => {
    if (activeMode === 'start') {
      setCursor(new Date(tempStart));
    } else {
      setCursor(new Date(tempDeadline));
    }
  }, [activeMode]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCursor(new Date(year, month - 1, 1));

  };

  const nextMonth = () => {
    setCursor(new Date(year, month + 1, 1));

  };

  const handleDayPress = (day: number) => {
    const newDate = new Date(year, month, day);
    newDate.setHours(0, 0, 0, 0);

    if (activeMode === 'start') {
      setTempStart(newDate);
    } else {
      setTempDeadline(newDate);
    }

  };

  const handleConfirm = () => {
    const s = new Date(tempStart);
    s.setHours(0, 0, 0, 0);
    const d = new Date(tempDeadline);
    d.setHours(23, 59, 59, 999);
    onSave(s, d);
    onClose();
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };


  const dayItems = [];
  for (let i = 0; i < firstDay; i++) {
    dayItems.push(<View key={`prev-${i}`} style={styles.dayItem} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    dateObj.setHours(0, 0, 0, 0);

    const isStart = tempStart.toDateString() === dateObj.toDateString();
    const isDeadline = tempDeadline.toDateString() === dateObj.toDateString();
    const isToday = new Date().toDateString() === dateObj.toDateString();

    dayItems.push(
      <TouchableOpacity
        key={`curr-${d}`}
        activeOpacity={0.8}
        style={styles.dayItem}
        onPress={() => handleDayPress(d)}
      >
        <View style={[
          styles.dayCircle,
          isStart && styles.startCircle,
          isDeadline && styles.deadlineCircle,
          isStart && activeMode !== 'start' && styles.dimmedDay,
          isDeadline && activeMode !== 'deadline' && styles.dimmedDay,
          (activeMode === 'start' && isStart || activeMode === 'deadline' && isDeadline) && styles.activeIndicator
        ]}>
          <Text style={[
            styles.dayText,
            (isStart || isDeadline) && styles.selectedDayText,
            isStart && activeMode !== 'start' && styles.dimmedText,
            isDeadline && activeMode !== 'deadline' && styles.dimmedText,
            isToday && !isStart && !isDeadline && styles.todayText
          ]}>
            {d}
          </Text>
        </View>
        {isToday && !isStart && !isDeadline && <View style={styles.todayDot} />}
      </TouchableOpacity>
    );
  }

  const totalSlots = 42;
  const remainingSlots = totalSlots - dayItems.length;
  for (let d = 1; d <= remainingSlots; d++) {
    dayItems.push(<View key={`next-${d}`} style={styles.dayItem} />);
  }

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent={true}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView intensity={60} tint="dark" style={styles.blurContainer}>
          <Pressable style={styles.content} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>GOAL PERIOD</Text>
                <Text style={styles.headerSubtitle}>Select your dates below</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X color="rgba(255,255,255,0.4)" size={22} />
              </TouchableOpacity>
            </View>

            {/* Mode Switcher */}
            <View style={styles.modeSwitcher}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.modeBtn, activeMode === 'start' && styles.modeBtnActive]}
                onPress={() => setActiveMode('start')}
              >
                <Text style={[styles.modeLabel, activeMode === 'start' && styles.modeLabelActive]}>START DATE</Text>
                <Text style={[styles.modeDate, activeMode === 'start' && styles.modeDateActive]}>
                  {formatDateShort(tempStart)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.modeBtn, activeMode === 'deadline' && styles.modeBtnActive]}
                onPress={() => setActiveMode('deadline')}
              >
                <Text style={[styles.modeLabel, activeMode === 'deadline' && styles.modeLabelActive]}>END DATE</Text>
                <Text style={[styles.modeDate, activeMode === 'deadline' && styles.modeDateActive]}>
                  {formatDateShort(tempDeadline)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <ChevronLeft color="#fff" size={22} />
                </TouchableOpacity>
                <View style={styles.monthDisplay}>
                  <Text style={styles.monthText}>{MONTHS[month]}</Text>
                  <Text style={styles.yearText}>{year}</Text>
                </View>
                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                  <ChevronRight color="#fff" size={22} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekLabels}>
                {DAYS_OF_WEEK.map((d, i) => (
                  <Text key={i} style={styles.weekLabelText}>{d}</Text>
                ))}
              </View>

              <View style={styles.grid}>
                {dayItems}
              </View>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Text style={styles.confirmBtnText}>Save Period</Text>
                <Check color="#fff" size={20} />
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </BlurView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)'
  },
  blurContainer: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    width: '90%',
  },
  content: {
    padding: 16,
    paddingBottom: 20,
    backgroundColor: 'rgba(15,15,17,0.95)'
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4
  },
  headerTitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'Manrope_700Bold',
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 16,
  },
  modeBtnActive: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modeLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  modeLabelActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  modeDate: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Manrope_700Bold',
  },
  modeDateActive: {
    color: '#fff',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  calendarCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 20
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  navBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
  },
  monthDisplay: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'Manrope_700Bold'
  },
  yearText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    fontFamily: 'Inter_600SemiBold',
  },
  weekLabels: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekLabelText: {
    fontSize: 11,
    color: 'rgba(255, 253, 253, 0.41)',
    width: '14.28%',
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayItem: {
    width: '14.28%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 1,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  startCircle: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deadlineCircle: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dimmedDay: {
    backgroundColor: 'rgba(255, 255, 255, 0.33)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowOpacity: 0,
    elevation: 0
  },
  dimmedText: {
    color: 'rgba(255,255,255,0.45)',
  },
  activeIndicator: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  dayText: {
    fontSize: 16,
    color: 'rgba(214, 212, 212, 0.82)',
    fontFamily: 'Inter_500Medium'
  },
  selectedDayText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold'
  },
  todayText: {
    color: '#67E8F9',
    fontFamily: 'Inter_700Bold'
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#67E8F9',
    position: 'absolute',
    bottom: 4
  },
  confirmBtn: {
    height: 54,
    borderRadius: 20,
    overflow: 'hidden',
  },
  btnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  confirmBtnText: {
    fontSize: 17,
    color: '#fff',
    fontFamily: 'Manrope_700Bold',
  }
});
