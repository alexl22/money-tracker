import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronDown, Eye, EyeOff, Lock, Shield } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAlert } from '../../context/AlertContext';
import { auth, updateUserPassword as helperUpdatePassword } from '../../firebaseConfig';

interface PasswordSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  styles: any;
}

export function PasswordSection({ isExpanded, onToggle, styles }: PasswordSectionProps) {
  const [showPasswords, setShowPasswords] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { showAlert } = useAlert();

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      showAlert('Password Error', 'Your passwords do not match. Please try again.', 'alert');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('Security Notice', 'Your password must be at least 6 characters long for better protection.', 'alert');
      return;
    }
    if (auth.currentUser) {
      try {
        await helperUpdatePassword(newPassword);
        showAlert('Updated Successfully', 'Your security credentials have been successfully updated.', 'success');
        setNewPassword('');
        setConfirmPassword('');
      } catch (error: any) {
        console.error(error);
        showAlert('Update Failed', 'We could not update your password. You may need to log in again.', 'alert');
      }
    }
  };

  return (
    <View style={styles.securityWrapper}>
      <TouchableOpacity
        style={[styles.actionCard, isExpanded && styles.actionCardExpanded]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.actionCardLeft}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <Shield color="#3b82f6" size={20} />
          </View>
          <Text style={styles.actionCardTitle}>Password</Text>
        </View>
        <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
          <ChevronDown color="rgba(255,255,255,0.4)" size={20} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.securityDropdown}>
          <View style={styles.innerSectionGroup}>
            <Text style={styles.innerSectionLabel}>NEW PASSWORD</Text>
            <View style={styles.inputCard}>
              <View style={styles.inputIconCircle}>
                <Lock color="rgba(255,255,255,0.6)" size={16} />
              </View>
              <TextInput
                style={styles.innerTextInput}
                placeholder="Min. 6 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholderTextColor="rgba(255,255,255,0.1)"
                secureTextEntry={!showPasswords}
              />
              <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)}>
                {showPasswords ? <EyeOff color="#3b82f6" size={18} /> : <Eye color="rgba(255,255,255,0.3)" size={18} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.innerSectionGroup}>
            <Text style={styles.innerSectionLabel}>CONFIRM PASSWORD</Text>
            <View style={styles.inputCard}>
              <View style={styles.inputIconCircle}>
                <Check color="rgba(255,255,255,0.6)" size={16} />
              </View>
              <TextInput
                style={styles.innerTextInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                placeholderTextColor="rgba(255,255,255,0.1)"
                secureTextEntry={!showPasswords}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.updatePasswordBtn} onPress={handleUpdatePassword}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.updatePasswordGradient}
            >
              <Text style={styles.updatePasswordBtnText}>Update Password</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
