import { addDoc, and, collection, deleteDoc, doc, getDoc, onSnapshot, or, query, serverTimestamp, updateDoc, where } from '@react-native-firebase/firestore';
import { AlignLeft, CheckCircle2, Mail, Plus, TrendingUp, Type, Wallet } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useAlert } from '../context/AlertContext';
import { useCurrency } from '../context/CurrencyContext';
import { auth, db } from '../firebaseConfig';
import { horizontalScale, moderateScale } from '../utils/scaling';
import { styles as baseStyles, FinanceModalBase } from './FinanceModalBase';

interface LoansTabProps {
  localColors: {
    primary: string;
    white: string;
    background: string;
  };
}

interface Loan {
  id: string;
  amount: number;
  currency: string;
  amountUSD: number;
  date: Date;
  note: string;
  personName: string;
  personEmail?: string;
  status: 'active' | 'settled';
  type: 'lent' | 'borrowed';
  userId: string;
  ownerName?: string;
  ownerEmail?: string;
}

export function LoansTab({ localColors }: LoansTabProps) {
  const { showAlert } = useAlert();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [totalLent, setTotalLent] = useState(0);
  const [totalBorrowed, setTotalBorrowed] = useState(0);
  const [activeTab, setActiveTab] = useState<'active' | 'settled'>('active');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  const [containerWidth, setContainerWidth] = useState(0);
  const tabWidth = horizontalScale(100);
  const gap = horizontalScale(16);

  const activeStart = containerWidth > 0 ? (containerWidth / 2) - (gap / 2) - tabWidth : 0;
  const settledStart = containerWidth > 0 ? (containerWidth / 2) + (gap / 2) : 0;

  const translateX = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  const activeScale = useRef(new Animated.Value(activeTab === 'active' ? 1 : 0.9)).current;
  const settledScale = useRef(new Animated.Value(activeTab === 'settled' ? 1 : 0.9)).current;

  useEffect(() => {
    if (containerWidth === 0) return;

    const targetX = activeTab === 'active' ? activeStart : settledStart;

    if (isFirstRender.current) {
      translateX.value = targetX;
      activeScale.setValue(activeTab === 'active' ? 1 : 0.9);
      settledScale.setValue(activeTab === 'settled' ? 1 : 0.9);
      isFirstRender.current = false;
      return;
    }

    translateX.value = withSpring(targetX, {
      damping: 25,
      stiffness: 200,
    });

    Animated.parallel([
      Animated.spring(activeScale, {
        toValue: activeTab === 'active' ? 1 : 0.9,
        useNativeDriver: true,
        friction: 6,
        tension: 100,
      }),
      Animated.spring(settledScale, {
        toValue: activeTab === 'settled' ? 1 : 0.9,
        useNativeDriver: true,
        friction: 6,
        tension: 100,
      }),
    ]).start();

    indicatorOpacity.value = 1;
    const timeout = setTimeout(() => {
      indicatorOpacity.value = withTiming(0, { duration: 400 });
    }, 600);
    return () => clearTimeout(timeout);
  }, [activeTab, containerWidth, activeStart, settledStart]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: indicatorOpacity.value,
  }));
  const user = auth.currentUser;
  const [currentUserId, setCurrentUserId] = useState<string | null>(user?.uid || null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(user?.email || null);

  useEffect(() => {
    if (user) {
      setCurrentUserId(user.uid);
      setCurrentUserEmail(user.email);
    }
  }, [user]);

  const { format, currency, rates, getSymbol } = useCurrency();
  useEffect(() => {
    if (!user) return;

    const handleSnapshot = (snapshot: any) => {
      const loansData = snapshot.docs.map((doc: any) => {
        const data = doc.data({ serverTimestamps: 'estimate' });
        const rawDate = data.date;
        let date: Date;
        if (rawDate && typeof rawDate.toDate === 'function') {
          date = rawDate.toDate();
        } else if (rawDate instanceof Date) {
          date = rawDate;
        } else if (rawDate) {
          date = new Date(rawDate);
        } else {
          date = new Date();
        }

        return {
          id: doc.id,
          ...data,
          date: date
        };
      }) as Loan[];
      loansData.sort((a, b) => b.date.getTime() - a.date.getTime());
      setLoans(loansData);

      let sumLent = 0;
      let sumBorrowed = 0;

      loansData.forEach(loan => {
        const isOwner = loan.userId === user.uid || (loan.ownerEmail && loan.ownerEmail === user.email);
        const effectiveType = isOwner ? loan.type : (loan.type === 'lent' ? 'borrowed' : 'lent');

        const valueToSum = (loan.currency === currency)
          ? loan.amount
          : ((loan.amountUSD || (loan.amount / (rates?.[loan.currency] || 1))) * (rates?.[currency] || 1));

        if (effectiveType === 'lent') {
          sumLent += valueToSum;
        } else {
          sumBorrowed += valueToSum;
        }
      });

      setTotalLent(sumLent);
      setTotalBorrowed(sumBorrowed);
    };

    const q = query(
      collection(db, 'loans'),
      and(
        where('status', '==', activeTab),
        or(
          where('userId', '==', user.uid),
          where('personEmail', '==', user.email)
        )
      ) as any
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      handleSnapshot(snapshot);
    }, (error) => {
      console.error("Loans Snapshot Error:", error);
    });

    return () => unsubscribe();
  }, [activeTab, currency, user]);

  const handleAddLoan = () => {
    if (loans.length >= 30) {
      showAlert("Limit Reached", "You can have a maximum of 30 active/settled loans. Please settle or remove old ones first.", "alert");
      return;
    }
    setIsModalVisible(true);
  };
  const toggleLoanStatus = async (id: string, currentStatus: 'active' | 'settled') => {
    const newStatus = currentStatus === 'active' ? 'settled' : 'active';
    try {
      await updateDoc(doc(db, 'loans', id), { status: newStatus });
    } catch (error) {
      console.error("Error toggling loan status:", error);
    }
  };

  const handleDeleteLoan = (id: string, name: string) => {
    showAlert(
      'Delete Loan',
      `Are you sure you want to delete the loan with ${name}?`,
      'alert',
      async () => {
        try {
          await deleteDoc(doc(db, 'loans', id));
        } catch (error) {
          console.error("Error deleting loan:", error);
          showAlert('Error', 'Could not delete the loan. Please try again.', 'alert');
        }
      },
      true,
      false
    );
  };
  return (
    <View style={styles.viewContainer}>
      <View style={styles.summaryRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => showAlert(activeTab === 'active' ? 'They Owe Me' : 'TOTAL RECEIVED', `Exact amount: ${format(totalLent, { isConverted: true })}`, 'info')}
          style={[styles.summaryCard, { borderLeftColor: '#6ee591' }]}
        >
          <Text
            style={styles.summaryLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {activeTab === 'active' ? 'THEY OWE ME' : 'TOTAL RECEIVED'}
          </Text>
          {(() => {
            const symbolStr = getSymbol().trim();
            const formatted = format(totalLent, { compact: true, threshold: 10000, isConverted: true });
            if (symbolStr.length > 2) {
              const amountOnly = formatted.replace(symbolStr, '').trim();
              return (
                <View>
                  <Text style={[styles.summaryValue, { color: 'rgba(110, 229, 145, 0.8)', marginBottom: -horizontalScale(6) }]}>
                    {symbolStr}
                  </Text>
                  <Text style={[styles.summaryValue, { color: '#6ee591' }]}>
                    {amountOnly}
                  </Text>
                </View>
              );
            }
            return (
              <Text
                style={[styles.summaryValue, { color: '#6ee591' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {formatted}
              </Text>
            );
          })()}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => showAlert(activeTab === 'active' ? 'I Owe Them' : 'Total Sent', `Exact amount: ${format(totalBorrowed, { isConverted: true })}`, 'info')}
          style={[styles.summaryCard, { borderLeftColor: '#eb5656' }]}
        >
          <Text
            style={styles.summaryLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {activeTab === 'active' ? 'I OWE THEM' : 'TOTAL SENT'}
          </Text>
          {(() => {
            const symbolStr = getSymbol().trim();
            const formatted = format(totalBorrowed, { compact: true, threshold: 10000, isConverted: true });
            if (symbolStr.length > 2) {
              const amountOnly = formatted.replace(symbolStr, '').trim();
              return (
                <View>
                  <Text style={[styles.summaryValue, { color: 'rgba(235, 86, 86, 0.8)', marginBottom: -horizontalScale(6) }]}>
                    {symbolStr}
                  </Text>
                  <Text style={[styles.summaryValue, { color: '#eb5656' }]}>
                    {amountOnly}
                  </Text>
                </View>
              );
            }
            return (
              <Text
                style={[styles.summaryValue, { color: '#eb5656' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {formatted}
              </Text>
            );
          })()}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addLoanSlim} onPress={handleAddLoan}>
        <Plus color="#ffffffff" size={moderateScale(16)} strokeWidth={3} />
        <Text style={styles.addLoanSlimText}>NEW LOAN</Text>
      </TouchableOpacity>

      <View
        style={styles.secondarySwitch}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.indicatorTrack}>
          <Reanimated.View
            style={[
              styles.indicatorBar,
              indicatorStyle
            ]}
          />
        </View>

        <TouchableOpacity
          onPress={() => setActiveTab('active')}
          activeOpacity={0.9}
        >
          <Animated.View style={[
            styles.bubbleTab,
            {
              transform: [{ scale: activeScale }],
              backgroundColor: activeTab === 'active' ? '#3b82f6ff' : '#1C1D1F',
              borderColor: activeTab === 'active' ? 'rgba(59, 130, 246, 1)' : 'rgba(255,255,255,0.12)',
              opacity: activeTab === 'active' ? 1 : 0.6,
              shadowColor: activeTab === 'active' ? 'rgba(59, 130, 246, 1)' : '#000',
              shadowOpacity: activeTab === 'active' ? 0.7 : 0,
              shadowRadius: activeTab === 'active' ? 15 : 0,
              elevation: activeTab === 'active' ? 10 : 0,
            }
          ]}>
            <Text style={activeTab === 'active' ? styles.secondaryTabTextActive : styles.secondaryTabText}>ACTIVE</Text>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('settled')}
          activeOpacity={0.9}
        >
          <Animated.View style={[
            styles.bubbleTab,
            {
              transform: [{ scale: settledScale }],
              backgroundColor: activeTab === 'settled' ? 'rgba(59, 130, 246, 1)' : '#1C1D1F',
              borderColor: activeTab === 'settled' ? 'rgba(59, 130, 246, 1)' : 'rgba(255,255,255,0.12)',
              opacity: activeTab === 'settled' ? 1 : 0.6,
              shadowColor: activeTab === 'settled' ? 'rgba(59, 130, 246, 1)' : '#000',
              shadowOpacity: activeTab === 'settled' ? 0.7 : 0,
              shadowRadius: activeTab === 'settled' ? 15 : 0,
              elevation: activeTab === 'settled' ? 6 : 0,
            }
          ]}>
            <Text style={activeTab === 'settled' ? styles.secondaryTabTextActive : styles.secondaryTabText}>SETTLED</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>


      <View style={styles.listContainer}>
        {loans.length > 0 ? (
          loans.map((loan) => {
            const isExpanded = expandedLoanId === loan.id;
            const isOwner = currentUserId
              ? (loan.userId === currentUserId || (loan.ownerEmail && loan.ownerEmail === currentUserEmail))
              : false;
            const effectiveType = isOwner ? loan.type : (loan.type === 'lent' ? 'borrowed' : 'lent');

            const displayName = isOwner ? loan.personName : (loan.ownerName || loan.ownerEmail?.split('@')[0] || 'From');

            const isSameCurrency = loan.currency === currency;
            const displayValueForLoan = isSameCurrency
              ? loan.amount
              : (loan.amountUSD || loan.amount);

            const finalLoanAmount = effectiveType === 'lent' ? -displayValueForLoan : displayValueForLoan;

            return (
              <View
                key={loan.id}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                  onLongPress={() => handleDeleteLoan(loan.id, displayName)}
                  delayLongPress={300}
                  style={[styles.loanCard, { borderColor: effectiveType === 'lent' ? 'rgba(235, 86, 86, 0.6)' : 'rgba(16, 185, 129, 0.6)' }]}
                >
                  <View style={styles.loanMainContent}>
                    <View style={styles.loanLeft}>
                      <View style={styles.avatarContainer}>
                        <Text style={[styles.avatarText, { color: effectiveType === 'lent' ? '#eb5656' : '#6ee591' }]}>
                          {displayName.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.loanName} numberOfLines={isExpanded ? undefined : 1}>
                          {isOwner ? `To ${loan.personName}` : `From ${displayName}`}
                        </Text>
                        <Text style={styles.loanNote} numberOfLines={isExpanded ? undefined : 1}>{loan.note}</Text>
                      </View>
                    </View>
                    <View style={styles.loanRight}>
                      <Text
                        style={[styles.loanAmount, { color: effectiveType === 'lent' ? '#eb5656' : '#6ee591' }]}
                        numberOfLines={1}
                      >
                        {format(finalLoanAmount, {
                          compact: true,
                          showSign: true,
                          threshold: 1000000,
                          isConverted: isSameCurrency
                        })}
                      </Text>
                      <TouchableOpacity
                        style={styles.checkmarkContainer}
                        onPress={() => toggleLoanStatus(loan.id, loan.status)}
                      >
                        <CheckCircle2
                          color={loan.status === 'settled' ? localColors.primary : "rgba(255,255,255,0.4)"}
                          size={moderateScale(20)}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isExpanded && Math.abs(displayValueForLoan) >= 1000000 && (
                    <View
                      style={styles.expandedSection}
                    >
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailLabel}>EXACT AMOUNT</Text>
                          <Text
                            style={[styles.detailValue, { color: effectiveType === 'lent' ? '#eb5656' : '#6ee591' }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {format(finalLoanAmount, {
                              showSign: true,
                              isConverted: isSameCurrency
                            })}
                          </Text>
                        </View>
                      </View>

                      {loan.note && (
                        <View style={{ marginTop: horizontalScale(12) }}>
                          <Text style={styles.detailLabel}>NOTES</Text>
                          <Text style={styles.fullNoteText}>{loan.note}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No loans yet</Text>
          </View>
        )}
      </View>

      <LoanModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
}

function LoanModal({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) {
  const [loanType, setLoanType] = useState<'lent' | 'borrowed' | null>(null);
  const [personName, setPersonName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [personEmail, setPersonEmail] = useState('');
  const [isLoanModalVisible, setIsLoanModalVisible] = useState(false);
  const { showAlert } = useAlert();
  const { convertToBase, currency } = useCurrency();
  const handleSave = async (amount: string, resetModal: () => void) => {
    const user = auth.currentUser;
    if (!user) return;

    if (!loanType) {
      if (Platform.OS === 'ios') Alert.alert('Error', 'Please select the type of loan');
      else showAlert('Error', 'Please select the type of loan', 'alert', undefined, false, true);
      return;
    }
    if (amount === '0') {
      if (Platform.OS === 'ios') Alert.alert('Error', 'Please enter an amount');
      else showAlert('Error', 'Please enter an amount', 'alert', undefined, false, true);
      return;
    }
    if (!personName) {
      if (Platform.OS === 'ios') Alert.alert('Error', 'Please enter the person name');
      else showAlert('Error', 'Please enter the person name', 'alert', undefined, false, true);
      return;
    }

    setIsSaving(true);
    try {
      let finalOwnerName = user.displayName || user.email?.split('@')[0] || 'A user';
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data && data.displayName) {
            finalOwnerName = data.displayName;
          }
        }
      } catch (e) {
        console.warn("Could not fetch owner name from server (likely offline), using fallback", e);
      }

      const loanData = {
        userId: user.uid,
        amount: parseFloat(amount),
        currency: currency,
        amountUSD: convertToBase(parseFloat(amount)),
        type: loanType,
        personName: personName,
        personEmail: personEmail,
        note: notes,
        status: 'active',
        date: new Date(),
        createdAt: serverTimestamp(),
        ownerName: finalOwnerName,
        ownerEmail: user.email || '',
      };

      addDoc(collection(db, 'loans'), loanData)
        .catch(err => console.error("Loan Save Error", err));

      setLoanType(null);
      setPersonName('');
      setPersonEmail('');
      setNotes('');
      resetModal();
      setTimeout(() => {
        showAlert('Success', 'Loan added successfully!', 'success');
      }, Platform.OS === 'ios' ? 100 : 100);
    } catch (error) {
      console.error("Error while saving!", error);
      showAlert('Error', 'We could not process the loan. Please try again.', 'alert');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FinanceModalBase
      isVisible={isVisible}
      onClose={onClose}
      titleStep1="New loan"
      titleStep2="Loan details"
      marginTopStep2="20%"
      renderStep2={(amount, resetModal) => (
        <View>
          <View style={baseStyles.typeSelectorRow}>
            <TouchableOpacity
              style={[baseStyles.typeButtonContainer]}
              onPress={() => setLoanType('lent')}
            >
              <View style={[
                baseStyles.typeBox,
                loanType === 'lent' && { borderColor: '#6ee591', borderWidth: 2.5 }
              ]}>
                <View style={[
                  baseStyles.typeCircle,
                  { backgroundColor: '#6ee591' },
                  loanType === 'lent' && baseStyles.typeCircleActive
                ]}>
                  <TrendingUp color="#FFFFFF" size={30} strokeWidth={2.5} />
                </View>
              </View>
              <Text style={[baseStyles.typeLabel, { color: '#6ee591' }]}>LENT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[baseStyles.typeButtonContainer]}
              onPress={() => setLoanType('borrowed')}
            >
              <View style={[
                baseStyles.typeBox,
                loanType === 'borrowed' && { borderColor: '#eb5656', borderWidth: 2.5 }
              ]}>
                <View style={[
                  baseStyles.typeCircle,
                  { backgroundColor: '#eb5656' },
                  loanType === 'borrowed' && baseStyles.typeCircleActive
                ]}>
                  <Wallet color="#FFFFFF" size={30} strokeWidth={2.5} />
                </View>
              </View>
              <Text style={[baseStyles.typeLabel, { color: '#eb5656' }]}>BORROWED</Text>
            </TouchableOpacity>
          </View>

          <View style={baseStyles.inputSection}>
            <View style={baseStyles.inputLabelHeader}>
              <Type color="rgba(255,255,255,0.4)" size={14} />
              <Text style={baseStyles.inputLabel}>Person Name</Text>
            </View>
            <TextInput
              style={baseStyles.textInput}
              placeholder="Ex: John Doe"
              placeholderTextColor="rgba(255,255,255,0.1)"
              value={personName}
              onChangeText={setPersonName}
              maxLength={25}
            />
          </View>
          <View style={baseStyles.inputSection}>
            <View style={baseStyles.inputLabelHeader}>
              <Mail color="rgba(255,255,255,0.4)" size={14} />
              <Text style={baseStyles.inputLabel}>Person Email</Text>
            </View>
            <TextInput
              style={baseStyles.textInput}
              placeholder="Ex: john@example.com"
              placeholderTextColor="rgba(255,255,255,0.1)"
              value={personEmail}
              onChangeText={setPersonEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={30}
            />
          </View>

          <View style={baseStyles.inputSection}>
            <View style={baseStyles.inputLabelHeader}>
              <AlignLeft color="rgba(255,255,255,0.4)" size={14} />
              <Text style={baseStyles.inputLabel}>DETAILS / NOTES</Text>
            </View>
            <TextInput
              style={[baseStyles.textInput, baseStyles.textArea]}
              placeholder="Details about the loan..."
              placeholderTextColor="rgba(255,255,255,0.1)"
              multiline={true}
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              maxLength={60}
            />
          </View>

          <TouchableOpacity
            style={[baseStyles.primaryButton, isSaving && { opacity: 0.7 }]}
            onPress={() => handleSave(amount, resetModal)}
            disabled={isSaving}
          >
            <Text style={baseStyles.primaryButtonText}>
              {isSaving ? 'SAVING...' : 'FINALIZE'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  viewContainer: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: horizontalScale(12),
    marginBottom: horizontalScale(24),
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(28, 29, 31, 0.9)',
    borderRadius: moderateScale(16),
    padding: horizontalScale(16),
    minHeight: horizontalScale(115),
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 5,
    borderTopColor: 'rgba(255,255,255,0.12)',
    borderRightColor: 'rgba(255,255,255,0.12)',
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },

  summaryLabel: {
    fontSize: moderateScale(10),
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    height: moderateScale(26),
  },
  summaryValue: {
    fontSize: moderateScale(24),
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.5,
  },
  summaryCurrencyCode: {
    fontSize: moderateScale(12),
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: -horizontalScale(2),
  },
  secondarySwitch: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: horizontalScale(16),
    marginBottom: horizontalScale(24),
    width: '100%',
    position: 'relative',
    paddingBottom: horizontalScale(10),
  },
  indicatorTrack: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
  },
  indicatorBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: horizontalScale(100),
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderRadius: 1,
    shadowColor: '#ffffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  bubbleTab: {
    width: horizontalScale(100),
    paddingVertical: horizontalScale(10),
    borderRadius: moderateScale(9999),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  secondaryTabText: {
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1,
  },
  secondaryTabTextActive: {
    fontSize: moderateScale(13),
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1,
  },
  addLoanSlim: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingVertical: horizontalScale(10),
    borderRadius: moderateScale(9999),
    marginBottom: horizontalScale(24),
    width: '45%',
    alignSelf: 'center',
    gap: horizontalScale(8),
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  addLoanSlimText: {
    fontSize: moderateScale(11),
    color: '#ffffffff',
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1.2,
  },
  listContainer: {
    gap: horizontalScale(12),
  },
  loanCard: {
    flexDirection: 'column',
    backgroundColor: 'rgba(28, 29, 31, 0.9)',
    padding: horizontalScale(14),
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
    marginBottom: horizontalScale(10),
  },
  loanMainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  expandedSection: {
    width: '100%',
    marginTop: horizontalScale(4),
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: horizontalScale(12),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: moderateScale(9),
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    marginBottom: horizontalScale(4),
    textTransform: 'uppercase',
  },
  detailValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(20),
  },
  fullNoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.6)',
    lineHeight: moderateScale(18),
  },
  contactText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(12),
    color: '#3b82f6',
  },
  loanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: horizontalScale(16),
    flex: 1,
  },
  avatarContainer: {
    width: horizontalScale(42),
    height: horizontalScale(42),
    borderRadius: moderateScale(21),
    backgroundColor: '#2A2B2D',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: 'rgba(59, 130, 246, 0.8)',
    fontWeight: 'bold',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(14),
  },
  loanName: {
    fontSize: moderateScale(15),
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  loanDetailsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: horizontalScale(8),
    marginTop: horizontalScale(4),
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  dateTag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: horizontalScale(6),
    paddingVertical: horizontalScale(2),
    borderRadius: moderateScale(4),
  },
  dateText: {
    fontSize: moderateScale(10),
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_400Regular',
  },
  loanNote: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  loanRight: {
    alignItems: 'flex-end',
    gap: horizontalScale(12),
    minWidth: horizontalScale(110),
    justifyContent: 'center',
  },
  loanAmount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(17),
    marginBottom: horizontalScale(2),
  },
  checkmarkContainer: {
    width: horizontalScale(36),
    height: horizontalScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: '#2A2B2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: horizontalScale(40),
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(14),
  },
});
