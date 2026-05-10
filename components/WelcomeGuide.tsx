import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import {
  ChevronLeft,
  ChevronRight,
  Goal,
  Hand,
  History,
  LayoutGrid,
  Plus,
  Settings,
  Trash2,
  X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { horizontalScale, moderateScale } from '../utils/scaling';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    width: width,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: horizontalScale(20),
  },
  container: {
    width: '100%',
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(28),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: horizontalScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    marginTop: horizontalScale(35),
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: horizontalScale(4),
    marginBottom: horizontalScale(-10),
  },
  content: {
    alignItems: 'center',
    minHeight: horizontalScale(240),
    justifyContent: 'center',
    paddingVertical: horizontalScale(5),
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: horizontalScale(140),
    height: horizontalScale(140),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: horizontalScale(16),
  },
  menuList: {
    width: '100%',
    gap: horizontalScale(8),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: horizontalScale(8),
    borderRadius: moderateScale(14),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  menuIconCircle: {
    width: horizontalScale(32),
    height: horizontalScale(32),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: horizontalScale(10),
  },
  menuBarPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '85%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: horizontalScale(16),
    paddingVertical: horizontalScale(10),
    borderRadius: moderateScale(16),
    marginBottom: horizontalScale(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  plusCirclePreview: {
    width: horizontalScale(36),
    height: horizontalScale(36),
    backgroundColor: '#3b82f6',
    borderRadius: horizontalScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    color: 'white',
    fontSize: moderateScale(14),
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  menuItemDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: moderateScale(12),
    fontFamily: 'Manrope_500Medium',
  },
  title: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: horizontalScale(12),
    fontFamily: 'Manrope_800ExtraBold',
  },
  description: {
    fontSize: moderateScale(15),
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: moderateScale(22),
    paddingHorizontal: horizontalScale(10),
    fontFamily: 'Manrope_500Medium',
  },
  footer: {
    marginTop: horizontalScale(10),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: horizontalScale(20),
    gap: horizontalScale(8),
  },
  dot: {
    height: horizontalScale(8),
    borderRadius: moderateScale(4),
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: horizontalScale(12),
    paddingHorizontal: horizontalScale(20),
    borderRadius: moderateScale(16),
    gap: 4,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  nextBtn: {
    backgroundColor: '#3b82f6',
  },
  btnText: {
    color: 'white',
    fontSize: moderateScale(14),
    fontFamily: 'Manrope_600SemiBold',
  },
  swipeAnimationContainer: {
    width: '100%',
    height: horizontalScale(75),
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  dummyRow: {
    width: '100%',
    height: horizontalScale(55),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: moderateScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  deleteIndicator: {
    position: 'absolute',
    right: 0,
    width: horizontalScale(60),
    height: horizontalScale(60),
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
  }
});



const SLIDES = [
  {
    id: 1,
    title: "",
    description: "",
    customContent: (
      <View style={{ width: '100%', alignItems: 'center' }}>
        {/* Menu Bar Preview */}
        <View style={styles.menuBarPreview}>
          <LayoutGrid color="rgba(255,255,255,0.4)" size={18} />
          <History color="rgba(255,255,255,0.4)" size={18} />
          <View style={styles.plusCirclePreview}>
            <Plus color="white" size={18} strokeWidth={3} />
          </View>
          <Goal color="rgba(255,255,255,0.4)" size={18} />
          <Settings color="rgba(255,255,255,0.4)" size={18} />
        </View>

        <View style={styles.menuList}>
          {[
            { icon: <LayoutGrid color="white" size={20} />, title: "Dashboard", desc: "Overview of your transactions" },
            { icon: <History color="white" size={20} />, title: "History", desc: "All transactions" },
            { icon: <Plus color="#3b82f6" size={24} strokeWidth={3} />, title: "Quick Add", desc: "Add a new transaction", special: true },
            { icon: <Goal color="white" size={20} />, title: "Targets", desc: "Manage Goals & Loans" },
            { icon: <Settings color="white" size={20} />, title: "Settings", desc: "Customize your experience" },
          ].map((item, idx) => (
            <View key={idx} style={styles.menuItem}>
              <View style={[styles.menuIconCircle, { backgroundColor: item.special ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)' }]}>
                {item.icon}
              </View>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    )
  },
  {
    id: 2,
    title: "Delete Transactions",
    description: "Simply Swipe Left or Long Press on any transaction in History to reveal the delete option.",
    customContent: <SwipeAnimation />
  },
  {
    id: 3,
    title: "How to Delete a Goal",
    description: "1. Tap the central circle of the goal\n2. Set the 'Target Value' to 0\n3. Confirm to permanently delete.",
    icon: <Trash2 color="#ef4444" size={48} />,
  }
];

function SwipeAnimation() {
  const offset = useSharedValue(0);
  useEffect(() => {
    offset.value = withRepeat(
      withSequence(
        withTiming(-60, { duration: 1200 }),
        withTiming(0, { duration: 500 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }]
  }));

  return (
    <View style={styles.swipeAnimationContainer}>
      <View style={styles.deleteIndicator}>
        <Trash2 color="#ef4444" size={20} />
      </View>
      <Animated.View style={[styles.dummyRow, animatedStyle]}>
        <Text style={{ color: 'white', opacity: 0.7, fontWeight: '600', fontSize: 16, flex: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}>Transaction</Text>
        <Hand color="white" size={32} />
      </Animated.View>
    </View>
  );
}

export const WelcomeGuide = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('hasSeenGuide', 'true');
    onClose();
    setTimeout(() => setCurrentSlide(0), 500);
  };

  if (!visible) return null;

  const slide = SLIDES[currentSlide];

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent={true}>
      <View style={styles.overlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

        <Animated.View
          style={styles.container}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X color="white" size={24} />
          </TouchableOpacity>

          <View style={styles.content}>
            <Animated.View
              key={currentSlide}
              entering={FadeIn.duration(400)}
              style={styles.slideContent}
            >
              <View style={[styles.iconContainer, currentSlide === 0 && { height: 'auto', width: '100%', marginBottom: horizontalScale(12) }]}>
                {(slide?.icon || slide?.customContent) || <LayoutGrid color="#3b82f6" size={48} />}
              </View>

              {slide?.title ? <Text style={styles.title}>{slide.title}</Text> : null}
              {slide?.description ? <Text style={styles.description}>{slide.description}</Text> : null}
            </Animated.View>
          </View>

          <View style={styles.footer}>
            <View style={styles.pagination}>
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === currentSlide ? '#3b82f6' : 'rgba(255,255,255,0.2)', width: i === currentSlide ? 20 : 8 }
                  ]}
                />
              ))}
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.btn, styles.backBtn, currentSlide === 0 && { opacity: 0 }]}
                onPress={handleBack}
                disabled={currentSlide === 0}
              >
                <ChevronLeft color="white" size={20} />
                <Text style={styles.btnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, styles.nextBtn]} onPress={handleNext}>
                <Text style={[styles.btnText, { fontWeight: 'bold' }]}>
                  {currentSlide === SLIDES.length - 1 ? 'Start' : 'Next'}
                </Text>
                <ChevronRight color="white" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

