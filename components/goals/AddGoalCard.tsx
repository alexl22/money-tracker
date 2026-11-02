import { Plus } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { styles } from '../../styles/goals.styles';

interface AddGoalCardProps {
  itemWidth: number;
  radius: number;
  strokeWidth: number;
  onAddNewGoal: () => void;
  whiteColor: string;
}

export function AddGoalCard({
  itemWidth,
  radius,
  strokeWidth,
  onAddNewGoal,
  whiteColor,
}: AddGoalCardProps) {
  return (
    <View style={{ width: itemWidth, alignItems: 'center' }}>
      <View style={styles.ringContainer}>
        <Svg width={230} height={230} viewBox="0 0 220 220">
          <G rotation="-90" origin="110, 110">
            <Circle cx="110" cy="110" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />
            <Circle cx="110" cy="110" r={radius - 15} stroke="rgba(103, 232, 249, 0.2)" strokeWidth={2} strokeDasharray="6, 8" fill="none" />
          </G>
        </Svg>
        <TouchableOpacity style={styles.ringCenterText} onPress={onAddNewGoal} activeOpacity={0.6}>
          <Plus color="#67E8F9" size={42} strokeWidth={2} />
          <Text style={[styles.ringGoalLabel, { marginTop: 15, color: '#67E8F9' }]}>ADD GOAL</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.motivationalText, { opacity: 0.6 }]}>
        <Text style={{ color: whiteColor, fontWeight: 'bold' }}>New Ambition?</Text>{"\n"}
        <Text style={{ fontSize: 12 }}>"The best way to predict the future is to create it."</Text>
      </Text>
    </View>
  );
}
