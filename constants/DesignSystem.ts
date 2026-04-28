import { horizontalScale, moderateScale } from '../utils/scaling';

export const Colors = {
  background: '#0b0c14',
  primary: '#6ee591',
  primaryContainer: '#50c878',
  onPrimary: '#003919',
  onPrimaryContainer: '#005025',
  primaryFixed: '#83fba5',
  secondary: '#ffb59c',
  secondaryContainer: '#8e2c01',
  onSecondaryContainer: '#ffaa8d',
  tertiary: '#90d7f4',
  tertiaryContainer: '#74bbd8',
  onTertiary: '#003544',
  surface: '#131313',
  onSurface: '#e5e2e1',
  surfaceContainerLow: '#1c1b1b',
  surfaceContainerHigh: '#2a2a2a',
  surfaceContainerHighest: '#353534',
  surfaceVariant: '#353534',
  outlineVariant: 'rgba(62, 74, 63, 0.2)', 
  white: '#FFFFFF',
};

export const Typography = {
  displayLg: {
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(56),
    color: Colors.white,
  },
  headlineMd: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: moderateScale(28),
    color: Colors.white,
  },
  titleSm: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(16),
    color: Colors.white,
  },
  labelSm: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(11),
    color: 'rgba(255, 255, 255, 0.6)',
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(14),
    color: Colors.white,
  }
};

export const Spacing = {
  xs: horizontalScale(4),
  sm: horizontalScale(8),
  md: horizontalScale(16),
  lg: horizontalScale(24),
  xl: horizontalScale(32),
  xxl: horizontalScale(48),
};

export const Radius = {
  sm: moderateScale(8),
  md: moderateScale(12),
  default: moderateScale(16),
  lg: moderateScale(32),
  full: 9999,
};
