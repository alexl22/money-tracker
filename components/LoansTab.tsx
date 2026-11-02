import { and, collection, deleteDoc, doc, onSnapshot, or, query, updateDoc, where } from '@react-native-firebase/firestore';
import { Plus } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, Text, TouchableOpacity, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useAlert } from '../context/AlertContext';
import { useCurrency } from '../context/CurrencyContext';
import { auth, db } from '../firebaseConfig';
import { styles } from '../styles/loans.styles';
import { horizontalScale, moderateScale } from '../utils/scaling';
import { LoanCard } from './loans/LoanCard';
import { LoanModal } from './loans/LoanModal';
import { Loan } from './loans/types';

interface LoansTabProps {
  localColors: {
    primary: string;
    white: string;
    background: string;
  };
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
          loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              isExpanded={expandedLoanId === loan.id}
              onToggleExpand={(id) => setExpandedLoanId(expandedLoanId === id ? null : id)}
              onDelete={handleDeleteLoan}
              onToggleStatus={toggleLoanStatus}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              currency={currency}
              format={format}
              primaryColor={localColors.primary}
            />
          ))
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

