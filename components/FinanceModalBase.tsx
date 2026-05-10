import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";
import { Delete, Pencil, X } from "lucide-react-native";
import React, { ReactNode, useEffect, useState } from "react";
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
  View
} from "react-native";
import { useCurrency } from "../context/CurrencyContext";
import { horizontalScale, moderateScale } from "../utils/scaling";
import CustomAlert from "./CustomAlert";

interface FinanceModalBaseProps {
  isVisible: boolean;
  onClose: () => void;
  titleStep1: string;
  titleStep2: string;
  renderStep2: (amount: string, resetModal: () => void) => ReactNode;
  marginTopStep2?: any;
}

export function FinanceModalBase({
  isVisible,
  onClose,
  titleStep1,
  titleStep2,
  renderStep2,
  marginTopStep2
}: FinanceModalBaseProps) {
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("0");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isEditingDecimals, setIsEditingDecimals] = useState(false);

  const { getSymbol } = useCurrency();

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

  const handleKeyPress = (val: string) => {
    const parts = amount.split(".");
    let integerPart = parts[0] || "0";
    let decimalPart = parts[1] || "";

    if (val === ".") {
      setIsEditingDecimals(!isEditingDecimals);
      return;
    }

    if (val === "delete") {
      if (isEditingDecimals) {
        if (decimalPart.length > 0) {
          decimalPart = decimalPart.slice(0, -1);
        } else {
          setIsEditingDecimals(false);
        }
      } else {
        if (integerPart === "0") {
          decimalPart = "";
        } else if (integerPart.length <= 1) {
          integerPart = "0";
        } else {
          integerPart = integerPart.slice(0, -1);
        }
      }
    } else {
      if (isEditingDecimals) {
        if (decimalPart.length < 2) {
          decimalPart += val;
        }
      } else {
        if (integerPart === "0") {
          integerPart = val;
        } else if (integerPart.length < 8) {
          integerPart += val;
        }
      }
    }

    setAmount(decimalPart.length > 0 || isEditingDecimals ? `${integerPart}.${decimalPart}` : integerPart);
  };

  const renderKeypadButton = (val: string, icon?: any) => (
    <TouchableOpacity
      key={val}
      style={styles.keypadButton}
      onPress={() => handleKeyPress(val)}
    >
      {icon ? icon : (
        <Text style={[styles.keypadButtonText]}>
          {val}
        </Text>
      )}
    </TouchableOpacity>
  );

  const resetModal = () => {
    onClose();
    setTimeout(() => {
      setModalStep(1);
      setAmount("0");
      setIsEditingDecimals(false);
    }, 250);
  };

  if (!isVisible) return null;

  const displayParts = amount.split(".");
  const displayIntegerRaw = displayParts[0] || "0";
  const displayInteger = displayIntegerRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const displayDecimal = (displayParts[1] || "").padEnd(2, "0");

  return (
    <Modal
      transparent
      visible={isVisible}
      statusBarTranslucent={true}
      onRequestClose={resetModal}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              style={styles.dismissArea}
              onPress={isKeyboardVisible ? Keyboard.dismiss : resetModal}
            >
              <View style={[
                styles.modalPositioner,
                modalStep === 2 && styles.modalPositionerStep2,
                (modalStep === 2 && marginTopStep2) ? { marginTop: marginTopStep2 as any } : null
              ]}>
                <Pressable style={styles.modalContent} onPress={Keyboard.dismiss}>
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
                          <Text style={styles.currencySymbol}>{getSymbol()}</Text>
                          <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit={true}
                            minimumFontScale={0.4}
                            style={styles.unifiedAmountText}
                          >
                            <Text
                              onPress={() => setIsEditingDecimals(false)}
                              style={!isEditingDecimals ? styles.activeAmountPart : styles.inactiveAmountPart}
                            >
                              {displayInteger}
                            </Text>
                            <Text style={styles.inactiveAmountPart}>.</Text>
                            <Text
                              onPress={() => setIsEditingDecimals(true)}
                              style={isEditingDecimals ? styles.activeAmountPart : styles.inactiveAmountPart}
                            >
                              {displayDecimal}
                            </Text>
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dividerContainer}>
                        <LinearGradient
                          colors={["transparent", "#3b82f6", "transparent"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.fadedLine}
                        />
                      </View>

                      <View style={styles.keypadGrid}>
                        {[
                          "1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"
                        ].map((key) =>
                          renderKeypadButton(
                            key,
                            key === "delete" ? (
                              <Delete
                                color="rgba(255,255,255,0.8)"
                                size={moderateScale(28)}
                              />
                            ) : undefined
                          )
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

                      <View style={styles.pillContainer}>
                        <TouchableOpacity
                          style={styles.amountPill}
                          onPress={() => setModalStep(1)}

                        >
                          <Text style={styles.amountPillText}
                            numberOfLines={1}
                            adjustsFontSizeToFit={true}
                          >
                            {getSymbol()}{" "}
                            {(() => {
                              const p = amount.split(".");
                              const integerPart = (p[0] || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                              return `${integerPart}.${(p[1] || "").padEnd(2, "0")}`;
                            })()}
                          </Text>
                          <View style={styles.pillDivider} />
                          <Pencil color="#3b82f6" size={24} />
                        </TouchableOpacity>
                      </View>

                      {renderStep2(amount, resetModal)}
                    </View>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </ScrollView>
          <CustomAlert isInsideModal={true} />
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
  scrollContainer: {
    flexGrow: 1,
  },
  dismissArea: {
    flex: 1,
    paddingHorizontal: horizontalScale(24),
  },
  modalPositioner: {
    marginTop: horizontalScale(190),
    marginBottom: horizontalScale(20),
  },
  modalPositionerStep2: {
    marginTop: horizontalScale(110),
  },
  modalContent: {
    backgroundColor: "#1C1D21",
    borderRadius: moderateScale(32),
    paddingHorizontal: horizontalScale(20),
    paddingTop: horizontalScale(24),
    paddingBottom: horizontalScale(16),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: horizontalScale(18),
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
    fontSize: moderateScale(23),
    color: '#3b82f6',
    fontFamily: 'Manrope_700Bold',
    marginRight: horizontalScale(8),
  },
  amountText: {
    fontSize: moderateScale(43),
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -1,
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
    elevation: 4,
    borderWidth: 1,
    borderColor: '#3b82f6',
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
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(15),
    elevation: 2,
    borderWidth: 1,
    borderColor: '#3b3d42',
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
    paddingBottom: 0,
  },
  step2Container: {
    paddingBottom: 0,
  }
});
