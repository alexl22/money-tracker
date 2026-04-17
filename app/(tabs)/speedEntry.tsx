import { AlignLeft, TrendingUp, Type, Wallet } from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import firestore from '@react-native-firebase/firestore';
import { FinanceModalBase, styles as baseStyles } from "../../components/FinanceModalBase";
import { useAlert } from "../../context/AlertContext";
import { useCurrency } from "../../context/CurrencyContext";
import { auth, db } from "../../firebaseConfig";
interface TransactionModalProps {
    isVisible: boolean;
    onClose: () => void;
}

export function TransactionModal({ isVisible, onClose }: TransactionModalProps) {
    const [transactionType, setTransactionType] = useState<'income' | 'expense' | null>(null);
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { showAlert } = useAlert();
    const { currency, convertToBase, format } = useCurrency();
    const handleSave = async (amount: string, resetModal: () => void) => {
        const user = auth.currentUser;
        if (!user) {
            if (Platform.OS === 'ios') Alert.alert("Authentication Required", "You must be logged in to save a transaction.");
            else showAlert("Authentication Required", "You must be logged in to save a transaction.", "alert", undefined, false, true);
            return;
        }

        if (!transactionType) {
            if (Platform.OS === 'ios') Alert.alert("Selection Required", "Please select whether this is an Income or an Expense.");
            else showAlert("Selection Required", "Please select whether this is an Income or an Expense.", "alert", undefined, false, true);
            return;
        }
        if (amount === '0' || !amount) {
            if (Platform.OS === 'ios') Alert.alert("Invalid Amount", "Please enter a valid amount for this transaction.");
            else showAlert("Invalid Amount", "Please enter a valid amount for this transaction.", "alert", undefined, false, true);
            return;
        }
        setIsSaving(true);
        try {
            const transactionData = {
                userId: user.uid,
                amount: parseFloat(amount),
                amountUSD: convertToBase(parseFloat(amount)),
                currency: currency,
                type: transactionType,
                title: title,
                notes: notes,
                date: new Date(), // Local display date
                createdAt: firestore.FieldValue.serverTimestamp() // Official server date for sync
            };

            // OPTIMISTIC UI: We don't 'await' the server response here.
            // Firestore handles the save in the background.
            db.collection('transactions').add(transactionData)
                .catch(error => {
                    console.error("Delayed Save Error!", error);
                    // Silent background error or non-blocking notification
                });

            // Success cleanup - HAPPENS IMMEDIATELY
            setTimeout(() => {
                setTransactionType(null);
                setTitle('');
                setNotes('');
                resetModal();
                showAlert("Transaction Saved", `Your ${transactionType} of ${format(parseFloat(amount), { isConverted: true })} has been recorded.`, "success");
            }, 100);
        }
        catch (error: any) {
            console.error("Saving error!", error);
            if (Platform.OS === 'ios') {
                Alert.alert("Save Error", "We couldn't save your transaction.");
            } else {
                showAlert("Save Error", "We couldn't save your transaction. Please check your connection and try again.", "alert", undefined, false, true);
            }
        }
        finally {
            setIsSaving(false);
        }
    };

    return (
        <FinanceModalBase
            isVisible={isVisible}
            onClose={onClose}
            titleStep1="NEW TRANSACTION"
            titleStep2="ASSIGN TYPE"
            renderStep2={(amount, resetModal) => (
                <View>
                    <View style={baseStyles.typeSelectorRow}>
                        <TouchableOpacity
                            style={[baseStyles.typeButtonContainer]}
                            onPress={() => setTransactionType('income')}
                        >
                            <View style={[
                                baseStyles.typeBox,
                                transactionType === 'income' && { borderColor: '#6ee591', borderWidth: 2.5 }
                            ]}>
                                <View style={[
                                    baseStyles.typeCircle,
                                    { backgroundColor: '#6ee591' },
                                    transactionType === 'income' && baseStyles.typeCircleActive
                                ]}>
                                    <TrendingUp color="#FFFFFF" size={30} strokeWidth={2.5} />
                                </View>
                            </View>
                            <Text style={[baseStyles.typeLabel, { color: '#6ee591' }]}>INCOME</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[baseStyles.typeButtonContainer]}
                            onPress={() => setTransactionType('expense')}
                        >
                            <View style={[
                                baseStyles.typeBox,
                                transactionType === 'expense' && { borderColor: '#eb5656', borderWidth: 2.5 }
                            ]}>
                                <View style={[
                                    baseStyles.typeCircle,
                                    { backgroundColor: '#eb5656' },
                                    transactionType === 'expense' && baseStyles.typeCircleActive
                                ]}>
                                    <Wallet color="#FFFFFF" size={30} strokeWidth={2.5} />
                                </View>
                            </View>
                            <Text style={[baseStyles.typeLabel, { color: '#eb5656' }]}>EXPENSE</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={baseStyles.inputSection}>
                        <View style={baseStyles.inputLabelHeader}>
                            <Type color="rgba(255,255,255,0.4)" size={14} />
                            <Text style={baseStyles.inputLabel}>TITLE</Text>
                        </View>
                        <TextInput
                            style={baseStyles.textInput}
                            placeholder="e.g. Lunch, Tips, Rent"
                            placeholderTextColor="rgba(255,255,255,0.1)"
                            value={title}
                            onChangeText={setTitle}
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
                            placeholder="e.g. Extra shift notes or specific item details..."
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

export default function SpeedEntryDummyScreen() {
    return null;
}
