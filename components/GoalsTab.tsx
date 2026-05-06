import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from '@react-native-firebase/firestore';
import { Calendar, Plus, TrendingDown, TrendingUp, Trophy } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { useAlert } from '../context/AlertContext';
import { useCurrency } from '../context/CurrencyContext';
import { auth, db } from '../firebaseConfig';
import { horizontalScale, moderateScale } from '../utils/scaling';
import { DatePicker } from './DatePicker';
import { TargetInputModal } from './TargetInputModal';

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  targetAmountUSD: number;
  currency: string;
  startDate: Date;
  deadline: Date;
  userId: string;
  isAddCard?: boolean;
}

interface GoalsTabProps {
  localColors: {
    primary: string;
    white: string;
    background: string;
  };
  onScrollEnableChange?: (enabled: boolean) => void;
  onTargetUpdated?: () => void;
}

let globalGoalsCache: Goal[] = [];
let globalTransactionsCache: any[] = [];

export function GoalsTab({ localColors, onScrollEnableChange, onTargetUpdated }: GoalsTabProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const ITEM_WIDTH = SCREEN_WIDTH - horizontalScale(48);
  const flatListRef = useRef<FlatList>(null);

  const [goals, setGoals] = useState<Goal[]>(globalGoalsCache);
  const [activeIndex, setActiveIndex] = useState(0);
  const [allTransactions, setAllTransactions] = useState<any[]>(globalTransactionsCache);
  const [editingTitle, setEditingTitle] = useState("");

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isTargetModalVisible, setIsTargetModalVisible] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const lastSyncedId = useRef<string | null>(null);

  const { convertToBase, currency, format, rates } = useCurrency();
  const { showAlert } = useAlert();
  const user = auth.currentUser;

  const currentGoal = goals[activeIndex] || null;

  useEffect(() => {
    if (onScrollEnableChange) {
      const isTargetSet = currentGoal && !currentGoal.isAddCard ? currentGoal.targetAmount > 0 : false;
      onScrollEnableChange(!!isTargetSet);
    }
    return () => {
      if (onScrollEnableChange) onScrollEnableChange(true);
    };
  }, [currentGoal, onScrollEnableChange]);

  const radius = moderateScale(90);
  const strokeWidth = moderateScale(12);
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "goals"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot) return;
      const list = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        const parseDate = (d: any) => d?.toDate ? d.toDate() : new Date(d?.seconds * 1000 || Date.now());
        return {
          id: doc.id,
          ...data,
          startDate: parseDate(data.startDate),
          deadline: parseDate(data.deadline),
          createdAt: data.createdAt
        } as Goal;
      });

      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || Date.now() / 1000 + 1000;
        const timeB = b.createdAt?.seconds || Date.now() / 1000 + 1000;
        return timeA - timeB;
      });
      setGoals(list);
      globalGoalsCache = list;
    }, (error) => console.error("Goals Snapshot Error:", error));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let queryStartDate = new Date();
    queryStartDate.setHours(0, 0, 0, 0);

    if (currentGoal && !currentGoal.isAddCard) {
      queryStartDate = currentGoal.startDate;
    }

    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      where("date", ">=", queryStartDate)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot) return;
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllTransactions(list);
      globalTransactionsCache = list;
    }, (error) => console.error("Transactions Snapshot Error:", error));
    return () => unsubscribe();
  }, [user, currentGoal?.id, currentGoal?.startDate]);

  useEffect(() => {
    if (currentGoal && !currentGoal.isAddCard) {
      if (currentGoal.id !== lastSyncedId.current) {
        setEditingTitle(currentGoal.title.toUpperCase());
        lastSyncedId.current = currentGoal.id;
      }
    } else {
      if (lastSyncedId.current !== 'static') {
        setEditingTitle("SAVING GOALS");
        lastSyncedId.current = 'static';
      }
    }
  }, [activeIndex, goals]);

  const handleUpdatePeriod = (s: Date, e: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (e <= s) {
      showAlert("Invalid Period", "Deadline must be after start date.", "alert");
      return;
    }
    if (e < today) {
      showAlert("Invalid Date", "You cannot set a deadline in the past.", "alert");
      return;
    }
    if (currentGoal) updateDoc(doc(db, "goals", currentGoal.id), { startDate: s, deadline: e });
  };
  const handleUpdateTarget = (a: number) => {
    if (currentGoal) {
      setLastSavedId(currentGoal.id);
      updateDoc(doc(db, "goals", currentGoal.id), { targetAmount: a, targetAmountUSD: convertToBase(a), currency: currency });
      onTargetUpdated?.();
      setTimeout(() => setLastSavedId(null), 2000);
    }
  };
  const handleAddNewGoal = () => {
    if (!user) return;

    const maxDots = Math.floor((ITEM_WIDTH - 16) / 14) + 1;
    const maxGoals = maxDots - 1;

    if (goals.length >= maxGoals) {
      showAlert("Limit Reached", `You cannot add more goals at the moment.`, "alert");
      return;
    }

    const s = new Date(); s.setHours(0, 0, 0, 0);
    const e = new Date(); e.setDate(e.getDate() + 30);
    setIsAddingGoal(true);
    addDoc(collection(db, "goals"), {
      userId: user.uid, title: "", targetAmount: 0, targetAmountUSD: 0, currency: currency, startDate: s, deadline: e, createdAt: serverTimestamp()
    }).finally(() => setIsAddingGoal(false));
  };
  const handleDeleteAll = async () => {
    if (!user || goals.length === 0) return;
    const batch = writeBatch(db);
    goals.forEach(g => {
      batch.delete(doc(db, "goals", g.id));
    });
    await batch.commit();
    setActiveIndex(0);
    flatListRef.current?.scrollToIndex({ index: 0, animated: true });
  };

  const handleResetGoal = () => {
    if (currentGoal) {
      const targetIndex = Math.max(0, activeIndex - 1);

      flatListRef.current?.scrollToIndex({ index: targetIndex, animated: true });
      setActiveIndex(targetIndex);

      setTimeout(() => {
        deleteDoc(doc(db, "goals", currentGoal.id));
      }, 400);
    }
  };

  const renderGoalItem = ({ item }: { item: Goal }) => {
    if (item.isAddCard) {
      return (
        <View style={{ width: ITEM_WIDTH, alignItems: 'center' }}>
          <View style={styles.ringContainer}>
            <Svg width={230} height={230} viewBox="0 0 220 220">
              <G rotation="-90" origin="110, 110">
                <Circle cx="110" cy="110" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />
                <Circle cx="110" cy="110" r={radius - 15} stroke="rgba(103, 232, 249, 0.2)" strokeWidth={2} strokeDasharray="6, 8" fill="none" />
              </G>
            </Svg>
            <TouchableOpacity style={styles.ringCenterText} onPress={handleAddNewGoal} activeOpacity={0.6}>
              <Plus color="#67E8F9" size={42} strokeWidth={2} />
              <Text style={[styles.ringGoalLabel, { marginTop: 15, color: '#67E8F9' }]}>ADD GOAL</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.motivationalText, { opacity: 0.6 }]}>
            <Text style={{ color: localColors.white, fontWeight: 'bold' }}>New Ambition?</Text>{"\n"}
            <Text style={{ fontSize: 12 }}>"The best way to predict the future is to create it."</Text>
          </Text>
        </View>
      );
    }

    let totalProfit = 0;
    let todayProfit = 0;
    const nowDay = new Date(); nowDay.setHours(0, 0, 0, 0);

    allTransactions.forEach(t => {
      const amount = (t.currency === currency) ? t.amount : ((t.amountUSD || (t.amount / (rates?.[t.currency] || 1))) * (rates?.[currency] || 1));
      const date = t.date?.toDate() || new Date(t.createdAt?.seconds * 1000 || Date.now());
      if (date >= item.startDate) {
        if (t.type === 'income') totalProfit += amount;
        else if (t.type === 'expense') totalProfit -= amount;
        if (date >= nowDay) {
          if (t.type === 'income') todayProfit += amount;
          else if (t.type === 'expense') todayProfit -= amount;
        }
      }
    });

    const iTarget = item.currency === currency ? item.targetAmount : ((item.targetAmountUSD || (item.targetAmount / (rates?.[item.currency] || 1))) * (rates?.[currency] || 1));
    const iProgress = iTarget > 0 ? Math.min(100, (totalProfit / iTarget) * 100) : 0;
    const iOffset = circumference - (circumference * iProgress / 100);
    const iIsTargetSet = item.targetAmount > 0;
    const iIsGoalReached = iIsTargetSet && iTarget > 0 && totalProfit >= iTarget;

    const now = new Date();
    const todayAtMidnight = new Date(); todayAtMidnight.setHours(0, 0, 0, 0);
    const todayForCounting = new Date(); todayForCounting.setHours(0, 0, 0, 0);
    const deadlineForCounting = new Date(item.deadline); deadlineForCounting.setHours(0, 0, 0, 0);
    
    const iTotalGoalDays = Math.max(1, Math.floor((deadlineForCounting.getTime() - item.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const iDaysLeft = Math.max(0, Math.floor((deadlineForCounting.getTime() - todayForCounting.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    const iIsUpcoming = item.startDate > todayAtMidnight;
    const iDaysUntilStart = iIsUpcoming ? Math.max(1, Math.floor((item.startDate.getTime() - todayAtMidnight.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    const iStartTime = item.startDate.getTime();
    const iElapsedDays = Math.max(1, Math.floor((now.getTime() - iStartTime) / (1000 * 60 * 60 * 24)) + 1);
    const iCurrentPace = totalProfit / iElapsedDays;

    const iRemaining = Math.max(0, iTarget - totalProfit);
    const iDaysUntilTarget = iCurrentPace > 0 ? Math.ceil(iRemaining / iCurrentPace) : Infinity;

    const iDailyTarget = iIsUpcoming ? iTarget / iTotalGoalDays : (iDaysLeft > 0 ? iRemaining / iDaysLeft : 0);

    const iIsAhead = iCurrentPace > 0 && iDaysUntilTarget < iDaysLeft;
    const iIsOnTrack = iCurrentPace > 0 && iDaysUntilTarget === iDaysLeft;
    const iDaysDiff = Math.abs(Math.round(iDaysLeft - iDaysUntilTarget));

    const iStatusMsg = (() => {
      if (iIsUpcoming) return `Goal starts in ${iDaysUntilStart} day${iDaysUntilStart !== 1 ? 's' : ''}. Get ready!`;
      if (totalProfit >= iTarget) return "Congratulations! Goal Accomplished!";
      if (iIsOnTrack) return "Perfectly on track! You'll reach target exactly on the deadline.";
      if (iIsAhead) return `Ahead of schedule! Estimated ${iDaysUntilTarget} days until reached (${iDaysDiff} days early).`;
      if (iDaysUntilTarget === Infinity) return "Behind schedule. Please increase your daily profit to see completion forecast.";
      return `Behind schedule. Estimated ${iDaysUntilTarget} days until reached (${iDaysDiff} days late).`;
    })();

    const isJustUpdated = lastSavedId === item.id;

    return (
      <View style={{ width: ITEM_WIDTH }}>
        <View style={styles.ringContainer}>
          <Svg width={230} height={230} viewBox="0 0 220 220">
            <G rotation="-90" origin="110, 110">
              <Circle cx="110" cy="110" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />
              <Circle cx="110" cy="110" r={radius} stroke="#67E8F9" strokeWidth={strokeWidth + 20} strokeDasharray={circumference} strokeDashoffset={iOffset} strokeLinecap="round" fill="none" opacity={0.03} />
              <Circle cx="110" cy="110" r={radius} stroke="#67E8F9" strokeWidth={strokeWidth + 14} strokeDasharray={circumference} strokeDashoffset={iOffset} strokeLinecap="round" fill="none" opacity={0.05} />
              <Circle cx="110" cy="110" r={radius} stroke="#67E8F9" strokeWidth={strokeWidth + 8} strokeDasharray={circumference} strokeDashoffset={iOffset} strokeLinecap="round" fill="none" opacity={0.1} />
              <Circle cx="110" cy="110" r={radius} stroke="#67E8F9" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={iOffset} strokeLinecap="round" fill="none" />
            </G>
          </Svg>
          <TouchableOpacity
            style={styles.ringCenterText}
            onPress={() => setIsTargetModalVisible(true)}
          >
            <Text style={styles.ringGoalLabel}>TARGET</Text>
            <Text style={{ ...styles.ringGoalValue, fontSize: iIsTargetSet ? 28 : 26 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{iIsTargetSet ? format(Math.round(iTarget), { compact: true, isConverted: true }).replace(/\.00$/, '') : "SET TARGET"}</Text>
            {iIsTargetSet && <Text style={styles.ringPercent}>{Math.round(iProgress)}%</Text>}
          </TouchableOpacity>
        </View>

        {iIsTargetSet && (
          <Animated.Text
            entering={isJustUpdated ? FadeInDown.delay(100).springify() : undefined}
            layout={LinearTransition}
            style={styles.motivationalText}
          >
            <Text style={{ color: localColors.white, fontWeight: 'bold' }}>{iIsUpcoming ? "Get ready for your goal!" : (totalProfit >= iTarget ? "Goal Accomplished!" : "You're nearly there!")}</Text>{"\n"}
            {totalProfit >= iTarget ? (
              <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Exceeded target by <Text style={{ color: '#6ee591', fontWeight: 'bold' }}>{format(Math.abs(totalProfit - iTarget), { isConverted: true })}</Text></Text>
            ) : (
              <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Only <Text style={{ color: '#67E8F9', fontWeight: 'bold' }}>{format(iTarget - totalProfit, { isConverted: true })}</Text> left to reach target.</Text>
            )}
          </Animated.Text>
        )}

        <Animated.View
          entering={isJustUpdated ? FadeInDown.delay(200).springify() : undefined}
          layout={LinearTransition}
        >
          <TouchableOpacity
            style={styles.summaryRow}
            onPress={() => {
              if (iIsTargetSet) setIsPickerVisible(true);
              else showAlert("Action Required", "Please set a target amount first by tapping the circle above.", "info");
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.goalStatusCard, iIsGoalReached && { borderColor: 'rgba(110, 229, 145, 0.2)', borderWidth: 2 }]}>
              <Text style={[styles.statusLabel, iIsGoalReached && { color: '#6ee591' }, (iIsTargetSet && iIsUpcoming) && { color: '#67E8F9' }]}>
                {iIsGoalReached ? 'GOAL COMPLETED' : (iIsTargetSet && iIsUpcoming ? 'UPCOMING GOAL' : 'FINAL COUNTDOWN')}
              </Text>
              <Text style={styles.statusValue}>
                {iIsTargetSet ? (iIsGoalReached ? 'Target Reached!' : (iIsUpcoming ? `Starts in ${iDaysUntilStart}d` : `${iDaysLeft} Days Left`)) : 'Select dates'}
              </Text>
              {iIsTargetSet && (
                <Text style={styles.periodLabel}>{item.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {item.deadline.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
              )}
              <View style={styles.goalStatusIconContainer}><View style={styles.goalStatusIconCircle}>{iIsGoalReached ? <Trophy color="#6ee591" size={28} /> : <Calendar color="#67E8F9" size={24} />}</View></View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {iIsTargetSet && (
          <Animated.View
            entering={isJustUpdated ? FadeInDown.delay(300).springify() : undefined}
            layout={LinearTransition}
          >
            <TouchableOpacity onPress={() => showAlert("Performance", `Today: ${format(todayProfit, { isConverted: true })}\nTarget: ${format(iDailyTarget, { isConverted: true })}`, "info")}>
              <View style={styles.performanceCard}>
                <View style={styles.perfHeader}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.perfLabel} numberOfLines={1} adjustsFontSizeToFit>TODAY'S PERFORMANCE</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                      <Text style={[styles.perfValue, { color: todayProfit < 0 ? '#ff4d4d' : '#6ee591', flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                        {format(todayProfit, { compact: true, threshold: 10000, isConverted: true })}
                      </Text>
                      {todayProfit < 0 ? <TrendingDown color="#ff4d4d" size={16} style={{ marginLeft: 4, flexShrink: 0 }} /> : <TrendingUp color="#6ee591" size={16} style={{ marginLeft: 4, flexShrink: 0 }} />}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', flex: 0.9, marginLeft: 10 }}>
                    <Text style={styles.perfTargetLabel} numberOfLines={1} adjustsFontSizeToFit>DAILY TARGET</Text>
                    <Text style={[styles.perfTargetValue, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                      {iDaysLeft > 0 ? format(iDailyTarget, { compact: true, threshold: 10000, isConverted: true }) : '--'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.perfStatusBox, { backgroundColor: iIsGoalReached ? 'rgba(110, 229, 145, 0.08)' : (iIsUpcoming ? 'rgba(103, 232, 249, 0.08)' : (iIsAhead ? 'rgba(110, 229, 145, 0.05)' : 'rgba(255, 77, 77, 0.1)')), borderLeftColor: iIsGoalReached ? '#6ee591' : (iIsUpcoming ? '#67E8F9' : (iIsAhead ? '#6ee591' : '#ff4d4d')) }]}>
                  <View style={styles.perfStatusContent}>
                    <Text style={[styles.perfStatusText, (!iIsAhead && !iIsGoalReached && !iIsUpcoming) && { color: '#ff4d4d' }, iIsUpcoming && { color: '#67E8F9' }]}>{iStatusMsg}</Text>
                  </View>
                </View>

              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
        {iIsTargetSet && (
          <Text style={styles.forecastCaption}>
            *Estimated based on daily average since goal start
          </Text>
        )}

      </View>
    );
  };

  const displayGoals = [...goals, { id: `add-card-${goals.length}`, isAddCard: true } as Goal];

  return (
    <View style={styles.viewContainer}>
      <View style={styles.headerRow}>
        {currentGoal && !currentGoal.isAddCard ? (
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { opacity: 0 }]} numberOfLines={1}>
              {` ${(editingTitle || "NAME YOUR GOAL").toUpperCase()} `}
            </Text>
            <TextInput
              style={[styles.headerTitle, styles.absoluteInput]}
              value={editingTitle}
              onChangeText={setEditingTitle}
              onEndEditing={() => {
                const final = editingTitle.trim().toUpperCase();
                if (final.length === 0) {
                  setEditingTitle(currentGoal.title.toUpperCase() || "");
                  return;
                }
                if (currentGoal && final !== currentGoal.title.toUpperCase()) {
                  const isDuplicate = goals.some(g => g.id !== currentGoal.id && g.title.toUpperCase() === final);
                  if (isDuplicate) {
                    showAlert("Duplicate Title", "You already have a goal with this name.", "alert");
                    setEditingTitle(currentGoal.title.toUpperCase());
                    return;
                  }
                  updateDoc(doc(db, "goals", currentGoal.id), { title: final });
                  setEditingTitle(final);
                }
              }}
              placeholder="NAME YOUR GOAL"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="characters"
              maxLength={30}
              multiline={false}
            />
          </View>
        ) : (
          <TouchableOpacity
            onLongPress={() => {
              if (goals.length > 0) {
                showAlert(
                  "Clear All Goals",
                  `Are you sure you want to delete ALL ${goals.length} goals?`,
                  "alert",
                  handleDeleteAll,
                  true
                );
              }
            }}
            delayLongPress={1000}
          >
            <Text style={styles.headerTitleStatic}>SAVING GOALS</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.dotsRow}>{displayGoals.map((_, i) => <View key={i} style={[styles.dot, activeIndex === i && styles.dotActive]} />)}</View>
      <FlatList
        ref={flatListRef}
        data={displayGoals}
        renderItem={renderGoalItem}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / ITEM_WIDTH))}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
      <DatePicker isVisible={isPickerVisible} onClose={() => setIsPickerVisible(false)} initialStartDate={currentGoal?.startDate} initialDeadline={currentGoal?.deadline} onSave={handleUpdatePeriod} />
      <TargetInputModal isVisible={isTargetModalVisible} onClose={() => setIsTargetModalVisible(false)} initialAmount={currentGoal?.targetAmount} onSave={handleUpdateTarget} onReset={handleResetGoal} />
    </View>
  );
}

const styles = StyleSheet.create({
  viewContainer: { flex: 1 },
  headerRow: {
    marginBottom: 10,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  headerTitleContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    height: 32,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  absoluteInput: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    textAlign: 'center',
    height: 32,
    lineHeight: Math.round(moderateScale(13)) * 1.5
  },
  headerTitle: {
    fontSize: Math.round(moderateScale(13)),
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1.2,
    fontFamily: 'Inter_700Bold',
    padding: 0,
    lineHeight: Math.round(moderateScale(13)) * 1.5
  },
  headerTitleStatic: {
    fontSize: Math.round(moderateScale(13)),
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    letterSpacing: 1.2,
    fontFamily: 'Inter_600SemiBold'
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 15 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  dotActive: { width: 16, backgroundColor: '#3b82f6ff' },
  ringContainer: { alignItems: 'center', justifyContent: 'center', height: horizontalScale(230), position: 'relative' },
  ringCenterText: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  ringGoalLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontFamily: 'Inter_600SemiBold' },
  ringGoalValue: { fontSize: 28, width: 165, textAlign: 'center', fontFamily: 'Manrope_800ExtraBold', color: '#FFFFFF' },
  ringPercent: { color: '#67E8F9', fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  motivationalText: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginBottom: 24, fontSize: 13, lineHeight: 20 },
  summaryRow: { marginBottom: 24 },
  goalStatusCard: { backgroundColor: 'rgba(28, 29, 31, 0.8)', borderRadius: 24, padding: 18, minHeight: 130, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', position: 'relative', overflow: 'hidden' },
  deleteTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.12)',
    backgroundColor: 'rgba(255, 77, 77, 0.04)',
    alignSelf: 'center',
    marginBottom: 10
  },
  deleteText: {
    color: 'rgba(255, 77, 77, 0.5)',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    marginLeft: 8
  },
  forecastCaption: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
    fontFamily: 'Inter_500Medium',
    paddingHorizontal: 20
  },
  statusLabel: {
    fontSize: moderateScale(11),
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: horizontalScale(4),
    fontFamily: 'Inter_600SemiBold',
  },
  statusValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(20),
    color: '#FFFFFF',
  },
  periodLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
  goalStatusIconContainer: { position: 'absolute', right: -20, width: 140, alignItems: 'center' },
  goalStatusIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  performanceCard: { backgroundColor: 'rgba(28, 29, 31, 0.8)', borderRadius: 24, padding: 20, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  perfLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Manrope_700Bold' },
  perfValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 26 },
  perfTargetLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter_600SemiBold' },
  perfTargetValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 21, color: '#FFFFFF', marginTop: 4 },
  perfStatusBox: { marginTop: 24, borderRadius: 16, borderLeftWidth: 4, overflow: 'hidden' },
  perfStatusContent: { padding: 20 },
  perfStatusText: { fontSize: 13, color: '#FFFFFF', lineHeight: 20, fontFamily: 'Inter_600SemiBold' },
});
