import { AlignLeft, TrendingUp, Type, Wallet } from "lucide-react-native";
import { useState } from "react";
import { Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
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
            showAlert("Authentication Required", "You must be logged in to save a transaction.", "alert");
            return;
        }

        if (!transactionType) {
            showAlert("Selection Required", "Please select whether this is an Income or an Expense.", "alert");
            return;
        }
        if (amount === '0' || !amount) {
            showAlert("Invalid Amount", "Please enter a valid amount for this transaction.", "alert");
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
                date: new Date(),
                createdAt: new Date()
            };

            if (Platform.OS === 'web') {
                const { addDoc, collection } = require('firebase/firestore');
                await addDoc(collection(db, 'transactions'), transactionData);
            } else {
                // For native, we trust the local cache and don't await the promise
                // to ensure the UI feels instant even when offline.
                db.collection('transactions').add(transactionData).catch((e: any) => console.error(e));
            }

            // Success cleanup
            setTransactionType(null);
            setTitle('');
            setNotes('');
            resetModal();
            showAlert("Transaction Saved", `Your ${transactionType} of ${format(parseFloat(amount), { isConverted: true })} has been recorded.`, "success");
        }
        catch (error: any) {
            console.error("Eroare la salvare!", error);
            showAlert("Save Error", "We couldn't save your transaction. Please check your connection and try again.", "alert");
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

                    </View>
            )}
            renderFooter={(amount, resetModal) => (
                <TouchableOpacity
                    style={[baseStyles.primaryButton, isSaving && { opacity: 0.7 }]}
                    onPress={() => handleSave(amount, resetModal)}
                    disabled={isSaving}
                >
                    <Text style={baseStyles.primaryButtonText}>
                        {isSaving ? 'SAVING...' : 'FINALIZE'}
                    </Text>
                </TouchableOpacity>
            )}
        />
    );
}

export default function SpeedEntryDummyScreen() {
    return null;
}
