import { StyleSheet, Dimensions } from 'react-native';
import { horizontalScale, moderateScale } from '../utils/scaling';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: horizontalScale(25),
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarCapsule: {
    flexDirection: 'row',
    width: width * 0.95,
    height: horizontalScale(70),
    borderRadius: moderateScale(35),
    backgroundColor: 'rgba(28, 29, 31, 0.8)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(5),
  },
  tabIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  customAddButton: {
    width: horizontalScale(63),
    height: horizontalScale(63),
    borderRadius: moderateScale(40),
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: horizontalScale(8) },
    shadowOpacity: 0.5,
    shadowRadius: moderateScale(12),
    elevation: 12,
  },
});
