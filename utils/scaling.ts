import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const horizontalScale = (size: number) => (width / guidelineBaseWidth) * size;

export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;

export const moderateScale = (size: number, factor = 0.5) => size + (horizontalScale(size) - size) * factor;

export { width as SCREEN_WIDTH, height as SCREEN_HEIGHT };
