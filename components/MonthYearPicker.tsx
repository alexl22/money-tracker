import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { horizontalScale, moderateScale } from '../utils/scaling';


interface MonthYearPickerProps {
    isVisible: boolean;
    onClose: () => void;
    selectedMonth: string;
    selectedYear: number;
    onSelectMonth: (month: string) => void;
    onSelectYear: (year: number) => void;
}


export const LUNI = [
    { value: '0', sub: 'JAN', label: 'JANUARY' },
    { value: '1', sub: 'FEB', label: 'FEBRUARY' },
    { value: '2', sub: 'MAR', label: 'MARCH' },
    { value: '3', sub: 'APR', label: 'APRIL' },
    { value: '4', sub: 'MAY', label: 'MAY' },
    { value: '5', sub: 'JUN', label: 'JUNE' },
    { value: '6', sub: 'JUL', label: 'JULY' },
    { value: '7', sub: 'AUG', label: 'AUGUST' },
    { value: '8', sub: 'SEP', label: 'SEPTEMBER' },
    { value: '9', sub: 'OCT', label: 'OCTOBER' },
    { value: '10', sub: 'NOV', label: 'NOVEMBER' },
    { value: '11', sub: 'DEC', label: 'DECEMBER' },
];

export default function MonthYearPicker({ isVisible, onClose, selectedMonth, selectedYear, onSelectMonth, onSelectYear }: MonthYearPickerProps) {

    const currentYear = new Date().getFullYear();
    const currentDate = new Date();

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                style={styles.modalOverlay}
                onPress={onClose}
            >
                <View style={styles.modalContent}>
                    <View style={styles.yearNavigator}>
                        <Pressable onPress={() => onSelectYear(selectedYear - 1)} style={styles.navButton}>
                            <ChevronLeft color="#FFFFFF" size={moderateScale(20)} strokeWidth={2.5} />
                        </Pressable>
                        <View style={styles.yearContainer}>
                            <Text style={styles.yearText}>{selectedYear}</Text>
                        </View>
                        <Pressable
                            onPress={() => { if (selectedYear < currentYear) { onSelectYear(selectedYear + 1) } }}
                            style={[styles.navButton, { opacity: selectedYear >= currentYear ? 0.3 : 1 }]}
                        >
                            <ChevronRight color="#FFFFFF" size={moderateScale(20)} strokeWidth={2.5} />
                        </Pressable>
                    </View>

                    <View style={styles.dividerContainer}>
                        <LinearGradient
                            colors={['transparent', 'rgba(59, 130, 246, 0.4)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.fadedLine}
                        />
                    </View>

                    <View style={styles.monthGrid}>
                        {LUNI.map((item) => {
                            const isFutureMonth = selectedYear === currentYear && parseInt(item.value) > currentDate.getMonth();
                            const isActive = selectedMonth === item.value;

                            return (
                                <TouchableOpacity
                                    key={item.value}
                                    disabled={isFutureMonth}
                                    style={[
                                        styles.gridMonthItem,
                                        isFutureMonth && { opacity: 0.2 }
                                    ]}
                                    onPress={() => {
                                        onSelectMonth(item.value);
                                        onClose();
                                    }}
                                >
                                    {isActive ? (
                                        <LinearGradient
                                            colors={['#3b82f6', '#2563eb']}
                                            style={styles.activeMonthGradient}
                                        >
                                            <Text style={styles.gridMonthTextActive}>
                                                {item.sub}
                                            </Text>
                                        </LinearGradient>
                                    ) : (
                                        <Text style={[
                                            styles.gridMonthText,
                                            isFutureMonth && { color: 'rgba(255,255,255,0.1)' }
                                        ]}>
                                            {item.sub}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </Pressable>
        </Modal>
    )
}


const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: horizontalScale(20),
    },
    modalContent: {
        backgroundColor: '#131416',
        borderRadius: moderateScale(28),
        paddingHorizontal: horizontalScale(24),
        paddingVertical: horizontalScale(24),
        width: '95%', // Increased to make the whole UI larger again
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    yearNavigator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: horizontalScale(20),
    },
    navButton: {
        width: horizontalScale(42), // Larger buttons
        height: horizontalScale(42),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: moderateScale(12),
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    yearContainer: {
        alignItems: 'center',
    },
    yearText: {
        fontSize: moderateScale(28), // Larger year
        color: '#ffffffff',
        fontFamily: 'Manrope_800ExtraBold',
        letterSpacing: 3,
    },
    dividerContainer: {
        height: horizontalScale(1),
        width: '100%',
        marginBottom: horizontalScale(24),
        justifyContent: 'center',
    },
    fadedLine: {
        height: horizontalScale(1),
        width: '100%',
        borderRadius: moderateScale(1),
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
    },
    gridMonthItem: {
        width: '31%',
        height: horizontalScale(54), // Taller, meatier buttons
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: moderateScale(16),
        marginBottom: horizontalScale(12),
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    activeMonthGradient: {
        width: '100%',
        height: '100%',
        borderRadius: moderateScale(16),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    gridMonthText: {
        fontSize: moderateScale(15), // Larger text
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'Inter_700Bold',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    gridMonthTextActive: {
        color: '#FFFFFF',
        fontFamily: 'Inter_700Bold',
        fontSize: moderateScale(15), // Larger active text
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
});