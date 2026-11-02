import { Calendar, TrendingDown, TrendingUp, Trophy } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { styles } from '../../styles/goals.styles';
import { formatDays, GoalMetrics } from '../../utils/goalMetrics';
import { Goal } from './types';

interface GoalCardItemProps {
  item: Goal;
  itemWidth: number;
  radius: number;
  strokeWidth: number;
  circumference: number;
  metrics: GoalMetrics;
  isJustUpdated: boolean;
  whiteColor: string;
  format: (amount: number, options?: any) => string;
  onOpenTargetModal: () => void;
  onOpenPickerModal: () => void;
  showAlert: (title: string, message: string, type: any) => void;
}

export function GoalCardItem({
  item,
  itemWidth,
  radius,
  strokeWidth,
  circumference,
  metrics,
  isJustUpdated,
  whiteColor,
  format,
  onOpenTargetModal,
  onOpenPickerModal,
  showAlert,
}: GoalCardItemProps) {
  const {
    totalProfit,
    todayProfit,
    iTarget,
    iIsTargetSet,
    isGoalAccomplished,
    iProgress,
    iOffset,
    iDaysLeft,
    iIsUpcoming,
    iDaysUntilStart,
    iDailyTarget,
    iIsAhead,
    iStatusMsg,
    isGoalFinished,
    displayTotalAchieved,
  } = metrics;

  return (
    <View style={{ width: itemWidth }}>
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
          onPress={onOpenTargetModal}
        >
          <Text style={styles.ringGoalLabel}>TARGET</Text>
          <Text style={{ ...styles.ringGoalValue, fontSize: iIsTargetSet ? 28 : 26 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            {iIsTargetSet ? format(Math.round(iTarget), { compact: true, isConverted: true }).replace(/\.00$/, '') : "SET TARGET"}
          </Text>
          {iIsTargetSet && <Text style={styles.ringPercent}>{Math.round(iProgress)}%</Text>}
        </TouchableOpacity>
      </View>

      {iIsTargetSet && (
        <Animated.Text
          entering={isJustUpdated ? FadeInDown.delay(100).springify() : undefined}
          layout={LinearTransition}
          style={styles.motivationalText}
        >
          <Text style={{ color: whiteColor, fontWeight: 'bold' }}>
            {iIsUpcoming ? "Get ready for your goal!" : (isGoalAccomplished ? "Goal Accomplished!" : "You're nearly there!")}
          </Text>{"\n"}
          {isGoalAccomplished ? (
            <Text style={{ color: 'rgba(255,255,255,0.4)' }}>
              {totalProfit >= iTarget ? (
                <>Exceeded target by <Text style={{ color: '#6ee591', fontWeight: 'bold' }}>{format(Math.abs(totalProfit - iTarget), { isConverted: true })}</Text></>
              ) : (
                <Text style={{ color: '#6ee591', fontWeight: 'bold' }}>Target reached successfully!</Text>
              )}
            </Text>
          ) : (
            <Text style={{ color: 'rgba(255,255,255,0.4)' }}>
              Only <Text style={{ color: '#67E8F9', fontWeight: 'bold' }}>{format(iTarget - totalProfit, { isConverted: true })}</Text> left to reach target.
            </Text>
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
            if (iIsTargetSet) onOpenPickerModal();
            else showAlert("Action Required", "Please set a target amount first by tapping the circle above.", "info");
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.goalStatusCard, isGoalAccomplished && { borderColor: 'rgba(110, 229, 145, 0.2)', borderWidth: 2 }]}>
            <Text style={[styles.statusLabel, isGoalAccomplished && { color: '#6ee591' }, (iIsTargetSet && iIsUpcoming) && { color: '#67E8F9' }]}>
              {isGoalAccomplished ? 'GOAL COMPLETED' : (iIsTargetSet && iIsUpcoming ? 'UPCOMING GOAL' : 'FINAL COUNTDOWN')}
            </Text>
            <Text style={styles.statusValue}>
              {iIsTargetSet ? (isGoalAccomplished ? 'Target Reached!' : (iIsUpcoming ? `Starts in ${formatDays(iDaysUntilStart, true)}` : `${formatDays(iDaysLeft, true)} Left`)) : 'Select dates'}
            </Text>
            {iIsTargetSet && (
              <Text style={styles.periodLabel}>
                {item.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {item.deadline.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </Text>
            )}
            <View style={styles.goalStatusIconContainer}>
              <View style={styles.goalStatusIconCircle}>
                {isGoalAccomplished ? <Trophy color="#6ee591" size={28} /> : <Calendar color="#67E8F9" size={24} />}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {iIsTargetSet && (
        <Animated.View
          entering={isJustUpdated ? FadeInDown.delay(300).springify() : undefined}
          layout={LinearTransition}
        >
          {isGoalFinished ? (
            <TouchableOpacity onPress={() => showAlert("Goal Results", `Total Achieved: ${format(displayTotalAchieved, { isConverted: true })}\nTarget: ${format(iTarget, { isConverted: true })}\nStatus: ${iStatusMsg}`, "info")}>
              <View style={[styles.performanceCard, isGoalAccomplished && { borderColor: 'rgba(110, 229, 145, 0.3)' }]}>
                <View style={styles.perfHeader}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={[styles.perfLabel, isGoalAccomplished && { color: '#6ee591' }]} numberOfLines={1} adjustsFontSizeToFit>
                      {isGoalAccomplished ? 'TARGET ACHIEVED' : 'TOTAL ACHIEVED'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                      <Text style={[styles.perfValue, { color: (isGoalAccomplished || totalProfit >= 0) ? '#6ee591' : '#ff4d4d', flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                        {format(displayTotalAchieved, { compact: true, threshold: 10000, isConverted: true })}
                      </Text>
                      {isGoalAccomplished && <Trophy color="#6ee591" size={18} style={{ marginLeft: 6, flexShrink: 0 }} />}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', flex: 0.9, marginLeft: 10 }}>
                    <Text style={styles.perfTargetLabel} numberOfLines={1} adjustsFontSizeToFit>
                      {isGoalAccomplished ? (totalProfit >= iTarget ? 'EXCEEDED BY' : 'STATUS') : 'SHORTFALL'}
                    </Text>
                    <Text style={[styles.perfTargetValue, { color: isGoalAccomplished ? '#6ee591' : '#ff4d4d', flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                      {isGoalAccomplished
                        ? (totalProfit >= iTarget
                          ? `+${format(Math.abs(totalProfit - iTarget), { compact: true, threshold: 10000, isConverted: true })}`
                          : 'COMPLETED')
                        : `-${format(Math.abs(iTarget - totalProfit), { compact: true, threshold: 10000, isConverted: true })}`}
                    </Text>
                  </View>
                </View>
                <View style={[styles.perfStatusBox, { backgroundColor: isGoalAccomplished ? 'rgba(110, 229, 145, 0.08)' : 'rgba(255, 77, 77, 0.1)', borderLeftColor: isGoalAccomplished ? '#6ee591' : '#ff4d4d' }]}>
                  <View style={styles.perfStatusContent}>
                    <Text style={[styles.perfStatusText, isGoalAccomplished ? { color: '#6ee591' } : { color: '#ff4d4d' }]}>{iStatusMsg}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
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
                <View style={[styles.perfStatusBox, { backgroundColor: iIsUpcoming ? 'rgba(103, 232, 249, 0.08)' : (iIsAhead ? 'rgba(110, 229, 145, 0.05)' : 'rgba(255, 77, 77, 0.1)'), borderLeftColor: iIsUpcoming ? '#67E8F9' : (iIsAhead ? '#6ee591' : '#ff4d4d') }]}>
                  <View style={styles.perfStatusContent}>
                    <Text style={[styles.perfStatusText, (!iIsAhead && !iIsUpcoming) && { color: '#ff4d4d' }, iIsUpcoming && { color: '#67E8F9' }]}>{iStatusMsg}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {iIsTargetSet && !isGoalFinished && (
        <Text style={styles.forecastCaption}>
          *Estimated based on daily average since goal start
        </Text>
      )}
    </View>
  );
}
