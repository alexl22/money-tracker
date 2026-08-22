import { doc, updateDoc } from '@react-native-firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import { Pencil, Trash2, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useAlert } from '../context/AlertContext';
import { useCurrency } from '../context/CurrencyContext';
import { db } from '../firebaseConfig';
import { horizontalScale, moderateScale } from '../utils/scaling';

const { width, height: screenHeight } = Dimensions.get('screen');

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface TransactionOptionsMenuProps {
  isVisible: boolean;
  onClose: () => void;
  transaction: any;
  onEdit?: () => void;
  onDelete: () => void;
}

export default function TransactionOptionsMenu({
  isVisible,
  onClose,
  transaction,
  onEdit,
  onDelete,
}: TransactionOptionsMenuProps) {
  const { format, convertToBase } = useCurrency();
  const { showAlert } = useAlert();

  const [mode, setMode] = useState<'menu' | 'edit'>('menu');
  const [layoutReady, setLayoutReady] = useState(false);
  const [animateMenu, setAnimateMenu] = useState(true);

  // Edit form state
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Android NavigationBar management
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (isVisible) {
        NavigationBar.setBackgroundColorAsync('rgba(0, 0, 0, 0.80)');
      } else {
        NavigationBar.setBackgroundColorAsync('rgba(0, 0, 0, 0)');
      }
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setLayoutReady(false);
      setAnimateMenu(true);
    } else if (transaction) {
      setMode('menu');
      setAmount(transaction.rawAmount ? transaction.rawAmount.toString() : '');
      setTitle(transaction.title || '');
      setNotes(transaction.notes || '');
      setTransactionType(transaction.type || 'expense');

      // Parse transaction date, fallback to createdAt or current date
      let txDate: Date;
      if (transaction.date) {
        txDate = new Date(transaction.date.toDate ? transaction.date.toDate() : transaction.date);
      } else if (transaction.createdAt) {
        txDate = new Date(transaction.createdAt.toDate ? transaction.createdAt.toDate() : transaction.createdAt);
      } else {
        txDate = new Date();
      }
      setDate(txDate);
      const currentYear = new Date().getFullYear();
      if (txDate.getFullYear() === currentYear) {
        setCalendarCursor(new Date(txDate));
      } else {
        setCalendarCursor(new Date());
      }
      setShowCalendar(false);
    }
  }, [isVisible, transaction]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (!isVisible || !transaction) return null;

  const displayAmount = format(transaction.rawAmount || 0, {
    showSign: true,
    isConverted: true,
  });

  const handleSaveEdit = async () => {
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      showAlert('Invalid Amount', 'Please enter a valid amount.', 'alert');
      return;
    }
    if (!title.trim()) {
      showAlert('Invalid Title', 'Please enter a title for the transaction.', 'alert');
      return;
    }

    setIsSaving(true);
    try {
      const transactionRef = doc(db, 'transactions', transaction.id);
      const parsedAmount = parseFloat(amount);
      const updatedData = {
        amount: parsedAmount,
        amountUSD: convertToBase(parsedAmount),
        type: transactionType,
        title: title.trim(),
        notes: notes.trim(),
        date: date,
      };

      updateDoc(transactionRef, updatedData).catch((error) => {
        console.error('Delayed Update Error:', error);
      });

      onClose();
      setTimeout(() => {
        showAlert(
          'Transaction Updated',
          'Your transaction has been updated successfully.',
          'success'
        );
      }, 300);
    } catch (error) {
      console.error('Error updating transaction:', error);
      showAlert('Error', 'Could not update transaction. Please try again.', 'alert');
    } finally {
      setIsSaving(false);
    }
  };

  const renderInlineCalendar = () => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Day of the week of the 1st day of the month (0 = Monday, 6 = Sunday)
    let firstDayIndex = new Date(year, month, 1).getDay();
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const days = [];
    // Empty slots for previous month padding
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = date.getDate() === d && date.getMonth() === month && date.getFullYear() === year;
      const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
      
      days.push(
        <TouchableOpacity
          key={`day-${d}`}
          style={[
            styles.calendarDayButton,
            isSelected && styles.calendarDaySelected
          ]}
          onPress={() => {
            const newDate = new Date(date);
            newDate.setFullYear(year);
            newDate.setMonth(month);
            newDate.setDate(d);
            setDate(newDate);
            setShowCalendar(false);
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

    // Padding for next month to keep grid consistent
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
        setCalendarCursor(new Date(year, month - 1, 1));
      }
    };

    const nextMonth = () => {
      if (canNext) {
        setCalendarCursor(new Date(year, month + 1, 1));
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
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.fullScreenContainer}>
        <View style={styles.overlay} onLayout={() => setLayoutReady(true)}>
          <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.80)' }]} />
          </Pressable>

          {layoutReady && (
            <KeyboardAvoidingView
              behavior="padding"
              style={styles.keyboardAvoidingView}
            >
              <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Pressable
                  style={styles.dismissArea}
                  onPress={isKeyboardVisible ? Keyboard.dismiss : onClose}
                >
                  <View style={styles.modalPositioner}>
                    {mode === 'menu' ? (
                      <Animated.View
                        entering={animateMenu ? ZoomIn.duration(100) : undefined}
                        key="menu-card"
                        style={styles.menuContainer}
                      >
                        <Pressable style={{ width: '100%' }} onPress={Keyboard.dismiss}>
                          <View style={styles.menuContent}>
                            <Text style={styles.menuTitle}>Transaction Options</Text>

                            <View
                              style={[
                                styles.txSummary,
                                {
                                  borderColor:
                                    transaction.type === 'income'
                                      ? 'rgba(16, 185, 129, 0.25)'
                                      : 'rgba(235, 86, 86, 0.25)',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.txAmount,
                                  { color: transaction.type === 'income' ? '#10b981' : '#eb5656' },
                                ]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                              >
                                {displayAmount}
                              </Text>

                              <Text style={styles.txTitle} numberOfLines={2}>
                                {transaction.title}
                              </Text>
                            </View>

                            <View style={styles.buttonCol}>
                              <TouchableOpacity
                                style={styles.menuButton}
                                onPress={() => {
                                  setAnimateMenu(false);
                                  setMode('edit');
                                  onEdit?.();
                                }}
                                activeOpacity={0.8}
                              >
                                <LinearGradient
                                  colors={['#3b82f6', '#2563eb']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.gradient}
                                >
                                  <View style={styles.buttonInner}>
                                    <Pencil
                                      color="#FFFFFF"
                                      size={moderateScale(18)}
                                      strokeWidth={2.5}
                                      style={{ transform: [{ translateY: 1 }] }}
                                    />
                                    <Text style={styles.buttonText}>Edit Transaction</Text>
                                  </View>
                                </LinearGradient>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.menuButton, styles.deleteButton]}
                                onPress={onDelete}
                                activeOpacity={0.8}
                              >
                                <LinearGradient
                                  colors={['#ef4444', '#dc2626']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.gradient}
                                >
                                  <View style={styles.buttonInner}>
                                    <Trash2
                                      color="#FFFFFF"
                                      size={moderateScale(18)}
                                      strokeWidth={2.5}
                                      style={{ transform: [{ translateY: 0.5 }] }}
                                    />
                                    <Text style={styles.buttonText}>Delete Transaction</Text>
                                  </View>
                                </LinearGradient>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={onClose}
                                activeOpacity={0.8}
                              >
                                <X
                                  color="rgba(255,255,255,0.6)"
                                  size={moderateScale(18)}
                                  strokeWidth={2.5}
                                  style={{ transform: [{ translateY: 1.2 }] }}
                                />
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </Pressable>
                      </Animated.View>
                    ) : (
                      <View
                        key="edit-card"
                        style={styles.menuContainer}
                      >
                        <Pressable style={{ width: '100%' }} onPress={Keyboard.dismiss}>
                          <View style={styles.editContent}>
                            {/* Header */}
                            <View style={styles.editHeader}>
                              <Text style={styles.editTitle}>EDIT TRANSACTION</Text>
                              <TouchableOpacity onPress={() => setMode('menu')}>
                                <X color="rgba(255,255,255,0.4)" size={24} />
                              </TouchableOpacity>
                            </View>

                            {/* Type Selector */}
                            <View style={styles.typeSelectorRow}>
                              <TouchableOpacity
                                style={[
                                  styles.typeButton,
                                  transactionType === 'income' && styles.typeButtonIncomeActive,
                                ]}
                                onPress={() => setTransactionType('income')}
                              >
                                <Text
                                  style={[
                                    styles.typeButtonText,
                                    transactionType === 'income' && styles.typeButtonTextActive,
                                  ]}
                                >
                                  INCOME
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.typeButton,
                                  transactionType === 'expense' && styles.typeButtonExpenseActive,
                                ]}
                                onPress={() => setTransactionType('expense')}
                              >
                                <Text
                                  style={[
                                    styles.typeButtonText,
                                    transactionType === 'expense' && styles.typeButtonTextActive,
                                  ]}
                                >
                                  EXPENSE
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {/* Date Selector */}
                            <TouchableOpacity
                              style={styles.dateSelectorBtn}
                              onPress={() => {
                                Keyboard.dismiss();
                                setShowCalendar(!showCalendar);
                              }}
                              activeOpacity={0.8}
                            >
                              <Calendar color="#3b82f6" size={14} strokeWidth={2.5} />
                              <Text style={styles.dateSelectorText}>
                                {date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </Text>
                            </TouchableOpacity>

                            {/* Calendar Inline */}
                            {showCalendar && renderInlineCalendar()}

                            {!showCalendar && (
                              <>
                                {/* Amount Input */}
                                <View style={styles.inputSection}>
                                  <Text style={styles.inputLabel}>AMOUNT</Text>
                                  <TextInput
                                    style={styles.textInput}
                                    placeholder="0.00"
                                    placeholderTextColor="rgba(255,255,255,0.1)"
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                    maxLength={12}
                                  />
                                </View>

                                {/* Title Input */}
                                <View style={styles.inputSection}>
                                  <Text style={styles.inputLabel}>TITLE</Text>
                                  <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Rent, Groceries"
                                    placeholderTextColor="rgba(255,255,255,0.1)"
                                    value={title}
                                    onChangeText={setTitle}
                                    maxLength={30}
                                  />
                                </View>

                                {/* Notes Input */}
                                <View style={styles.inputSection}>
                                  <Text style={styles.inputLabel}>NOTES / DETAILS</Text>
                                  <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    placeholder="e.g. Shop branch, extra details..."
                                    placeholderTextColor="rgba(255,255,255,0.1)"
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    numberOfLines={3}
                                    maxLength={100}
                                  />
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.actionButtonsRow}>
                                  <TouchableOpacity
                                    style={styles.cancelFormButton}
                                    onPress={() => setMode('menu')}
                                    disabled={isSaving}
                                  >
                                    <Text style={styles.cancelFormButtonText}>Cancel</Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={handleSaveEdit}
                                    disabled={isSaving}
                                  >
                                    <LinearGradient
                                      colors={['#3b82f6', '#1d4ed8']}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 1 }}
                                      style={styles.gradient}
                                    >
                                      {isSaving ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                      ) : (
                                        <Text style={styles.saveButtonText}>Save changes</Text>
                                      )}
                                    </LinearGradient>
                                  </TouchableOpacity>
                                </View>
                              </>
                            )}
                          </View>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    elevation: 999999,
  },
  overlay: {
    width: width,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardAvoidingView: {
    width: '100%',
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: horizontalScale(24),
  },
  dismissArea: {
    width: '100%',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(24),
  },
  modalPositioner: {
    width: '100%',
    alignItems: 'center',
    marginVertical: horizontalScale(20),
  },
  menuContainer: {
    width: width * 0.85,
    backgroundColor: '#1C1D21',
    borderRadius: moderateScale(28),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  menuContent: {
    padding: horizontalScale(24),
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: moderateScale(13),
    color: '#3b82f6',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: horizontalScale(16),
  },
  txSummary: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: moderateScale(16),
    paddingHorizontal: horizontalScale(16),
    paddingVertical: horizontalScale(18),
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: horizontalScale(24),
    gap: horizontalScale(4),
  },
  txAmount: {
    fontSize: moderateScale(30),
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  txTitle: {
    fontSize: moderateScale(17),
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  buttonCol: {
    width: '100%',
    gap: horizontalScale(12),
  },
  menuButton: {
    width: '100%',
    height: horizontalScale(48),
    borderRadius: moderateScale(24),
    overflow: 'hidden',
  },
  deleteButton: {
    shadowColor: '#ef4444',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: horizontalScale(8),
  },
  buttonText: {
    fontSize: moderateScale(15),
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cancelButton: {
    width: '100%',
    height: horizontalScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: horizontalScale(4),
  },
  cancelButtonText: {
    fontSize: moderateScale(15),
    fontFamily: 'Manrope_700Bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },

  /* Edit View Styles */
  editContent: {
    padding: horizontalScale(20),
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: horizontalScale(20),
  },
  editTitle: {
    fontSize: moderateScale(13),
    color: '#3b82f6',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: horizontalScale(12),
    marginBottom: horizontalScale(20),
  },
  typeButton: {
    flex: 1,
    height: horizontalScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeButtonIncomeActive: {
    backgroundColor: '#338167ff',
    borderColor: '#10b981',
  },
  typeButtonExpenseActive: {
    backgroundColor: '#9c3c3c',
    borderColor: '#eb5656',
  },
  typeButtonText: {
    fontSize: moderateScale(13),
    fontFamily: 'Manrope_700Bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  inputSection: {
    marginBottom: horizontalScale(16),
  },
  inputLabel: {
    fontSize: moderateScale(10),
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    marginBottom: horizontalScale(8),
    marginLeft: horizontalScale(4),
  },
  textInput: {
    backgroundColor: '#151618',
    borderRadius: moderateScale(20),
    paddingHorizontal: horizontalScale(20),
    paddingVertical: horizontalScale(10),
    color: '#FFFFFF',
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(14),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  textArea: {
    minHeight: horizontalScale(80),
    textAlignVertical: 'top',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: horizontalScale(12),
    marginTop: horizontalScale(8),
  },
  cancelFormButton: {
    flex: 1,
    height: horizontalScale(50),
    borderRadius: moderateScale(25),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelFormButtonText: {
    fontSize: moderateScale(14),
    fontFamily: 'Manrope_700Bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  saveButton: {
    flex: 1,
    height: horizontalScale(50),
    borderRadius: moderateScale(25),
    overflow: 'hidden',
  },
  saveButtonText: {
    fontSize: moderateScale(14),
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: moderateScale(15),
    paddingHorizontal: horizontalScale(16),
    paddingVertical: horizontalScale(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: horizontalScale(8),
    alignSelf: 'center',
    marginBottom: horizontalScale(16),
  },
  dateSelectorText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(12),
  },
  inlineCalendarContainer: {
    backgroundColor: '#151618',
    borderRadius: moderateScale(20),
    padding: horizontalScale(12),
    marginBottom: horizontalScale(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: horizontalScale(12),
  },
  calendarNavBtn: {
    width: horizontalScale(32),
    height: horizontalScale(32),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  calendarMonthText: {
    color: '#fff',
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(14),
  },
  calendarWeekLabels: {
    flexDirection: 'row',
    marginBottom: horizontalScale(8),
  },
  calendarWeekLabelText: {
    color: 'rgba(255,255,255,0.3)',
    width: '14.28%',
    textAlign: 'center',
    fontSize: moderateScale(11),
    fontFamily: 'Inter_700Bold',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayButton: {
    width: '14.28%',
    height: horizontalScale(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
  },
  calendarDayEmpty: {
    width: '14.28%',
    height: horizontalScale(36),
  },
  calendarDaySelected: {
    backgroundColor: '#3b82f6',
    borderRadius: moderateScale(18),
  },
  calendarDayText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_500Medium',
    fontSize: moderateScale(13),
  },
  calendarDaySelectedText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  calendarDayTodayText: {
    color: '#67E8F9',
    fontFamily: 'Inter_700Bold',
  },
});

