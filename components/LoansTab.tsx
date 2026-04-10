import { addDoc, and, collection, doc, getDoc, onSnapshot, or, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { AlignLeft, CheckCircle2, Mail, Plus, TrendingUp, Type, Wallet } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useCurrency } from '../context/CurrencyContext';
import { auth, db } from '../firebaseConfig';
import { horizontalScale, moderateScale } from '../utils/scaling';
import { styles as baseStyles, FinanceModalBase } from './FinanceModalBase';
import { Platform } from 'react-native';

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(auth.currentUser?.uid || null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(auth.currentUser?.email || null);
  const user = auth.currentUser;
  const { format, currency, rates, getSymbol } = useCurrency();
  useEffect(() => {
    if (!user) return;

    let unsubscribe: () => void;

    const handleSnapshot = (snapshot: any) => {
      const loansData = snapshot.docs.map((doc: any) => {
        const data = doc.data();
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

    if (Platform.OS === 'web') {
      const { query, collection, where, and, or, onSnapshot } = require('firebase/firestore');
      const q = query(
        collection(db, 'loans'),
        and(
          where('status', '==', activeTab),
          or(
            where('userId', '==', user.uid),
            where('personEmail', '==', user.email)
          )
        )
      );
      unsubscribe = onSnapshot(q, handleSnapshot);
    } else {
      const { Filter } = require('@react-native-firebase/firestore');
      unsubscribe = db.collection('loans')
        .where(
          Filter.and(
            Filter('status', '==', activeTab),
            Filter.or(
              Filter('userId', '==', user.uid),
              Filter('personEmail', '==', user.email)
            )
          )
        )
        .onSnapshot((snapshot: any) => {
          handleSnapshot(snapshot);
        }, (err: any) => {
          console.error("Firestore Native Error (Loans):", err);
          // Fallback if index is missing or Filter not supported
          db.collection('loans')
            .where('status', '==', activeTab)
            .where('userId', '==', user.uid)
            .get()
            .then((snap: any) => handleSnapshot(snap));
        });
    }

    return () => unsubscribe && unsubscribe();
  }, [activeTab, currency, user]);

  const handleAddLoan = () => {
    setIsModalVisible(true);
  };
  const toggleLoanStatus = async (id: string, currentStatus: 'active' | 'settled') => {
    const newStatus = currentStatus === 'active' ? 'settled' : 'active';
    try {
      if (Platform.OS === 'web') {
        const { doc, updateDoc } = require('firebase/firestore');
        await updateDoc(doc(db, 'loans', id), { status: newStatus });
      } else {
        await db.collection('loans').doc(id).update({ status: newStatus });
      }
    } catch (error) {
      console.error("Error toggling loan status:", error);
    }
  };
  return (
    <View style={styles.viewContainer}>
      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => showAlert(activeTab === 'active' ? 'They Owe Me' : 'Total Received', `Exact amount: ${format(totalLent, { isConverted: true })}`, 'info')}
          style={[styles.summaryCard, { borderLeftColor: '#6ee591' }]}
        >
          <Text style={styles.summaryLabel}>
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
          <Text style={styles.summaryLabel}>
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

      <View style={styles.secondarySwitch}>
        <TouchableOpacity
          style={[styles.secondaryTab, activeTab === 'active' && styles.secondaryTabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={activeTab === 'active' ? styles.secondaryTabTextActive : styles.secondaryTabText}>Active Loans</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryTab, activeTab === 'settled' && styles.secondaryTabActive]}
          onPress={() => setActiveTab('settled')}
        >
          <Text style={activeTab === 'settled' ? styles.secondaryTabTextActive : styles.secondaryTabText}>Settled (History)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addLoanButton} onPress={handleAddLoan}>
        <Plus color={localColors.white} size={moderateScale(18)} strokeWidth={3} />
        <Text style={styles.addLoanText}>ADD NEW LOAN</Text>
      </TouchableOpacity>

      {/* List */}
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
              <TouchableOpacity
                key={loan.id}
                activeOpacity={0.8}
                onPress={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                style={[styles.loanCard, { borderColor: effectiveType === 'lent' ? '#e7393933' : '#54d87c33' }]}
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
                  <View style={styles.expandedSection}>
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
  const { showAlert } = useAlert();
  const { convertToBase, currency } = useCurrency();
  const handleSave = async (amount: string, resetModal: () => void) => {
    const user = auth.currentUser;
    if (!user) return;

    if (!loanType) {
      showAlert('Error', 'Please select the type of loan', 'alert');
      return;
    }
    if (amount === '0') {
      showAlert('Error', 'Please enter an amount', 'alert');
      return;
    }
    if (!personName) {
      showAlert('Error', 'Please enter the person name', 'alert');
      return;
    }

    setIsSaving(true);
    try {
      // Fetch the current user's display name from Firestore for the recipient to see
      let finalOwnerName = user.displayName || user.email?.split('@')[0] || 'A user';
      let userDoc: any;
      if (Platform.OS === 'web') {
        const { getDoc, doc } = require('firebase/firestore');
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } else {
        userDoc = await db.collection('users').doc(user.uid).get();
      }

      if (userDoc.exists || (userDoc.exists && typeof userDoc.exists === 'function' ? userDoc.exists() : userDoc.exists)) {
        const data = userDoc.data();
        if (data.displayName) {
          finalOwnerName = data.displayName;
        }
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
        createdAt: new Date(),
        ownerName: finalOwnerName,
        ownerEmail: user.email || '',
      };

      if (Platform.OS === 'web') {
        const { collection, addDoc } = require('firebase/firestore');
        await addDoc(collection(db, 'loans'), loanData);
      } else {
        await db.collection('loans').add(loanData);
      }

      setLoanType(null);
      setPersonName('');
      setPersonEmail('');
      setNotes('');
      resetModal();
      onClose();
      showAlert('Success', 'Loan added successfully!', 'success');
    } catch (error) {
      console.error("Error while saving!", error);
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
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(16),
    padding: horizontalScale(16),
    minHeight: horizontalScale(115),
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderLeftWidth: 4,
  },

  summaryLabel: {
    fontSize: moderateScale(10),
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    height: moderateScale(26), // Fixed height to stabilize layout regardless of content string height
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
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(9999),
    padding: horizontalScale(4),
    marginBottom: horizontalScale(24),
    width: '90%',
    alignSelf: 'center',
  },
  secondaryTab: {
    flex: 1,
    paddingVertical: horizontalScale(12),
    alignItems: 'center',
    borderRadius: moderateScale(9999),
  },
  secondaryTabActive: {
    backgroundColor: '#333333',
  },
  secondaryTabText: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_600SemiBold',
  },
  secondaryTabTextActive: {
    fontSize: moderateScale(12),
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
  },
  addLoanButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: horizontalScale(10),
    paddingHorizontal: horizontalScale(20),
    borderRadius: moderateScale(9999),
    gap: horizontalScale(8),
    marginBottom: horizontalScale(24),
    alignSelf: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: horizontalScale(6) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(12),
    elevation: 8,
  },
  addLoanText: {
    fontSize: moderateScale(11),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  listContainer: {
    gap: horizontalScale(12),
  },
  loanCard: {
    flexDirection: 'column',
    backgroundColor: '#1A1B1E',
    padding: horizontalScale(14),
    borderRadius: moderateScale(20),
    borderWidth: 2,
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
