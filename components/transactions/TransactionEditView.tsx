import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, X } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/transactionOptions.styles';
import { InlineMonthCalendar } from '../calForTransactionOption/InlineMonthCalendar';

interface TransactionEditViewProps {
  transactionType: 'income' | 'expense';
  onChangeTransactionType: (type: 'income' | 'expense') => void;
  date: Date;
  onChangeDate: (date: Date) => void;
  calendarCursor: Date;
  onChangeCalendarCursor: (date: Date) => void;
  showCalendar: boolean;
  onToggleCalendar: () => void;
  amount: string;
  onChangeAmount: (amount: string) => void;
  title: string;
  onChangeTitle: (title: string) => void;
  notes: string;
  onChangeNotes: (notes: string) => void;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function TransactionEditView({
  transactionType,
  onChangeTransactionType,
  date,
  onChangeDate,
  calendarCursor,
  onChangeCalendarCursor,
  showCalendar,
  onToggleCalendar,
  amount,
  onChangeAmount,
  title,
  onChangeTitle,
  notes,
  onChangeNotes,
  isSaving,
  onCancel,
  onSave,
}: TransactionEditViewProps) {
  return (
    <View key="edit-card" style={styles.menuContainer}>
      <Pressable style={{ width: '100%' }} onPress={Keyboard.dismiss}>
        <View style={styles.editContent}>
          {/* Header */}
          <View style={styles.editHeader}>
            <Text style={styles.editTitle}>EDIT TRANSACTION</Text>
            <TouchableOpacity onPress={onCancel}>
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
              onPress={() => onChangeTransactionType('income')}
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
              onPress={() => onChangeTransactionType('expense')}
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
              onToggleCalendar();
            }}
            activeOpacity={0.8}
          >
            <Calendar color="#3b82f6" size={14} strokeWidth={2.5} />
            <Text style={styles.dateSelectorText}>
              {date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </TouchableOpacity>

          {/* Calendar Inline */}
          {showCalendar && (
            <InlineMonthCalendar
              cursorDate={calendarCursor}
              onChangeCursor={onChangeCalendarCursor}
              selectedDate={date}
              onSelectDate={(newDate) => {
                onChangeDate(newDate);
                onToggleCalendar();
              }}
            />
          )}

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
                  onChangeText={onChangeAmount}
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
                  onChangeText={onChangeTitle}
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
                  onChangeText={onChangeNotes}
                  multiline
                  numberOfLines={3}
                  maxLength={100}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelFormButton}
                  onPress={onCancel}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelFormButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={onSave}
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
  );
}
