import React, { useRef, useEffect } from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { horizontalScale } from '../utils/scaling';

interface TimePickerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: () => void;
  tempHours: number;
  tempMinutes: number;
  setTempHours: (h: number) => void;
  setTempMinutes: (m: number) => void;
  styles: any; // Passing styles from the main styles file for consistency
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  isVisible,
  onClose,
  onSave,
  tempHours,
  tempMinutes,
  setTempHours,
  setTempMinutes,
  styles,
}) => {
  const hoursScrollRef = useRef<ScrollView>(null);
  const minutesScrollRef = useRef<ScrollView>(null);

  // Auto-scroll logic when modal opens
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        hoursScrollRef.current?.scrollTo({ 
          y: tempHours * horizontalScale(50), 
          animated: true 
        });
        minutesScrollRef.current?.scrollTo({ 
          y: tempMinutes * horizontalScale(50), 
          animated: true 
        });
      }, 300);
    }
  }, [isVisible]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <BlurView intensity={80} tint="dark" style={styles.timePickerBlur}>
          <View style={styles.timePickerContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalLabel}>SYNC SCHEDULE</Text>
                <Text style={styles.modalTitleText}>Set Sync Time</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X color="rgba(255,255,255,0.4)" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerColumns}>
              {/* Hours Column */}
              <View style={styles.timeColumn}>
                <Text style={styles.columnLabel}>HOUR</Text>
                <ScrollView 
                  ref={hoursScrollRef}
                  showsVerticalScrollIndicator={false} 
                  snapToInterval={horizontalScale(50)}
                  decelerationRate="fast"
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const active = tempHours === i;
                    return (
                      <TouchableOpacity
                        key={`h-${i}`}
                        style={[styles.timeItem, active && styles.timeItemActive]}
                        onPress={() => setTempHours(i)}
                      >
                        <Text style={[styles.timeItemText, active && styles.timeItemTextActive]}>
                          {i.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.timeSeparator}>
                <Text style={styles.separatorText}>:</Text>
              </View>

              {/* Minutes Column */}
              <View style={styles.timeColumn}>
                <Text style={styles.columnLabel}>MINUTE</Text>
                <ScrollView 
                  ref={minutesScrollRef}
                  showsVerticalScrollIndicator={false} 
                  snapToInterval={horizontalScale(50)}
                  decelerationRate="fast"
                >
                  {Array.from({ length: 60 }).map((_, i) => {
                    const active = tempMinutes === i;
                    return (
                      <TouchableOpacity
                        key={`m-${i}`}
                        style={[styles.timeItem, active && styles.timeItemActive]}
                        onPress={() => setTempMinutes(i)}
                      >
                        <Text style={[styles.timeItemText, active && styles.timeItemTextActive]}>
                          {i.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity style={styles.saveTimeBtn} onPress={onSave}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveTimeGradient}
              >
                <Text style={styles.saveTimeBtnText}>Update Schedule</Text>
                <Check color="#FFFFFF" size={20} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Pressable>
    </Modal>
  );
};
