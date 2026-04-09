import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Standard mobile device width guideline (iPhone 11/14 size)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scalarea orizontală - pentru lățimi, margini laterale și padding.
 * @param size Dimensiunea originală în puncte.
 */
export const horizontalScale = (size: number) => (width / guidelineBaseWidth) * size;

/**
 * Scalarea verticală - pentru înălțimi (mai rar folosită decât cea orizontală).
 * @param size Dimensiunea originală în puncte.
 */
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;

/**
 * Scalarea moderată - ideală pentru dimensiuni de font, iconițe și raze (Radius).
 * Folosește un factor (factor default 0.5) pentru a nu mări exagerat elementele pe tablete sau ecrane uriașe.
 * @param size Dimensiunea originală în puncte.
 * @param factor Factorul de scalare (default 0.5).
 */
export const moderateScale = (size: number, factor = 0.5) => size + (horizontalScale(size) - size) * factor;

export { width as SCREEN_WIDTH, height as SCREEN_HEIGHT }; 
