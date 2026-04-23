import { updateProfile } from '@react-native-firebase/auth';
import { doc, setDoc } from '@react-native-firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, LogIn, Mail, User, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '../context/AlertContext';
import { db, signUp } from '../firebaseConfig';
const BLUE = '#4A8AF4';
const BG = '#101010';
const INPUT_BG = '#1A1A1A';
const TEXT_MUTED = '#888888';
const TEXT_WHITE = '#FFFFFF';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { showAlert } = useAlert();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      showAlert("Incomplete Form", "Please fill in all the required fields to create your account.", "alert");
      return;
    }
    if (password !== confirmPassword) {
      showAlert("Password Mismatch", "The passwords you entered do not match. Please verify them.", "alert");
      return;
    }
    if (password.length < 6) {
      showAlert("Weak Password", "For your security, passwords must be at least 6 characters long.", "alert");
      return;
    }
    try {
      const userCredential = await signUp(email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Create user document in Firestore
      const userData = {
        uid: user.uid,
        displayName: name,
        email: email,
        createdAt: new Date(),
        baseCurrency: ''
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      router.push('/(tabs)/home');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/network-request-failed' || error.message?.includes('network')) {
        showAlert("Internet Required", "You need an active internet connection to create a new account. Please check your WiFi or Data and try again.", "alert");
      } else {
        showAlert("Registration Failed", error.message || "We couldn't create your account. Please try again later.", "alert");
      }
    }
  };


  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#101010', '#020f22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.container}>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
            </View>

            <View style={styles.form}>
              {/* Full Name Field */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>FULL NAME</Text>
                <View style={styles.inputContainer}>
                  <User color={TEXT_MUTED} size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Marcel Cercel"
                    placeholderTextColor={TEXT_MUTED}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email Field */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputContainer}>
                  <Mail color={TEXT_MUTED} size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="marcel@cercel.com"
                    placeholderTextColor={TEXT_MUTED}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Secure Password Field */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>SECURE PASSWORD</Text>
                <View style={styles.inputContainer}>
                  <Lock color={TEXT_MUTED} size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={TEXT_MUTED}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword ? <EyeOff color={TEXT_MUTED} size={20} /> : <Eye color={TEXT_MUTED} size={20} />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Field */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <View style={styles.inputContainer}>
                  <Lock color={TEXT_MUTED} size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={TEXT_MUTED}
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />

                </View>
                {password.length > 0 && confirmPassword.length > 0 && (
                  <Text style={[styles.matchText, { color: password === confirmPassword ? '#4CAF50' : '#F44336' }]}>
                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </Text>
                )}
              </View>

              {/* Register Button */}
              <TouchableOpacity onPress={handleRegister} style={styles.signInButton}>
                <Text style={styles.signInText}>REGISTER</Text>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.registerLinkContainer}>
                <Text style={styles.registerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={styles.registerHighlight}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Auth Bottom Tab Navigation */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navItem} onPress={() => router.push('/login')}>
              <View style={styles.navItemContent}>
                <LogIn color={TEXT_MUTED} size={24} />
                <Text style={styles.navText}>LOGIN</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem}>
              <View style={styles.navItemGlow}>
                <UserPlus color={BLUE} size={24} />
                <Text style={[styles.navText, { color: BLUE }]}>REGISTER</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 150, // Space for bottom nav
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 42,
    color: TEXT_WHITE,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#CCCCCC',
  },
  form: {
    gap: 24,
  },
  fieldWrapper: {
    gap: 8,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 1,
  },
  matchText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 20,
    height: 60,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: TEXT_WHITE,
    height: '100%',
  },
  navItemContent: {
    width: 75,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navItemGlow: {
    width: 85,
    height: 65,
    borderRadius: 30,
    backgroundColor: 'rgba(74, 138, 244, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(74, 138, 244, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 4,
  },
  eyeIcon: {
    padding: 8,
  },
  signInButton: {
    marginTop: 16,
    backgroundColor: BLUE,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(74, 138, 244, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  signInText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: TEXT_WHITE,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  registerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#AAAAAA',
  },
  registerHighlight: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: BLUE,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: INPUT_BG,
    borderRadius: 40,
    height: 80,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 1,
    marginTop: 4,
  }
}); 
