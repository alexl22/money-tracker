import { LinearGradient } from "expo-linear-gradient";
import { Check, Delete, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { horizontalScale, moderateScale } from '../utils/scaling';
interface TargetInputModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (amount: number) => void;
  onReset?: () => void;
  initialAmount?: number;
}

export function TargetInputModal({
  isVisible,
  onClose,
  onSave,
  onReset,
  initialAmount
}: TargetInputModalProps) {
  const [amount, setAmount] = useState('0');
  const { getSymbol } = useCurrency();
  useEffect(() => {
    if (isVisible) {
      setAmount(initialAmount ? initialAmount.toString() : '0');
    }
  }, [isVisible, initialAmount]);

  const handleKeyPress = (val: string) => {
    if (val === '.') {
      if (amount.includes('.')) return;
      setAmount(amount + '.');
    } else if (val === 'delete') {
      if (amount.length <= 1) {
        setAmount('0');
      } else {
        setAmount(amount.slice(0, -1));
      }
    } else {
      if (amount === '0') {
        setAmount(val);
      } else {
        setAmount(amount + val);
      }
    }
  };

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      onSave(numAmount);
      onClose();
    }
  };

  const renderKeypadButton = (val: string, icon?: any) => (
    <TouchableOpacity
      key={val}
      style={styles.keypadButton}
      onPress={() => handleKeyPress(val)}
    >
      {icon ? icon : <Text style={styles.keypadButtonText}>{val}</Text>}
    </TouchableOpacity>
  );

  return (
    <Modal visible={isVisible} transparent onRequestClose={onClose} statusBarTranslucent={true}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 15 }}>
              <Text style={styles.title}>SET GOAL TARGET</Text>
              <Text style={styles.subtitle} numberOfLines={2}>How much do you want to save?</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="rgba(255,255,255,0.4)" size={20} style={{ marginTop: 1 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.amountDisplay}>
            <View style={styles.amountRow}>
              <Text style={[styles.currencySymbol, getSymbol().length > 1 && { fontSize: moderateScale(22) }]}>{getSymbol()}</Text>
              <Text
                style={styles.amountText}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.5}
              >
                {Number(amount).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2
                })}
              </Text>
            </View>
          </View>

          <View style={styles.dividerContainer}>
            <LinearGradient
              colors={['transparent', '#3b82f6', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fadedLine}
            />
          </View>

          <View style={styles.keypadGrid}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'].map((key) =>
              renderKeypadButton(key, key === 'delete' ? <Delete color="rgba(255,255,255,0.8)" size={moderateScale(28)} /> : undefined)
            )}
          </View>

          <TouchableOpacity
            style={[styles.btnBase, amount === '0' ? styles.resetBtn : styles.confirmBtn]}
            onPress={amount === '0' ? () => { onReset?.(); onClose(); } : handleSave}
          >
            <Text style={styles.saveBtnText}>
              {amount === '0' ? 'RESET GOAL' : 'Confirm Target'}
            </Text>
            {amount === '0' ? <Delete color="#fff" size={moderateScale(20)} /> : <Check color="#fff" size={moderateScale(20)} />}
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: horizontalScale(24),
  },
  modalContent: {
    backgroundColor: '#1C1D21',
    borderRadius: moderateScale(36),
    padding: horizontalScale(24),
    paddingBottom: horizontalScale(32),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: horizontalScale(32),
  },
  title: {
    fontSize: moderateScale(10),
    color: '#3b82f6',
    letterSpacing: 2,
    fontFamily: 'Inter_700Bold',
    marginBottom: horizontalScale(4),
  },
  subtitle: {
    fontSize: moderateScale(18),
    color: '#fff',
    fontFamily: 'Manrope_700Bold',
  },
  closeBtn: {
    width: horizontalScale(36),
    height: horizontalScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountDisplay: {
    marginBottom: horizontalScale(8),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: horizontalScale(10),
  },
  currencySymbol: {
    fontSize: moderateScale(30),
    color: '#3b82f6',
    fontFamily: 'Manrope_700Bold',
    marginRight: horizontalScale(8),
  },
  amountText: {
    fontSize: moderateScale(45),
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -1,
  },
  dividerContainer: {
    height: horizontalScale(3),
    width: '100%',
    marginVertical: horizontalScale(20),
    justifyContent: 'center',
  },
  fadedLine: {
    height: horizontalScale(3),
    width: '100%',
    borderRadius: moderateScale(1),
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: horizontalScale(20),
  },
  keypadButton: {
    width: '30%',
    height: horizontalScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#26282E',
    borderRadius: moderateScale(25),
    marginBottom: horizontalScale(10),
  },
  keypadButtonText: {
    fontSize: moderateScale(24),
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  btnBase: {
    height: horizontalScale(58),
    borderRadius: moderateScale(29),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: horizontalScale(12),
  },
  confirmBtn: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: horizontalScale(4) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(8),
    elevation: 4,
    borderWidth: 0,
  },
  resetBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontSize: moderateScale(18),
    color: '#fff',
    fontFamily: 'Manrope_700Bold',
  }
});
