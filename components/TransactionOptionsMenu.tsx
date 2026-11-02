import { doc, updateDoc } from '@react-native-firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import { Pencil, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useAlert } from '../context/AlertContext';
import { useCurrency } from '../context/CurrencyContext';
import { db } from '../firebaseConfig';
import { styles } from '../styles/transactionOptions.styles';
import { moderateScale } from '../utils/scaling';
import { onTransactionUpdated } from '../utils/statsManager';
import { TransactionEditView } from './transactions/TransactionEditView';

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
      const txYear = date.getFullYear();
      const txMonth = String(date.getMonth() + 1).padStart(2, '0');
      const txDay = String(date.getDate()).padStart(2, '0');
      const dateString = `${txYear}-${txMonth}-${txDay}`;
      const parsedAmount = parseFloat(amount);
      const updatedData = {
        amount: parsedAmount,
        amountUSD: convertToBase(parsedAmount),
        type: transactionType,
        title: title.trim(),
        notes: notes.trim(),
        date: date,
        dateString: dateString,
      };

      updateDoc(transactionRef, updatedData).catch((error) => {
        console.error('Delayed Update Error:', error);
      });

      const newTx = {
        ...transaction,
        ...updatedData,
      };
      onTransactionUpdated(transaction, newTx);

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
                      <TransactionEditView
                        transactionType={transactionType}
                        onChangeTransactionType={setTransactionType}
                        date={date}
                        onChangeDate={setDate}
                        calendarCursor={calendarCursor}
                        onChangeCalendarCursor={setCalendarCursor}
                        showCalendar={showCalendar}
                        onToggleCalendar={() => setShowCalendar(!showCalendar)}
                        amount={amount}
                        onChangeAmount={setAmount}
                        title={title}
                        onChangeTitle={setTitle}
                        notes={notes}
                        onChangeNotes={setNotes}
                        isSaving={isSaving}
                        onCancel={() => setMode('menu')}
                        onSave={handleSaveEdit}
                      />
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


