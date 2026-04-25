import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, LogIn, Mail, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '../context/AlertContext';
import { sendPasswordReset, signIn } from '../firebaseConfig';
const BLUE = '#4A8AF4';
const BG = '#101010';
const INPUT_BG = '#1A1A1A';
const TEXT_MUTED = '#888888';
const TEXT_WHITE = '#FFFFFF';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { showAlert } = useAlert();

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("Missing Credentials", "Please enter your email and password to continue.", "alert");
      return;
    }
    try {
      await signIn(email, password);
      router.push('/(tabs)/home');
    } catch (error: any) {
      console.error(error);
      showAlert("Login Error", "We couldn't sign you in. Please check your credentials.", "alert");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showAlert("Email Required", "Please enter your email address to receive a password reset link.", "alert");
      return;
    }

    const cleanEmail = email.trim();

    try {
      await sendPasswordReset(cleanEmail);
      showAlert("Email Sent", "If an account exists with that email, a password reset link has been sent. Please also check your Spam/Junk folder.", "success");
    } catch (error: any) {
      console.error(error);
      showAlert("Error", `[${error.code || 'unknown'}] ${error.message || "Something went wrong. Please try again later."}`, "alert");
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#101010', '#020f22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.container}>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            <View style={styles.header}>
              <Text style={styles.title}>Welcome!</Text>
            </View>

            <View style={styles.form}>
              {/* Email Field */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputContainer}>
                  <Mail color={TEXT_MUTED} size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="name@venue.com"
                    placeholderTextColor={TEXT_MUTED}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.fieldWrapper}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.label}>PASSWORD</Text>
                  <TouchableOpacity onPress={handleForgotPassword}>
                    <Text style={styles.forgotText}>FORGOT PASSWORD?</Text>
                  </TouchableOpacity>
                </View>
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

              {/* Sign In Button */}
              <TouchableOpacity onPress={handleLogin} style={styles.signInButton}>
                <Text style={styles.signInText}>SIGN IN</Text>
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.registerLinkContainer}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={styles.registerHighlight}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Auth Bottom Tab Navigation */}
        <View style={[styles.bottomNavContainer, { bottom: 5 + insets.bottom }]}>
          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navItem}>
              <View style={styles.navItemGlow}>
                <LogIn color={BLUE} size={24} />
                <Text style={[styles.navText, { color: BLUE }]}>LOGIN</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => router.push('/register')}>
              <View style={styles.navItemContent}>
                <UserPlus color={TEXT_MUTED} size={24} />
                <Text style={styles.navText}>REGISTER</Text>
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
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: BLUE,
    letterSpacing: 0.5,
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
    width: 86,
    height: 66,
    borderRadius: 33,
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
