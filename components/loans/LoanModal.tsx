import { addDoc, collection, doc, getDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { AlignLeft, Mail, TrendingUp, Type, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAlert } from '../../context/AlertContext';
import { useCurrency } from '../../context/CurrencyContext';
import { auth, db } from '../../firebaseConfig';
import { moderateScale } from '../../utils/scaling';
import { FinanceModalBase, styles as baseStyles } from '../FinanceModalBase';

interface LoanModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export function LoanModal({ isVisible, onClose }: LoanModalProps) {
  const [loanType, setLoanType] = useState<'lent' | 'borrowed' | null>(null);
  const [personName, setPersonName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [personEmail, setPersonEmail] = useState('');
  const { showAlert } = useAlert();
  const { convertToBase, currency } = useCurrency();

  const handleSave = async (amount: string, resetModal: () => void) => {
    const user = auth.currentUser;
    if (!user) return;

    if (!loanType) {
      if (Platform.OS === 'ios') Alert.alert('Error', 'Please select the type of loan');
      else showAlert('Error', 'Please select the type of loan', 'alert', undefined, false, true);
      return;
    }
    if (amount === '0') {
      if (Platform.OS === 'ios') Alert.alert('Error', 'Please enter an amount');
      else showAlert('Error', 'Please enter an amount', 'alert', undefined, false, true);
      return;
    }
    if (!personName) {
      if (Platform.OS === 'ios') Alert.alert('Error', 'Please enter the person name');
      else showAlert('Error', 'Please enter the person name', 'alert', undefined, false, true);
      return;
    }

    setIsSaving(true);
    try {
      let finalOwnerName = user.displayName || user.email?.split('@')[0] || 'A user';
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data && data.displayName) {
            finalOwnerName = data.displayName;
          }
        }
      } catch (e) {
        console.warn("Could not fetch owner name from server (likely offline), using fallback", e);
      }

      const loanData = {
        userId: user.uid,
        amount: parseFloat(amount),
        currency: currency,
        amountUSD: convertToBase(parseFloat(amount)),
        type: loanType,
        personName: personName,
        personEmail: personEmail,
        note: notes,
        status: 'active',
        date: new Date(),
        createdAt: serverTimestamp(),
        ownerName: finalOwnerName,
        ownerEmail: user.email || '',
      };

      addDoc(collection(db, 'loans'), loanData)
        .catch(err => console.error("Loan Save Error", err));

      setLoanType(null);
      setPersonName('');
      setPersonEmail('');
      setNotes('');
      resetModal();
      setTimeout(() => {
        showAlert('Success', 'Loan added successfully!', 'success');
      }, Platform.OS === 'ios' ? 100 : 100);
    } catch (error) {
      console.error("Error while saving!", error);
      showAlert('Error', 'We could not process the loan. Please try again.', 'alert');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FinanceModalBase
      isVisible={isVisible}
      onClose={onClose}
      titleStep1="New loan"
      titleStep2="Loan details"
      marginTopStep2="20%"
      renderStep2={(amount, resetModal) => (
        <View>
          <View style={baseStyles.typeSelectorRow}>
            <TouchableOpacity
              style={[baseStyles.typeButtonContainer]}
              onPress={() => setLoanType('lent')}
            >
              <View style={[
                baseStyles.typeBox,
                loanType === 'lent' && { borderColor: '#6ee591', borderWidth: 2.5 }
              ]}>
                <View style={[
                  baseStyles.typeCircle,
                  { backgroundColor: '#6ee591' },
                  loanType === 'lent' && baseStyles.typeCircleActive
                ]}>
                  <TrendingUp color="#FFFFFF" size={30} strokeWidth={2.5} />
                </View>
              </View>
              <Text style={[baseStyles.typeLabel, { color: '#6ee591' }]}>LENT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[baseStyles.typeButtonContainer]}
              onPress={() => setLoanType('borrowed')}
            >
              <View style={[
                baseStyles.typeBox,
                loanType === 'borrowed' && { borderColor: '#eb5656', borderWidth: 2.5 }
              ]}>
                <View style={[
                  baseStyles.typeCircle,
                  { backgroundColor: '#eb5656' },
                  loanType === 'borrowed' && baseStyles.typeCircleActive
                ]}>
                  <Wallet color="#FFFFFF" size={30} strokeWidth={2.5} />
                </View>
              </View>
              <Text style={[baseStyles.typeLabel, { color: '#eb5656' }]}>BORROWED</Text>
            </TouchableOpacity>
          </View>

          <View style={baseStyles.inputSection}>
            <View style={baseStyles.inputLabelHeader}>
              <Type color="rgba(255,255,255,0.4)" size={14} />
              <Text style={baseStyles.inputLabel}>Person Name</Text>
            </View>
            <TextInput
              style={baseStyles.textInput}
              placeholder="Ex: John Doe"
              placeholderTextColor="rgba(255,255,255,0.1)"
              value={personName}
              onChangeText={setPersonName}
              maxLength={25}
            />
          </View>
          <View style={baseStyles.inputSection}>
            <View style={baseStyles.inputLabelHeader}>
              <Mail color="rgba(255,255,255,0.4)" size={14} />
              <Text style={baseStyles.inputLabel}>
                PERSON EMAIL <Text style={{ textTransform: 'none', letterSpacing: 0, fontSize: moderateScale(9), color: 'rgba(255,255,255,0.2)' }}>(Fill only if they use this app)</Text>
              </Text>
            </View>
            <TextInput
              style={baseStyles.textInput}
              placeholder="Ex: john@example.com"
              placeholderTextColor="rgba(255,255,255,0.1)"
              value={personEmail}
              onChangeText={setPersonEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={30}
            />
          </View>

          <View style={baseStyles.inputSection}>
            <View style={baseStyles.inputLabelHeader}>
              <AlignLeft color="rgba(255,255,255,0.4)" size={14} />
              <Text style={baseStyles.inputLabel}>DETAILS / NOTES</Text>
            </View>
            <TextInput
              style={[baseStyles.textInput, baseStyles.textArea]}
              placeholder="Details about the loan..."
              placeholderTextColor="rgba(255,255,255,0.1)"
              multiline={true}
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              maxLength={60}
            />
          </View>

          <TouchableOpacity
            style={[baseStyles.primaryButton, isSaving && { opacity: 0.7 }]}
            onPress={() => handleSave(amount, resetModal)}
            disabled={isSaving}
          >
            <Text style={baseStyles.primaryButtonText}>
              {isSaving ? 'SAVING...' : 'FINALIZE'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}
