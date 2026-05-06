import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";
import { Check, Delete, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
      setAmount(initialAmount ? Math.floor(initialAmount).toString() : '0');
    }
  }, [isVisible, initialAmount]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      if (isVisible) {
        NavigationBar.setBackgroundColorAsync('rgba(0, 0, 0, 0.85)');
      } else {
        NavigationBar.setBackgroundColorAsync('rgba(0,0,0,0)');
      }
    }
  }, [isVisible]);

  const handleKeyPress = (val: string) => {
    if (val === ".") return;

    let newAmount = amount;

    if (val === "delete") {
      if (newAmount.length <= 1) {
        newAmount = "0";
      } else {
        newAmount = newAmount.slice(0, -1);
      }
    } else {
      if (newAmount === "0") {
        newAmount = val;
      } else if (newAmount.length < 8) {
        newAmount += val;
      }
    }

    setAmount(newAmount);
  };
  const handleSave = () => {
    const numAmount = Math.round(parseFloat(amount));
    if (!isNaN(numAmount) && numAmount > 0) {
      onSave(numAmount);
      resetModal();
    }
  };

  const renderKeypadButton = (val: string, icon?: any) => (
    <TouchableOpacity
      key={val}
      style={[styles.keypadButton, val === "." && { opacity: 0.3 }]}
      onPress={() => handleKeyPress(val)}
      disabled={val === "."}
    >
      {icon ? icon : <Text style={[styles.keypadButtonText, val === "." && { color: 'rgba(255,255,255,0.3)' }]}>{val}</Text>}
    </TouchableOpacity>
  );

  const resetModal = () => {
    onClose();
    setTimeout(() => {
      setAmount("0");
    }, 250);
  };

  if (!isVisible) return null;

  const displayInteger = amount.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <Modal visible={isVisible} transparent onRequestClose={resetModal} statusBarTranslucent={true}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.dismissArea} onPress={resetModal}>
          <View style={styles.modalPositioner}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.header}>
                <View style={{ flex: 1, marginRight: 15 }}>
                  <Text style={styles.title}>SET GOAL TARGET</Text>
                  <Text style={styles.subtitle} numberOfLines={2}>How much do you want to save?</Text>
                </View>
                <TouchableOpacity onPress={resetModal} style={styles.closeBtn}>
                  <X color="rgba(255,255,255,0.4)" size={20} style={{ marginTop: 1 }} />
                </TouchableOpacity>
              </View>

              <View style={styles.amountDisplay}>
                <View style={styles.amountRow}>
                  <Text style={[styles.currencySymbol, getSymbol().length > 1 && { fontSize: moderateScale(22) }]}>{getSymbol()}</Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.4}
                    style={styles.unifiedAmountText}
                  >
                    {displayInteger}
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
                onPress={amount === '0' ? () => { onReset?.(); resetModal(); } : handleSave}
              >
                <Text style={styles.saveBtnText}>
                  {amount === '0' ? 'DELETE GOAL' : 'Confirm Target'}
                </Text>
                {amount === '0' ? <Delete color="#fff" size={moderateScale(20)} /> : <Check color="#fff" size={moderateScale(20)} />}
              </TouchableOpacity>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  dismissArea: {
    flex: 1,
    paddingHorizontal: horizontalScale(24),
  },
  modalPositioner: {
    marginTop: "40%",
    marginBottom: horizontalScale(20),
  },
  modalContent: {
    backgroundColor: '#1C1D21',
    borderRadius: moderateScale(36),
    padding: horizontalScale(24),
    paddingBottom: horizontalScale(20),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: horizontalScale(10),
  },
  title: {
    fontSize: moderateScale(10),
    color: '#3b82f6',
    letterSpacing: 2,
    fontFamily: 'Inter_700Bold',
    marginBottom: horizontalScale(1),
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
    marginBottom: horizontalScale(0),
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
    fontSize: moderateScale(23),
    color: '#3b82f6',
    fontFamily: 'Manrope_700Bold',
    marginRight: horizontalScale(8),
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
  },
  unifiedAmountText: {
    fontSize: moderateScale(43),
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -1,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  activeAmountPart: {
    color: '#FFFFFF',
  },
  inactiveAmountPart: {
    color: 'rgba(255,255,255,0.4)',
  },
});
