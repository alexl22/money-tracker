import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';

interface AnimatedAmountProps {
  value: number;
  format: (amount: number, options?: any) => string;
  style?: any;
  options?: any;
}

export function AnimatedAmount({ value, format, style, options = {} }: AnimatedAmountProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration: 400 });
  }, [value]);

  useAnimatedReaction(
    () => animatedValue.value,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplayValue)(current);
      }
    }
  );

  return (
    <Text style={style} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
      {format(displayValue, options)}
    </Text>
  );
}
