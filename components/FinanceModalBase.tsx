import { LinearGradient } from "expo-linear-gradient";
import { Delete, Pencil, X } from "lucide-react-native";
import React, { ReactNode, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCurrency } from "../context/CurrencyContext";
import { horizontalScale, moderateScale } from "../utils/scaling";

interface FinanceModalBaseProps {
  isVisible: boolean;
  onClose: () => void;
  titleStep1: string;
  titleStep2: string;
  renderStep2: (amount: string, resetModal: () => void) => ReactNode;
}

export function FinanceModalBase({
  isVisible,
  onClose,
  titleStep1,
  titleStep2,
  renderStep2
}: FinanceModalBaseProps) {
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState('0');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const { currency, getSymbol } = useCurrency();

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleKeyPress = (val: string) => {
    const digitCount = amount.replace('.', '').length;

    if (val === '.') {
      if (amount.includes('.')) return;
      if (digitCount >= 10) return;
      setAmount(amount + '.');
    } else if (val === 'delete') {
      if (amount.length <= 1) {
        setAmount('0');
      } else {
        setAmount(amount.slice(0, -1));
      }
    } else {
      if (digitCount >= 10) return;
      if (amount === '0') {
        setAmount(val);
      } else {
        setAmount(amount + val);
      }
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

  const resetModal = () => {
    onClose();
    setTimeout(() => {
      setModalStep(1);
      setAmount('0');
    }, 300);
  };

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      onRequestClose={resetModal}
      statusBarTranslucent={true}

    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              style={[
                styles.contentWrapper,
                isKeyboardVisible && { justifyContent: 'center', paddingBottom: horizontalScale(500) }
              ]}
              onPress={isKeyboardVisible ? Keyboard.dismiss : resetModal}
            >
              <Pressable
                style={styles.modalContent}
                onPress={Keyboard.dismiss}
              >
                {modalStep === 1 ? (
                  <View style={styles.step1Container}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{titleStep1}</Text>
                      <TouchableOpacity onPress={resetModal}>
                        <X color="rgba(255,255,255,0.4)" size={24} />
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
                          {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      style={styles.primaryButton}
                      onPress={() => setModalStep(2)}
                    >
                      <Text style={styles.primaryButtonText}>CONTINUE</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.step2Container}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{titleStep2}</Text>
                      <TouchableOpacity onPress={resetModal}>
                        <X color="rgba(255,255,255,0.4)" size={24} />
                      </TouchableOpacity>
                    </View>

                    <View style={{ paddingBottom: horizontalScale(15) }}>
                      <View style={styles.pillContainer}>
                        <TouchableOpacity
                          style={styles.amountPill}
                          onPress={() => setModalStep(1)}
                        >
                          <Text style={styles.amountPillText} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.4}>
                            {getSymbol()} {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          <View style={styles.pillDivider} />
                          <Pencil color="#3b82f6" size={moderateScale(25)} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>

                      {renderStep2(amount, resetModal)}
                    </View>
                  </View>
                )}
              </Pressable>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: horizontalScale(24),
  },
  modalContent: {
    backgroundColor: '#1C1D21',
    borderRadius: moderateScale(32),
    paddingHorizontal: horizontalScale(20),
    paddingTop: horizontalScale(24),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    marginBottom: horizontalScale(15),
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
    marginBottom: horizontalScale(5),
  },
  keypadButton: {
    width: '31%',
    height: horizontalScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#26282E',
    borderRadius: moderateScale(50),
    marginBottom: horizontalScale(10),
  },
  keypadButtonText: {
    fontSize: moderateScale(24),
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  pillContainer: {
    alignItems: 'center',
    marginBottom: horizontalScale(20),
  },
  amountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26282E',
    paddingHorizontal: horizontalScale(16),
    paddingVertical: horizontalScale(10),
    borderRadius: moderateScale(20),
    gap: horizontalScale(6),
    maxWidth: '100%',
  },
  amountPillText: {
    fontSize: moderateScale(30),
    fontFamily: 'Manrope_700Bold',
    color: '#34d399',
    flexShrink: 1,
  },
  pillDivider: {
    width: 1,
    height: horizontalScale(14),
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    height: horizontalScale(58),
    borderRadius: moderateScale(29),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: horizontalScale(10),
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: horizontalScale(4) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  primaryButtonText: {
    fontSize: moderateScale(16),
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: horizontalScale(20),
    marginBottom: horizontalScale(15),
  },
  typeButtonContainer: {
    alignItems: 'center',
    gap: horizontalScale(14),
  },
  typeBox: {
    width: horizontalScale(120),
    height: horizontalScale(120),
    backgroundColor: '#26282E',
    borderRadius: moderateScale(45),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  typeCircle: {
    width: horizontalScale(80),
    height: horizontalScale(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  typeCircleActive: {
    opacity: 1,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(15),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  typeLabel: {
    fontSize: moderateScale(14),
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
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
    minHeight: horizontalScale(60),
    textAlignVertical: 'top',

  },
  step1Container: {
    paddingBottom: horizontalScale(30),
  },
  step2Container: {
    paddingBottom: horizontalScale(12),
  }
});
