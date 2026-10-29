import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { horizontalScale, moderateScale } from '../utils/scaling';

export function TransactionSkeletonRow() {
  const opacity = useSharedValue(0.28);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.72, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.28, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.cardMainRow}>
        <View style={styles.iconCircleSkeleton} />
        <View style={styles.infoSkeleton}>
          <View style={styles.titleSkeleton} />
          <View style={styles.subSkeleton} />
        </View>
        <View style={styles.amountSkeleton} />
      </View>
    </Animated.View>
  );
}

export function TransactionSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <TransactionSkeletonRow key={`skeleton-${idx}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingTop: horizontalScale(6),
    paddingBottom: horizontalScale(20),
  },
  card: {
    backgroundColor: '#1c1e24',
    padding: horizontalScale(14),
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: horizontalScale(10),
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircleSkeleton: {
    width: horizontalScale(36),
    height: horizontalScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: horizontalScale(10),
  },
  infoSkeleton: {
    flex: 1,
    marginRight: horizontalScale(10),
  },
  titleSkeleton: {
    height: horizontalScale(14),
    width: '58%',
    borderRadius: moderateScale(7),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: horizontalScale(8),
  },
  subSkeleton: {
    height: horizontalScale(10),
    width: '36%',
    borderRadius: moderateScale(5),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  amountSkeleton: {
    height: horizontalScale(16),
    width: horizontalScale(68),
    borderRadius: moderateScale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
});
