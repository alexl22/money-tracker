import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from '@react-native-firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import { Sparkles, Check, CheckCircle2, ChevronRight, Smartphone, ShieldCheck, Flame } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { horizontalScale, moderateScale } from '../utils/scaling';

const { width } = Dimensions.get('window');

interface WhatsNewModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ isVisible, onClose }: WhatsNewModalProps) {
  // Sincronizare NavigationBar pe Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (isVisible) {
        NavigationBar.setBackgroundColorAsync('rgba(0, 0, 0, 0.80)');
      } else {
        NavigationBar.setBackgroundColorAsync('rgba(0, 0, 0, 0)');
      }
    }
  }, [isVisible]);

  const handleDismiss = async () => {
    try {
      // Salvează local în AsyncStorage pentru acces rapid
      await AsyncStorage.setItem('hasSeenWhatsNew_v1', 'true');

      // Salvează în Firestore legat de contul utilizatorului (persistent la dezinstalare)
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { hasSeenWhatsNew_v1: true }, { merge: true });
      }
    } catch (error) {
      console.error('Error saving WhatsNew status:', error);
    }
    onClose();
  };

  if (!isVisible) return null;

  const NEW_FEATURES = [
    {
      icon: <Flame color="#3b82f6" size={24} />,
      title: 'Unified Transaction Manager',
      desc: 'Edit and delete transactions in a single screen with zero loading delay and lag.',
    },
    {
      icon: <Smartphone color="#10b981" size={24} />,
      title: 'Sleek Micro-Animations',
      desc: 'Enjoy smooth alerts, fluid menus, and optimized navigation transitions.',
    },
    {
      icon: <ShieldCheck color="#ff05c9" size={24} />,
      title: 'System Stability & Fixes',
      desc: 'Resolved stacked modal crashes on iOS and overlapping tap issues on search history.',
    },
  ];

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Icon & Title */}
          <View style={styles.header}>
            <View style={styles.sparkleBadge}>
              <Sparkles color="#3b82f6" size={28} />
            </View>
            <Text style={styles.title}>What's New</Text>
            <Text style={styles.subtitle}>Version 1.1.0 Updates</Text>
          </View>

          {/* Features List */}
          <View style={styles.listContainer}>
            {NEW_FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.iconWrapper}>{feature.icon}</View>
                <View style={styles.textWrapper}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Action Button */}
          <TouchableOpacity style={styles.button} onPress={handleDismiss} activeOpacity={0.8}>
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              <Text style={styles.buttonText}>Awesome, got it!</Text>
              <CheckCircle2 color="#FFFFFF" size={18} strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.80)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(24),
  },
  container: {
    width: '100%',
    maxWidth: width * 0.9,
    backgroundColor: '#1C1D21',
    borderRadius: moderateScale(28),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: horizontalScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: horizontalScale(28),
  },
  sparkleBadge: {
    width: horizontalScale(60),
    height: horizontalScale(60),
    borderRadius: moderateScale(30),
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: horizontalScale(12),
  },
  title: {
    fontSize: moderateScale(22),
    fontFamily: 'Manrope_800ExtraBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(13),
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: horizontalScale(4),
  },
  listContainer: {
    gap: horizontalScale(20),
    marginBottom: horizontalScale(28),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: horizontalScale(14),
  },
  iconWrapper: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  textWrapper: {
    flex: 1,
  },
  featureTitle: {
    fontSize: moderateScale(14),
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
    marginBottom: horizontalScale(4),
  },
  featureDesc: {
    fontSize: moderateScale(12),
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.45)',
    lineHeight: moderateScale(18),
  },
  button: {
    height: horizontalScale(50),
    borderRadius: moderateScale(25),
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: horizontalScale(8),
  },
  buttonText: {
    fontSize: moderateScale(14),
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
  },
});
