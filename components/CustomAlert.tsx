import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, Check, Info } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut
} from 'react-native-reanimated';
import { useAlert } from '../context/AlertContext';
import { horizontalScale, moderateScale } from '../utils/scaling';


const { width } = Dimensions.get('window');

export default function CustomAlert() {
  const { alertState, hideAlert } = useAlert();
  const { visible, title, message, type, onConfirm, showCancel, disableBlur } = alertState;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    hideAlert();
  };

  const getIcon = () => {
    const size = moderateScale(24);
    const strokeWidth = 2.5;

    if (type === 'success') {
      return <Check color="#10b981" size={size} strokeWidth={strokeWidth} />;
    }
    if (type === 'info')
      return <Info color="#ff05c9" size={size} strokeWidth={strokeWidth} />;
    
    return <AlertTriangle color="#ef4444" size={size} strokeWidth={strokeWidth} />;
  };

  const getTypeColor = () => {
    return type === 'success' ? '#10b981' : type === 'info' ? '#ff05c9' : '#ef4444';
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={hideAlert}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(100)}
          exiting={FadeOut.duration(100)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable style={styles.backdrop} onPress={hideAlert}>
            <BlurView
              intensity={Platform.OS === 'android' && disableBlur ? 0 : 10}
              tint="dark"
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod={Platform.OS === 'android' && disableBlur ? 'none' : 'dimezisBlurView'}
            />
          </Pressable>
        </Animated.View>

        <Animated.View
          entering={ZoomIn.springify(60).damping(80)}
          exiting={ZoomOut.duration(60)}
          style={styles.alertContainer}
        >
          <View style={styles.alertContent}>
            <View style={[styles.iconContainer, { backgroundColor: `${getTypeColor()}15` }]}>
              {getIcon()}
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {showCancel ? (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={hideAlert}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.confirmButton]}
                  onPress={handleConfirm}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[getTypeColor(), `${getTypeColor()}cc`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                  >
                    <Text style={styles.buttonText}>Confirm</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.button}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[getTypeColor(), `${getTypeColor()}cc`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradient}
                >
                  <Text style={styles.buttonText}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  alertContainer: {
    width: width * 0.75,
    backgroundColor: '#1C1D21',
    borderRadius: moderateScale(28),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  alertContent: {
    padding: horizontalScale(24),
    alignItems: 'center',
  },
  iconContainer: {
    width: horizontalScale(56),
    height: horizontalScale(56),
    borderRadius: moderateScale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: horizontalScale(20),
  },
  title: {
    fontSize: moderateScale(19),
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: horizontalScale(10),
  },
  message: {
    fontSize: moderateScale(14),
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: horizontalScale(24),
  },
  button: {
    width: '100%',
    height: horizontalScale(48),
    borderRadius: moderateScale(24),
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: moderateScale(16),
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: horizontalScale(12),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
  },
  cancelButtonText: {
    fontSize: moderateScale(16),
    fontFamily: 'Manrope_700Bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  }
});
