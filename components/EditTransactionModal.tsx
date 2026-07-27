import { doc, updateDoc } from '@react-native-firebase/firestore';
import { BlurView } from 'expo-blur';
import * as NavigationBar from 'expo-navigation-bar';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AlignLeft, DollarSign, Type, Wallet, X } from 'lucide-react-native';
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
import { useAlert } from '../context/AlertContext';
import { useCurrency } from '../context/CurrencyContext';
import { db } from '../firebaseConfig';
import { horizontalScale, moderateScale } from '../utils/scaling';

const { width, height: screenHeight } = Dimensions.get('screen');

interface EditTransactionModalProps {
  isVisible: boolean;
  onClose: () => void;
  transaction: any;
}

export default function EditTransactionModal({
  isVisible,
  onClose,
  transaction,
}: EditTransactionModalProps) {
  const { currency, convertToBase, format } = useCurrency();
  const { showAlert } = useAlert();

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [isSaving, setIsSaving] = useState(false);

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      if (isVisible) {
        NavigationBar.setBackgroundColorAsync('rgba(0, 0, 0, 0.85)');
      } else {
        NavigationBar.setBackgroundColorAsync('rgba(0,0,0,0)');
      }
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && transaction) {
      // Pre-populate fields
      setAmount(transaction.rawAmount.toString());
      setTitle(transaction.title);
      setNotes(transaction.notes || '');
      setTransactionType(transaction.type);
    }
  }, [isVisible, transaction]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (!isVisible || !transaction) return null;

  const handleSave = async () => {
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
      };

      await updateDoc(transactionRef, updatedData);

      onClose();
      setTimeout(() => {
        showAlert(
          'Transaction Updated',
          `Your transaction has been updated successfully.`,
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
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
            <BlurView
              intensity={25}
              tint="dark"
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod="dimezisBlurView"
            />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable style={styles.dismissArea} onPress={isKeyboardVisible ? Keyboard.dismiss : onClose}>
              <View style={styles.modalPositioner}>
                <Pressable style={styles.modalContent} onPress={Keyboard.dismiss}>
                  
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>EDIT TRANSACTION</Text>
                    <TouchableOpacity onPress={onClose}>
                      <X color="rgba(255,255,255,0.4)" size={24} />
                    </TouchableOpacity>
                  </View>

                  {/* Type Selector (Income / Expense) */}
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

                  {/* Amount Input */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputLabelHeader}>
                      <DollarSign color="rgba(255,255,255,0.4)" size={14} />
                      <Text style={styles.inputLabel}>AMOUNT</Text>
                    </View>
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
                    <View style={styles.inputLabelHeader}>
                      <Type color="rgba(255,255,255,0.4)" size={14} />
                      <Text style={styles.inputLabel}>TITLE</Text>
                    </View>
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
                    <View style={styles.inputLabelHeader}>
                      <AlignLeft color="rgba(255,255,255,0.4)" size={14} />
                      <Text style={styles.inputLabel}>NOTES / DETAILS</Text>
                    </View>
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
                      onPress={onClose}
                      disabled={isSaving}
                    >
                      <Text style={styles.cancelFormButtonText}>CANCEL</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleSave}
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
                          <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                </Pressable>
              </View>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  dismissArea: {
    flex: 1,
    paddingHorizontal: horizontalScale(24),
    justifyContent: 'center',
  },
  modalPositioner: {
    width: '100%',
    marginVertical: horizontalScale(20),
  },
  modalContent: {
    backgroundColor: '#1C1D21',
    borderRadius: moderateScale(32),
    paddingHorizontal: horizontalScale(20),
    paddingTop: horizontalScale(24),
    paddingBottom: horizontalScale(24),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: horizontalScale(20),
  },
  modalTitle: {
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
  inputLabelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: horizontalScale(8),
    marginBottom: horizontalScale(10),
    marginLeft: horizontalScale(4),
  },
  inputLabel: {
    fontSize: moderateScale(10),
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
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
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: moderateScale(14),
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
