import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from '@react-native-firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useCurrency } from '../context/CurrencyContext';
import { parseCompatibleDate, useTransactions } from '../context/TransactionsContext';
import { auth, db } from '../firebaseConfig';
import { styles } from '../styles/goals.styles';
import { computeGoalMetrics, isGoalActive } from '../utils/goalMetrics';
import { horizontalScale, moderateScale } from '../utils/scaling';
import { DatePicker } from './DatePicker';
import { AddGoalCard } from './goals/AddGoalCard';
import { GoalCardItem } from './goals/GoalCardItem';
import { Goal } from './goals/types';
import { TargetInputModal } from './TargetInputModal';

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
  const [goalTransactions, setGoalTransactions] = useState<any[]>(globalTransactionsCache);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingTitle, setEditingTitle] = useState("");

  const goalsNeedingTransactions = goals.filter((g) => {
    if (g.isAddCard || !g.startDate) return false;
    if (isGoalActive(g)) return true;
    if (!g.initialNetCalibrated) return true;
    return false;
  });

  const earliestDateString = goalsNeedingTransactions.length > 0
    ? (() => {
        const d = new Date(Math.min(...goalsNeedingTransactions.map((g) => g.startDate.getTime())));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })()
    : null;

  useEffect(() => {
    if (!auth.currentUser || !earliestDateString) {
      if (!earliestDateString) {
        setGoalTransactions([]);
        globalTransactionsCache = [];
      }
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      where('dateString', '>=', earliestDateString)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot) {
          setGoalTransactions([]);
          globalTransactionsCache = [];
          return;
        }
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const rawDate = data.date || data.createdAt;
          return {
            id: docSnap.id,
            ...data,
            date: parseCompatibleDate(rawDate),
          };
        });
        globalTransactionsCache = list;
        setGoalTransactions(list);
      },
      (error) => {
        console.warn('[GoalsTab] Filtered transactions subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser?.uid, earliestDateString]);

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isTargetModalVisible, setIsTargetModalVisible] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const lastSyncedId = useRef<string | null>(null);

  const { convertToBase, currency, format, rates } = useCurrency();
  const { userStats } = useTransactions();
  const { showAlert } = useAlert();
  const user = auth.currentUser;

  const currentNetUSD = (userStats?.totalIncomeUSD || 0) - (userStats?.totalExpenseUSD || 0);

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
          completedAt: data.completedAt ? parseDate(data.completedAt) : undefined,
          createdAt: data.createdAt,
          initialNetUSD: data.initialNetUSD,
          initialNetCalibrated: data.initialNetCalibrated,
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

  const markedCompletedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || goals.length === 0 || goalTransactions.length === 0) return;

    goals.forEach((goal) => {
      if (goal.completedAt && goal.id) {
        markedCompletedRef.current.add(goal.id);
        return;
      }

      if (
        goal.isAddCard ||
        !goal.id ||
        markedCompletedRef.current.has(goal.id) ||
        !goal.targetAmount ||
        goal.targetAmount <= 0
      ) {
        return;
      }

      const gTarget = goal.currency === currency
        ? goal.targetAmount
        : ((goal.targetAmountUSD || (goal.targetAmount / (rates?.[goal.currency] || 1))) * (rates?.[currency] || 1));

      let profit = 0;
      goalTransactions.forEach((t) => {
        const amount = (t.currency === currency)
          ? t.amount
          : ((t.amountUSD || (t.amount / (rates?.[t.currency] || 1))) * (rates?.[currency] || 1));
        const date = t.date || t.createdAt || new Date();
        if (date >= goal.startDate) {
          if (t.type === 'income') profit += amount;
          else if (t.type === 'expense') profit -= amount;
        }
      });

      if (profit >= gTarget && gTarget > 0) {
        markedCompletedRef.current.add(goal.id);
        const updates: any = {
          completedAt: serverTimestamp(),
        };
        if (!goal.initialNetCalibrated) {
          const profitUSD = currency === 'USD' ? profit : profit / (rates?.[currency] || 1);
          updates.initialNetUSD = Math.round((currentNetUSD - profitUSD) * 100) / 100;
          updates.initialNetCalibrated = true;
        }
        updateDoc(doc(db, "goals", goal.id), updates).catch((err) => {
          markedCompletedRef.current.delete(goal.id);
          console.warn('[GoalsTab] Error marking goal completedAt:', err);
        });
      } else if (profit < gTarget && goal.completedAt) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadline = new Date(goal.deadline);
        deadline.setHours(0, 0, 0, 0);
        if (deadline >= today) {
          markedCompletedRef.current.delete(goal.id);
          updateDoc(doc(db, "goals", goal.id), { completedAt: null }).catch(() => {});
        }
      }
    });
  }, [user, goals, goalTransactions, currency, rates]);



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
    if (currentGoal) {
      const isStartDateChanged = s.getTime() !== currentGoal.startDate.getTime();
      const updates: any = {
        startDate: s,
        deadline: e,
        completedAt: null,
      };
      if (isStartDateChanged) {
        updates.initialNetCalibrated = false;
      }
      updateDoc(doc(db, "goals", currentGoal.id), updates);
    }
  };
  const handleUpdateTarget = (a: number) => {
    if (currentGoal) {
      setLastSavedId(currentGoal.id);
      const updates: any = {
        targetAmount: a,
        targetAmountUSD: convertToBase(a),
        currency: currency,
        completedAt: null,
      };
      if (currentGoal.initialNetUSD === undefined) {
        updates.initialNetUSD = Math.round(currentNetUSD * 100) / 100;
      }
      updateDoc(doc(db, "goals", currentGoal.id), updates);
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
      userId: user.uid,
      title: "",
      targetAmount: 0,
      targetAmountUSD: 0,
      currency: currency,
      startDate: s,
      deadline: e,
      initialNetUSD: Math.round(currentNetUSD * 100) / 100,
      initialNetCalibrated: true,
      createdAt: serverTimestamp()
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
        <AddGoalCard
          itemWidth={ITEM_WIDTH}
          radius={radius}
          strokeWidth={strokeWidth}
          onAddNewGoal={handleAddNewGoal}
          whiteColor={localColors.white}
        />
      );
    }

    const metrics = computeGoalMetrics({
      item,
      goalTransactions,
      currentNetUSD,
      currency,
      rates,
      circumference,
    });

    if (metrics.shouldCalibrateInitialNet && item.id && user) {
      updateDoc(doc(db, "goals", item.id), {
        initialNetUSD: metrics.calibratedInitialNetUSD,
        initialNetCalibrated: true,
      }).catch((err) => console.warn('[GoalsTab] Calibration save error:', err));
    }

    return (
      <GoalCardItem
        item={item}
        itemWidth={ITEM_WIDTH}
        radius={radius}
        strokeWidth={strokeWidth}
        circumference={circumference}
        metrics={metrics}
        isJustUpdated={lastSavedId === item.id}
        whiteColor={localColors.white}
        format={format}
        onOpenTargetModal={() => setIsTargetModalVisible(true)}
        onOpenPickerModal={() => setIsPickerVisible(true)}
        showAlert={showAlert}
      />
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

