import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { horizontalScale, moderateScale } from '../utils/scaling';


interface MonthYearPickerProps {
    isVisible: boolean;
    onClose: () => void;
    selectedMonth: string;
    selectedYear: number;
    onSelectMonth: (month: string) => void;
    onSelectYear: (year: number) => void;
    isAllSelected?: boolean;
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

export default function MonthYearPicker({ isVisible, onClose, selectedMonth, selectedYear, onSelectMonth, onSelectYear, isAllSelected }: MonthYearPickerProps) {

    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    const [viewYear, setViewYear] = useState(selectedYear);

    useEffect(() => {
        if(isVisible){
            setViewYear(selectedYear);
        }
    }, [isVisible]);
    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType='fade'
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <Pressable
                style={styles.modalOverlay}
                onPress={onClose}
            >
                <View style={styles.modalContent}>
                    <View style={styles.yearNavigator}>
                        <Pressable onPress={() => setViewYear(viewYear - 1)} style={styles.navButton}>
                            <ChevronLeft color="#3b82f6" size={moderateScale(24)} strokeWidth={3} />
                        </Pressable>
                        <View style={styles.yearContainer}>
                            <Text style={styles.yearText}>{viewYear}</Text>
                        </View>
                        <Pressable
                            onPress={() => { if (viewYear < currentYear) { setViewYear(viewYear + 1) } }}
                            style={[styles.navButton, { opacity: viewYear >= currentYear ? 0.3 : 1 }]}
                        >
                            <ChevronRight color="#3b82f6" size={moderateScale(24)} strokeWidth={3} />
                        </Pressable>
                    </View>

                    <View style={styles.dividerContainer}>
                        <LinearGradient
                            colors={['transparent', '#3b82f6', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.fadedLine}
                        />
                    </View>

                    <View style={styles.monthGrid}>
                        {LUNI.map((item) => {
                            const isFutureMonth = viewYear === currentYear && parseInt(item.value) > currentDate.getMonth();
                            const isActive = !isAllSelected && selectedMonth === item.value && viewYear === selectedYear;

                            return (
                                <TouchableOpacity
                                    key={item.value}
                                    disabled={isFutureMonth}
                                    style={[
                                        styles.gridMonthItem,
                                        isFutureMonth && { opacity: 0.15 }
                                    ]}
                                    onPress={() => {
                                        onSelectYear(viewYear);
                                        onSelectMonth(item.value);
                                        onClose();
                                    }}
                                >
                                    {isActive ? (
                                        <LinearGradient
                                            colors={['#6366f1', '#3b82f6']}
                                            style={styles.activeMonthGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Text style={styles.gridMonthTextActive}>
                                                {item.sub}
                                            </Text>
                                        </LinearGradient>
                                    ) : (
                                        <Text style={[
                                            styles.gridMonthText,
                                            isFutureMonth && { color: 'rgba(255,255,255,0.25)' }
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
        backgroundColor: 'rgba(0,0,0,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: horizontalScale(20),
    },
    modalContent: {
        backgroundColor: '#0F1014', // Jet Black
        borderRadius: moderateScale(28),
        paddingHorizontal: horizontalScale(24),
        paddingVertical: horizontalScale(24),
        width: '93%',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.05)',
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
        width: horizontalScale(40),
        height: horizontalScale(40),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: moderateScale(14),
        backgroundColor: 'rgba(6, 182, 212, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.15)',
    },
    yearContainer: {
        alignItems: 'center',
    },
    yearText: {
        fontSize: moderateScale(30),
        color: '#FFFFFF',
        fontFamily: 'Manrope_800ExtraBold',
        letterSpacing: 2,
    },
    dividerContainer: {
        height: horizontalScale(1),
        width: '100%',
        marginBottom: horizontalScale(20),
        justifyContent: 'center',
    },
    fadedLine: {
        height: horizontalScale(1.5),
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
        height: horizontalScale(50),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: moderateScale(14),
        marginBottom: horizontalScale(10),
        backgroundColor: '#1A1B21', // Dark Slate
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    activeMonthGradient: {
        width: '100%',
        height: '100%',
        borderRadius: moderateScale(16),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#06B6D4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    },
    gridMonthText: {
        fontSize: moderateScale(14),
        color: 'rgba(255,255,255,0.75)',
        fontFamily: 'Inter_700Bold',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    gridMonthTextActive: {
        color: '#FFFFFF',
        fontFamily: 'Manrope_800ExtraBold',
        fontSize: moderateScale(14),
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});