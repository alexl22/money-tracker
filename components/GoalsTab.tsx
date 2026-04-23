import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from '@react-native-firebase/firestore';
import { Calendar, TrendingDown, TrendingUp, Trophy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useAlert } from '../context/AlertContext';
import { useCurrency } from '../context/CurrencyContext';
import { auth, db } from '../firebaseConfig';
import { horizontalScale, moderateScale } from '../utils/scaling';
import { DatePicker } from './DatePicker';
import { TargetInputModal } from './TargetInputModal';
interface GoalsTabProps {
  localColors: {
    primary: string;
    white: string;
    background: string;
  };
}


interface Goals {
  id: string;
  title: string;
  targetAmount: number;
  targetAmountUSD: number;
  currency: string;
  startDate: Date;
  deadline: Date;
  userId: string;
}

export function GoalsTab({ localColors }: GoalsTabProps) {
  const radius = moderateScale(85);
  const strokeWidth = moderateScale(12);
  const circumference = 2 * Math.PI * radius;
  const [currentGoal, setCurrentGoal] = useState<Goals | null>(null);
  const user = auth.currentUser;
  const daysLeft = currentGoal?.deadline ? Math.max(0, Math.ceil((new Date(currentGoal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const [totalProfit, setTotalProfit] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isTargetModalVisible, setIsTargetModalVisible] = useState(false);
  const { convertToBase, currency, format, rates, getSymbol } = useCurrency();
  const targetForCalc = (() => {
    if (!currentGoal) return 0;
    const val = currentGoal.currency === currency
      ? currentGoal.targetAmount
      : ((currentGoal.targetAmountUSD || (currentGoal.targetAmount / (rates?.[currentGoal.currency] || 1))) * (rates?.[currency] || 1));
    return isNaN(val) ? 0 : val;
  })();
  const dynamicProgress = currentGoal && targetForCalc > 0
    ? Math.max(0, (totalProfit / targetForCalc) * 100)
    : 0;
  const clampedProgress = Math.min(100, dynamicProgress);
  const strokeDashoffset = circumference - (circumference * clampedProgress / 100);

  // Performance Calculations
  const now = new Date();
  const todayAtMidnight = new Date();
  todayAtMidnight.setHours(0, 0, 0, 0);

  const isUpcoming = currentGoal && currentGoal.startDate > todayAtMidnight;
  const daysUntilStart = isUpcoming && currentGoal ? Math.ceil((new Date(currentGoal.startDate).getTime() - todayAtMidnight.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const startTime = currentGoal?.startDate ? new Date(currentGoal.startDate).getTime() : now.getTime();
  const elapsedDays = Math.max(1, Math.ceil((now.getTime() - startTime) / (1000 * 60 * 60 * 24)));
  const currentPace = totalProfit / elapsedDays;
  const remainingAmount = currentGoal ? targetForCalc - totalProfit : 0;
  const { showAlert } = useAlert();
  const daysUntilTarget = currentPace > 0 ? Math.ceil(remainingAmount / currentPace) : Infinity;

  const totalGoalDays = currentGoal ? Math.max(1, Math.ceil((new Date(currentGoal.deadline).getTime() - new Date(currentGoal.startDate).getTime()) / (1000 * 60 * 60 * 24))) : 1;
  const dailyTarget = currentGoal
    ? (isUpcoming
      ? targetForCalc / totalGoalDays
      : (daysLeft > 0 ? Math.max(0, remainingAmount / daysLeft) : 0))
    : 0;

  const isGoalReached = currentGoal && totalProfit >= targetForCalc ? true : false;
  const isAhead = currentPace > 0 && daysUntilTarget < daysLeft;
  const isOnTrack = currentPace > 0 && daysUntilTarget === daysLeft;
  const daysDiff = Math.abs(Math.round(daysLeft - daysUntilTarget));

  const getStatusMessage = () => {
    if (!currentGoal) return "Add a goal to see status.";
    if (isUpcoming) return `Goal starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}. Get ready!`;
    if (totalProfit >= targetForCalc) return "Congratulations! Goal Accomplished!";
    if (isOnTrack)
      return "Perfectly on track! You'll reach target exactly on the deadline."
    if (isAhead) {
      return `Ahead of schedule! Estimated ${daysUntilTarget} days until reached (${daysDiff} days early).`;
    }

    if (daysUntilTarget === Infinity) {
      return "Behind schedule. Please increase your daily profit to see completion forecast.";
    }

    return `Behind schedule. Estimated ${daysUntilTarget} days until reached (${daysDiff} days late).`;
  };

  const handleUpdatePeriod = (start: Date, end: Date) => {
    if (!user) return;
    try {
      const s = new Date(start);
      s.setHours(0, 0, 0, 0);
      const e = new Date(end);
      e.setHours(23, 59, 59, 999);

      const updateData = {
        startDate: s,
        deadline: e
      };

      if (currentGoal) {
        updateDoc(doc(db, "goals", currentGoal.id), updateData)
          .catch(err => console.error("Goal Update Error", err));
      } else {
        const newData = {
          userId: user.uid,
          ...updateData,
          targetAmount: 0,
          targetAmountUSD: 0,
          currency: currency,
          title: "My Saving Goal",
          createdAt: serverTimestamp()
        };
        addDoc(collection(db, "goals"), newData)
          .catch(err => console.error("Goal Create Error", err));
      }
    } catch (error) {
      console.error("Error updating goal period:", error);
    }
  };

  const handleUpdateTarget = (amount: number) => {
    if (!user) return;
    const targetUSD = convertToBase(amount);
    try {
      const updateData = {
        targetAmount: amount,
        targetAmountUSD: targetUSD,
        currency: currency
      };

      if (currentGoal) {
        updateDoc(doc(db, "goals", currentGoal.id), updateData)
          .catch(err => console.error("Goal Update Error", err));
      } else {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setMonth(end.getMonth() + 1);
        end.setHours(23, 59, 59, 999);

        const newData = {
          userId: user.uid,
          startDate: start,
          deadline: end,
          ...updateData,
          title: "My Saving Goal",
          createdAt: serverTimestamp()
        };

        addDoc(collection(db, "goals"), newData)
          .catch(err => console.error("Goal Create Error", err));
      }
    } catch (error) {
      console.error("Error updating goal target:", error);
    }
  };

  const handleResetGoal = () => {
    if (!currentGoal) return;
    try {
      deleteDoc(doc(db, "goals", currentGoal.id))
        .catch(err => console.error("Goal Delete Error", err));
      setCurrentGoal(null);
      setTotalProfit(0);
      setTodayProfit(0);
    } catch (error) {
      console.error("Error resetting goal:", error);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-- --';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };


  useEffect(() => {
    if (!user || !currentGoal) return;

    const handleSnapshot = (snapshot: any) => {
      let income = 0;
      let expense = 0;
      let todayInc = 0;
      let todayExp = 0;

      const nowDay = new Date();
      nowDay.setHours(0, 0, 0, 0);

      snapshot.docs.forEach((doc: any) => {
        const data = doc.data({ serverTimestamps: 'estimate' });
        const amount = (data.currency === currency) ? data.amount : ((data.amountUSD || (data.amount / (rates?.[data.currency] || 1))) * (rates?.[currency] || 1));

        const rawDate = data.date || data.createdAt;
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

        if (date >= currentGoal.startDate) {
          if (data.type === 'income') income += amount;
          else if (data.type === 'expense') expense += amount;

          if (date >= nowDay) {
            if (data.type === 'income') todayInc += amount;
            else if (data.type === 'expense') todayExp += amount;
          }
        }
      });

      setTotalProfit(income - expense);
      setTodayProfit(todayInc - todayExp);
    };

    const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, handleSnapshot, (error: any) => {
      console.error("Goals Transactions Snapshot Error:", error);
    });

    return () => unsubscribe();
  }, [currentGoal?.startDate, currency, user]);




  useEffect(() => {
    if (!user) return;

    const handleGoalSnapshot = (snapshot: any) => {
      if (!snapshot.empty) {
        const goalDoc = snapshot.docs[0];
        const data = goalDoc.data({ serverTimestamps: 'estimate' });

        const rawStart = data.startDate;
        const rawDeadline = data.deadline;

        const parseDate = (d: any) => {
          if (d && typeof d.toDate === 'function') return d.toDate();
          if (d instanceof Date) return d;
          if (d) return new Date(d);
          return new Date();
        };

        setCurrentGoal({
          id: goalDoc.id,
          title: data.title || 'My Saving Goal',
          targetAmount: data.targetAmount || 0,
          targetAmountUSD: data.targetAmountUSD || 0,
          currency: data.currency || 'USD',
          userId: data.userId,
          startDate: parseDate(rawStart),
          deadline: parseDate(rawDeadline)
        } as Goals);
      } else {
        setCurrentGoal(null);
      }
    };

    const q = query(collection(db, "goals"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, handleGoalSnapshot, (error: any) => {
      console.error("Goals Definition Snapshot Error:", error);
    });

    return () => unsubscribe();
  }, [user]);


  const isSameCurrency = true; // Everything is normalized mapped to this view
  const stableTarget = targetForCalc;

  return (
    <View style={styles.viewContainer}>


      <View style={styles.ringContainer}>
        <Svg width={moderateScale(220)} height={moderateScale(220)} viewBox="0 0 200 200">
          <G rotation="-90" origin="100, 100">
            <Circle cx="100" cy="100" r={radius} stroke={'rgba(255,255,255,0.05)'} strokeWidth={strokeWidth} fill="none" />

            {/* Soft Outer Glow Layers */}
            <Circle cx="100" cy="100" r={radius} stroke={'#67E8F9'} strokeWidth={strokeWidth + moderateScale(20)} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="none" opacity={0.03} />
            <Circle cx="100" cy="100" r={radius} stroke={'#67E8F9'} strokeWidth={strokeWidth + moderateScale(14)} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="none" opacity={0.05} />
            <Circle cx="100" cy="100" r={radius} stroke={'#67E8F9'} strokeWidth={strokeWidth + moderateScale(8)} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="none" opacity={0.1} />
            <Circle cx="100" cy="100" r={radius} stroke={'#67E8F9'} strokeWidth={strokeWidth + moderateScale(4)} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="none" opacity={0.2} />

            {/* Main Progress Ring */}
            <Circle cx="100" cy="100" r={radius} stroke={'#67E8F9'} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="none" />
          </G>
        </Svg>
        {currentGoal && (currentGoal.targetAmount > 0 || currentGoal.targetAmountUSD > 0) ? (
          <TouchableOpacity
            style={styles.ringCenterText}
            onPress={() => setIsTargetModalVisible(true)}
            activeOpacity={0.6}
          >
            <Text style={styles.ringGoalLabel}>TARGET</Text>
            <Text style={styles.ringGoalValue}>{format(stableTarget, { isConverted: true, compact: true, threshold: 1000000 })}</Text>
            <Text style={styles.ringPercent}>{Math.round(clampedProgress)}%</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.ringCenterText}
            onPress={() => setIsTargetModalVisible(true)}
            activeOpacity={0.6}
          >
            <Text style={styles.ringGoalLabel}>GOAL</Text>
            <Text style={styles.ringGoalValue}>ADD TARGET</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.motivationalText}>
        {currentGoal && targetForCalc > 0 ? (
          <>
            <Text style={{ color: localColors.white, fontWeight: 'bold' }}>
              {isUpcoming
                ? "Get ready for your goal!"
                : (totalProfit >= targetForCalc ? "Goal Accomplished!" : "You're nearly there!")}
            </Text>{"\n"}
            {isUpcoming ? (
              <Text style={{ color: 'rgba(255,255,255,0.4)' }}>
                Stay focused, your journey begins soon.
              </Text>
            ) : (
              <>
                {totalProfit >= targetForCalc ? (
                  <>
                    <Text style={{ color: 'rgba(255,255,255,0.4)' }}>You've exceeded your target by </Text>
                    <Text style={{ color: '#6ee591', fontWeight: 'bold' }}>
                      {format(Math.abs(totalProfit - targetForCalc), { isConverted: true })}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Only </Text>
                    <Text style={{ color: '#67E8F9', fontWeight: 'bold' }}>
                      {format(targetForCalc - totalProfit, { isConverted: true })}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)' }}> left to reach your goal.</Text>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <Text style={{ color: localColors.white, fontWeight: 'bold' }}>Getting Started</Text>{"\n"}
            <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Select a target to begin</Text>
          </>
        )}
      </Text>

      <TouchableOpacity
        style={styles.summaryRow}
        onPress={() => {
          if (currentGoal) {
            setIsPickerVisible(true);
          } else {
            showAlert(
              "Target Not Set",
              "Please set a target amount first by tapping the 'ADD TARGET' circle above.",
              "info"
            );
          }
        }}
        activeOpacity={0.7}
        disabled={isGoalReached}
      >
        <View style={[
          styles.goalStatusCard,
          isGoalReached && { borderColor: 'rgba(110, 229, 145, 0.2)', borderWidth: 2 }
        ]}>
          <Text style={[styles.statusLabel, isGoalReached && { color: '#6ee591' }, isUpcoming && { color: '#67E8F9' }]}>
            {isGoalReached ? 'GOAL COMPLETED' : (isUpcoming ? 'UPCOMING GOAL' : 'FINAL COUNTDOWN')}
          </Text>
          <Text style={styles.statusValue}>
            {currentGoal ? (isGoalReached ? 'Target Reached!' : (isUpcoming ? `Starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}` : `${daysLeft} Days Left`)) : 'Select dates'}
          </Text>
          <Text style={styles.periodLabel}>
            {currentGoal ? isGoalReached ? null : `${formatDate(currentGoal.startDate)} — ${formatDate(currentGoal.deadline)}` : 'Period not set'}
          </Text>
          <View style={styles.goalStatusIconContainer}>
            <View style={[styles.goalStatusIconCircle, isGoalReached && { backgroundColor: 'rgba(110, 229, 145, 0.1)' }]}>
              {isGoalReached ? (
                <Trophy color="#6ee591" size={28} />
              ) : (
                <Calendar color="#67E8F9" size={24} />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <DatePicker
        isVisible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        initialStartDate={currentGoal?.startDate}
        initialDeadline={currentGoal?.deadline}
        onSave={handleUpdatePeriod}
      />

      <TargetInputModal
        isVisible={isTargetModalVisible}
        onClose={() => setIsTargetModalVisible(false)}
        initialAmount={currentGoal?.targetAmount}
        onSave={handleUpdateTarget}
        onReset={handleResetGoal}
      />


      {currentGoal && (
        <TouchableOpacity onPress={() => showAlert("Goal Performance", `Today: ${format(todayProfit, { isConverted: true })}\nDaily Target: ${format(dailyTarget, { isConverted: true })}\nTotal Profit: ${format(totalProfit, { isConverted: true })}`, "info")}>
          <View style={styles.performanceCard}>
            <View style={styles.perfHeader}>
              <View style={{ flex: 1.4 }}>
                <Text style={styles.perfLabel} numberOfLines={1}>TODAY'S PERFORMANCE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                  <Text
                    style={[styles.perfValue, { color: todayProfit < 0 ? '#ff4d4d' : '#6ee591', flexShrink: 1 }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {currentGoal ? format(todayProfit, { compact: true, threshold: 10000, isConverted: true }) : '--'}
                  </Text>
                  {todayProfit < 0 ? (
                    <TrendingDown color="#ff4d4d" size={16} style={{ marginLeft: 8, flexShrink: 0 }} />
                  ) : (
                    <TrendingUp color="#6ee591" size={16} style={{ marginLeft: 8, flexShrink: 0 }} />
                  )}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', flex: 0.9, marginLeft: 10 }}>
                <Text style={styles.perfTargetLabel} numberOfLines={1}>DAILY TARGET</Text>
                <Text
                  style={[styles.perfTargetValue, { flexShrink: 1 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {currentGoal && daysLeft > 0
                    ? format(dailyTarget, { compact: true, threshold: 10000, isConverted: true })
                    : '--'}
                </Text>
              </View>
            </View>
            <View style={[
              styles.perfStatusBox,
              {
                backgroundColor: isGoalReached
                  ? 'rgba(110, 229, 145, 0.08)'
                  : (isUpcoming ? 'rgba(103, 232, 249, 0.08)' : (isAhead || isOnTrack ? 'rgba(110, 229, 145, 0.05)' : 'rgba(255, 77, 77, 0.1)')),
                borderLeftColor: isGoalReached
                  ? '#6ee591'
                  : (isUpcoming ? '#67E8F9' : (isAhead || isOnTrack ? '#6ee591' : '#ff4d4d'))
              }
            ]}>
              <View style={styles.perfStatusContent}>
                <Text style={[
                  styles.perfStatusText,
                  (!isAhead && !isGoalReached && !isOnTrack && !isUpcoming) && { color: '#ff4d4d' },
                  isUpcoming && { color: '#67E8F9' }
                ]}>
                  {getStatusMessage()}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}
      {!isGoalReached && !isUpcoming && currentGoal && (
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: -8, marginBottom: 20, fontFamily: 'Inter_400Regular' }}>
          * Estimated based on daily average since goal start
        </Text>
      )}
    </View >
  );
}

const styles = StyleSheet.create({
  viewContainer: {
    flex: 1,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: horizontalScale(20),
    height: horizontalScale(220),
  },
  ringCenterText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringGoalLabel: {
    fontSize: moderateScale(10),
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
  },
  ringGoalValue: {
    fontSize: moderateScale(24),
    marginVertical: horizontalScale(2),
    fontFamily: 'Manrope_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  ringPercent: {
    color: '#67E8F9',
    fontSize: moderateScale(16),
    fontFamily: 'Manrope_800ExtraBold',
    marginTop: horizontalScale(4),
  },
  motivationalText: {
    textAlign: 'center',
    lineHeight: moderateScale(20),
    color: 'rgba(255,255,255,0.6)',
    marginBottom: horizontalScale(24),
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(13),
  },
  summaryRow: {
    flexDirection: 'row',
    gap: horizontalScale(12),
    marginBottom: horizontalScale(24),
  },
  goalStatusCard: {
    flex: 1,
    backgroundColor: '#161618',
    borderRadius: moderateScale(24),
    padding: horizontalScale(18),
    minHeight: horizontalScale(130),
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    position: 'relative',
    overflow: 'hidden',
  },
  periodLabel: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'Inter_600SemiBold',
    marginTop: horizontalScale(4),
  },
  goalStatusIconContainer: {
    position: 'absolute',
    right: horizontalScale(-20),
    top: horizontalScale(-10),
    bottom: horizontalScale(-10),
    width: horizontalScale(140),
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalStatusIconCircle: {
    width: horizontalScale(70),
    height: horizontalScale(70),
    borderRadius: moderateScale(35),
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: moderateScale(9),
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: horizontalScale(4),
    fontFamily: 'Inter_600SemiBold',
  },
  statusValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(18),
    color: '#FFFFFF',
  },
  performanceCard: {
    backgroundColor: '#161618',
    borderRadius: moderateScale(24),
    padding: horizontalScale(20),
    marginBottom: horizontalScale(20),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  perfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: horizontalScale(12),
  },
  perfLabel: {
    fontSize: moderateScale(11),
    fontFamily: 'Manrope_700Bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  perfValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(26),
    color: '#6ee591',
  },
  perfTargetLabel: {
    fontSize: moderateScale(10),
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    fontFamily: 'Inter_600SemiBold',
  },
  perfTargetValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(21),
    color: '#FFFFFF',
    marginTop: horizontalScale(4),
  },
  perfStatusBox: {
    marginTop: horizontalScale(24),
    backgroundColor: 'rgba(110, 229, 145, 0.08)',
    borderRadius: moderateScale(16),
    borderLeftWidth: 4,
    borderLeftColor: '#6ee591',
    overflow: 'hidden',
  },
  perfStatusContent: {
    padding: horizontalScale(20),
  },
  perfStatusText: {
    fontSize: moderateScale(13),
    color: '#FFFFFF',
    lineHeight: moderateScale(20),
    fontFamily: 'Inter_600SemiBold',
  },
});
