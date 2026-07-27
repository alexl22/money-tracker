import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Pencil, Trash2, X } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import * as NavigationBar from 'expo-navigation-bar';
import { horizontalScale, moderateScale } from '../utils/scaling';
import { useCurrency } from '../context/CurrencyContext';

const { width, height: screenHeight } = Dimensions.get('screen');

interface TransactionOptionsMenuProps {
  isVisible: boolean;
  onClose: () => void;
  transaction: any;
  onEdit: () => void;
  onDelete: () => void;
}

export default function TransactionOptionsMenu({
  isVisible,
  onClose,
  transaction,
  onEdit,
  onDelete,
}: TransactionOptionsMenuProps) {
  const { format } = useCurrency();
  const [layoutReady, setLayoutReady] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'android') {
      if (isVisible) {
        NavigationBar.setBackgroundColorAsync('rgba(0, 0, 0, 0.85)');
      } else {
        NavigationBar.setBackgroundColorAsync('rgba(0,0,0,0)');
      }
    }
  }, [isVisible]);

  React.useEffect(() => {
    if (!isVisible) {
      setLayoutReady(false);
    }
  }, [isVisible]);

  if (!isVisible || !transaction) return null;

  const displayAmount = format(transaction.rawAmount || 0, {
    showSign: true,
    isConverted: true,
  });

  return (
    <Modal
      transparent
      visible={isVisible}
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.fullScreenContainer}>
      <View style={styles.overlay} onLayout={() => setLayoutReady(true)}>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable style={styles.backdrop} onPress={onClose}>
            <BlurView
              intensity={10}
              tint="dark"
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod="dimezisBlurView"
            />
          </Pressable>
        </Animated.View>

        {layoutReady && (
          <Animated.View entering={ZoomIn.duration(150)} style={styles.menuContainer}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Transaction Options</Text>
              
              <View style={[
                styles.txSummary,
                { borderColor: transaction.type === 'income' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(235, 86, 86, 0.25)' }
              ]}>
                <Text 
                  style={[
                    styles.txAmount, 
                    { color: transaction.type === 'income' ? '#10b981' : '#eb5656' }
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {displayAmount}
                </Text>

                <Text style={styles.txTitle} numberOfLines={2}>
                  {transaction.title}
                </Text>
              </View>

              <View style={styles.buttonCol}>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={onEdit}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                  >
                    <View style={styles.buttonInner}>
                      <Pencil color="#FFFFFF" size={moderateScale(18)} strokeWidth={2.5} />
                      <Text style={styles.buttonText}>Edit Transaction</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuButton, styles.deleteButton]}
                  onPress={onDelete}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                  >
                    <View style={styles.buttonInner}>
                      <Trash2 color="#FFFFFF" size={moderateScale(18)} strokeWidth={2.5} />
                      <Text style={styles.buttonText}>Delete Transaction</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <X color="rgba(255,255,255,0.6)" size={moderateScale(18)} strokeWidth={2.5} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    elevation: 999999,
  },
  overlay: {
    width: width,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    width: width * 0.8,
    backgroundColor: '#1C1D21',
    borderRadius: moderateScale(28),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  menuContent: {
    padding: horizontalScale(24),
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: moderateScale(13),
    color: '#3b82f6',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: horizontalScale(16),
  },
  txSummary: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: moderateScale(16),
    paddingHorizontal: horizontalScale(16),
    paddingVertical: horizontalScale(18),
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: horizontalScale(24),
    gap: horizontalScale(4),
  },
  iconCircle: {
    width: horizontalScale(44),
    height: horizontalScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: horizontalScale(1),
  },
  txAmount: {
    fontSize: moderateScale(30),
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  txTitle: {
    fontSize: moderateScale(17),
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  txSub: {
    fontSize: moderateScale(11),
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
  buttonCol: {
    width: '100%',
    gap: horizontalScale(12),
  },
  menuButton: {
    width: '100%',
    height: horizontalScale(48),
    borderRadius: moderateScale(24),
    overflow: 'hidden',
  },
  deleteButton: {
    shadowColor: '#ef4444',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: horizontalScale(8),
  },
  buttonText: {
    fontSize: moderateScale(15),
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cancelButton: {
    width: '100%',
    height: horizontalScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: horizontalScale(8),
  },
  cancelButtonText: {
    fontSize: moderateScale(15),
    fontFamily: 'Manrope_700Bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
});
