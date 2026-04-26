import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from '@react-native-firebase/firestore';
import { Calendar, Plus, TrendingDown, TrendingUp, Trophy } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
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
}

let globalGoalsCache: Goal[] = [];
let globalTransactionsCache: any[] = [];

export function GoalsTab({ localColors }: GoalsTabProps) {
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
  
  const { convertToBase, currency, format, rates } = useCurrency();
  const { showAlert } = useAlert();
  const user = auth.currentUser;

  const currentGoal = goals[activeIndex] || null;

  const radius = moderateScale(90);
  const strokeWidth = moderateScale(12);
  const circumference = 2 * Math.PI * radius;

  // 1. Fetch Goals
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
  }, [user, isAddingGoal, goals.length]);

  // 2. Fetch ALL Transactions
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot) return;
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllTransactions(list);
      globalTransactionsCache = list;
    }, (error) => console.error("Transactions Snapshot Error:", error));
    return () => unsubscribe();
  }, [user]);

  // 3. Sync editing title for in-place edit
  useEffect(() => {
    if (currentGoal && !currentGoal.isAddCard) {
      setEditingTitle(currentGoal.title.toUpperCase());
    } else {
      setEditingTitle("SAVING GOALS");
    }
  }, [activeIndex, goals]);

  const handleUpdatePeriod = (s: Date, e: Date) => {
    if (currentGoal) updateDoc(doc(db, "goals", currentGoal.id), { startDate: s, deadline: e });
  };
  const handleUpdateTarget = (a: number) => {
    if (currentGoal) updateDoc(doc(db, "goals", currentGoal.id), { targetAmount: a, targetAmountUSD: convertToBase(a), currency: currency });
  };
  const handleAddNewGoal = () => {
    if (!user) return;
    const s = new Date(); s.setHours(0,0,0,0);
    const e = new Date(); e.setMonth(e.getMonth() + 1);
    setIsAddingGoal(true);
    addDoc(collection(db, "goals"), {
      userId: user.uid, title: "", targetAmount: 0, targetAmountUSD: 0, currency: currency, startDate: s, deadline: e, createdAt: serverTimestamp()
    });
  };
  const handleResetGoal = () => {
    if (currentGoal) {
      deleteDoc(doc(db, "goals", currentGoal.id)).then(() => {
        setActiveIndex(goals.length - 1 );
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: goals.length -1, animated: true });
        }, 100);
      });
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
    const nowDay = new Date(); nowDay.setHours(0,0,0,0);
    
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
    const todayAtMidnight = new Date(); todayAtMidnight.setHours(0,0,0,0);
    const iIsUpcoming = item.startDate > todayAtMidnight;
    const iDaysUntilStart = iIsUpcoming ? Math.ceil((item.startDate.getTime() - todayAtMidnight.getTime()) / (1000*60*60*24)) : 0;
    const iDaysLeft = Math.max(0, Math.ceil((item.deadline.getTime() - now.getTime()) / (1000*60*60*24)));

    const iStartTime = item.startDate.getTime();
    const iElapsedDays = Math.max(1, Math.ceil((now.getTime() - iStartTime) / (1000*60*60*24)));
    const iCurrentPace = totalProfit / iElapsedDays;
    const iRemaining = iTarget - totalProfit;
    const iDaysUntilTarget = iCurrentPace > 0 ? Math.ceil(iRemaining / iCurrentPace) : Infinity;
    const iTotalGoalDays = Math.max(1, Math.ceil((item.deadline.getTime() - item.startDate.getTime()) / (1000*60*60*24)));
    const iDailyTarget = iIsUpcoming ? iTarget / iTotalGoalDays : (iDaysLeft > 0 ? Math.max(0, iRemaining / iDaysLeft) : 0);

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

    return (
      <View style={{ width: ITEM_WIDTH }}>
        <View style={styles.ringContainer}>
          <Svg width={230} height={230} viewBox="0 0 220 220">
            <G rotation="-90" origin="110, 110">
              <Circle cx="110" cy="110" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />
              <Circle cx="110" cy="110" r={radius} stroke="#67E8F9" strokeWidth={strokeWidth+20} strokeDasharray={circumference} strokeDashoffset={iOffset} strokeLinecap="round" fill="none" opacity={0.03} />
              <Circle cx="110" cy="110" r={radius} stroke="#67E8F9" strokeWidth={strokeWidth+14} strokeDasharray={circumference} strokeDashoffset={iOffset} strokeLinecap="round" fill="none" opacity={0.05} />
              <Circle cx="110" cy="110" r={radius} stroke="#67E8F9" strokeWidth={strokeWidth+8} strokeDasharray={circumference} strokeDashoffset={iOffset} strokeLinecap="round" fill="none" opacity={0.1} />
              <Circle cx="110" cy="110" r={radius} stroke="#67E8F9" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={iOffset} strokeLinecap="round" fill="none" />
            </G>
          </Svg>
          <TouchableOpacity style={styles.ringCenterText} onPress={() => setIsTargetModalVisible(true)}>
            <Text style={styles.ringGoalLabel}>TARGET</Text>
            <Text style={{ ...styles.ringGoalValue, fontSize: iIsTargetSet ? 28 : 26 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{iIsTargetSet ? format(iTarget, { compact: true, isConverted: true }) : "SET TARGET"}</Text>
            {iIsTargetSet && <Text style={styles.ringPercent}>{Math.round(iProgress)}%</Text>}
          </TouchableOpacity>
        </View>

        {iIsTargetSet && (
          <Text style={styles.motivationalText}>
            <Text style={{ color: localColors.white, fontWeight: 'bold' }}>{iIsUpcoming ? "Get ready for your goal!" : (totalProfit >= iTarget ? "Goal Accomplished!" : "You're nearly there!")}</Text>{"\n"}
            {totalProfit >= iTarget ? (
                <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Exceeded target by <Text style={{ color: '#6ee591', fontWeight: 'bold' }}>{format(Math.abs(totalProfit - iTarget), { isConverted: true })}</Text></Text>
            ) : (
                <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Only <Text style={{ color: '#67E8F9', fontWeight: 'bold' }}>{format(iTarget - totalProfit, { isConverted: true })}</Text> left to reach target.</Text>
            )}
          </Text>
        )}

       
        <TouchableOpacity 
          style={styles.summaryRow} 
          onPress={() => {
            if (iIsTargetSet) setIsPickerVisible(true);
            else showAlert("Action Required", "Please set a target amount first by tapping the circle above.", "info");
          }} 
          activeOpacity={0.7}
        >
          <View style={[styles.goalStatusCard, iIsGoalReached && { borderColor: 'rgba(110, 229, 145, 0.2)', borderWidth: 2 }]}>
            <Text style={[styles.statusLabel, iIsGoalReached && { color: '#6ee591' }]}>{iIsGoalReached ? 'GOAL COMPLETED' : 'FINAL COUNTDOWN'}</Text>
            <Text style={styles.statusValue}>{iIsTargetSet ? (iIsGoalReached ? 'Target Reached!' : `${iDaysLeft} Days Left`) : 'Select dates'}</Text>
            <Text style={styles.periodLabel}>{item.startDate.toLocaleDateString('en-GB', {day:'2-digit', month:'short'})} - {item.deadline.toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}</Text>
            <View style={styles.goalStatusIconContainer}><View style={styles.goalStatusIconCircle}>{iIsGoalReached ? <Trophy color="#6ee591" size={28} /> : <Calendar color="#67E8F9" size={24} />}</View></View>
          </View>
        </TouchableOpacity>
       

        {iIsTargetSet && (
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
            <TextInput
              style={styles.headerTitle}
              value={editingTitle}
              onChangeText={setEditingTitle}
              onEndEditing={() => {
                  if (editingTitle.trim() !== currentGoal.title.toUpperCase()) {
                      updateDoc(doc(db, "goals", currentGoal.id), { title: editingTitle.trim() });
                  }
              }}
              placeholder="NAME YOUR GOAL"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="characters"
              maxLength={30}
            />
          </View>
        ) : (
          <Text style={styles.headerTitleStatic}>SAVING GOALS</Text>
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
    alignItems: 'center'
  },
  headerTitleContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 100
  },
  headerTitle: { 
    fontSize: 12.5, 
    color: '#FFFFFF', 
    textAlign: 'center',
    letterSpacing: 1.2, 
    fontFamily: 'Inter_700Bold',
    padding: 0
  },
  headerTitleStatic: { 
    fontSize: 12.5, 
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
  goalStatusCard: { backgroundColor: '#161618', borderRadius: 24, padding: 18, minHeight: 130, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' },
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
  performanceCard: { backgroundColor: '#161618', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  perfLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Manrope_700Bold' },
  perfValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 26 },
  perfTargetLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter_600SemiBold' },
  perfTargetValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 21, color: '#FFFFFF', marginTop: 4 },
  perfStatusBox: { marginTop: 24, borderRadius: 16, borderLeftWidth: 4, overflow: 'hidden' },
  perfStatusContent: { padding: 20 },
  perfStatusText: { fontSize: 13, color: '#FFFFFF', lineHeight: 20, fontFamily: 'Inter_600SemiBold' },
});
