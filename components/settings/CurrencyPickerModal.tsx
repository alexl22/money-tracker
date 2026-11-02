import { Check, Search, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { horizontalScale } from '../../utils/scaling';

interface CurrencyPickerModalProps {
  isVisible: boolean;
  onClose: () => void;
  currencies: string[];
  currentCurrency: string;
  onSelectCurrency: (code: string) => void;
  styles: any;
}

export function CurrencyPickerModal({
  isVisible,
  onClose,
  currencies,
  currentCurrency,
  onSelectCurrency,
  styles,
}: CurrencyPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCurrencies = (currencies || []).filter((c) =>
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (item: string) => {
    onSelectCurrency(item);
    setSearchQuery('');
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <View style={[styles.timePickerContent, { height: '80%', borderTopLeftRadius: 36, borderTopRightRadius: 36 }]}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalLabel}>SELECT PREFERENCE</Text>
              <Text style={styles.modalTitleText}>Currency</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
            >
              <X color="rgba(255,255,255,0.4)" size={20} />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputCard, { marginBottom: 20, height: 56, borderRadius: 16 }]}>
            <Search color="#3b82f6" size={18} style={{ marginRight: 12 }} />
            <TextInput
              style={[styles.inputText, { fontSize: 14 }]}
              placeholder="Search currency code..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
            />
          </View>

          <FlatList
            data={filteredCurrencies}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: horizontalScale(60) }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  { height: 64, marginBottom: 12, marginTop: 0 },
                  currentCurrency === item && { borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)' }
                ]}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.actionCardLeft}>
                  <View style={[styles.iconCircle, { width: 36, height: 36, backgroundColor: currentCurrency === item ? '#3b82f6' : 'rgba(255,255,255,0.05)' }]}>
                    <Text style={{ color: currentCurrency === item ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>
                      {item.substring(0, 1)}
                    </Text>
                  </View>
                  <Text style={[styles.actionCardTitle, currentCurrency === item && { color: '#3b82f6' }]}>{item}</Text>
                </View>
                {currentCurrency === item && <Check color="#3b82f6" size={20} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
