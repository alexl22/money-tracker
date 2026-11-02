import { StyleSheet } from 'react-native';
import { horizontalScale, moderateScale } from '../utils/scaling';

export const styles = StyleSheet.create({
  viewContainer: { flex: 1 },
  headerRow: {
    marginBottom: 10,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  headerTitleContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    height: 32,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  absoluteInput: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    textAlign: 'center',
    height: 32,
    lineHeight: Math.round(moderateScale(13)) * 1.5
  },
  headerTitle: {
    fontSize: Math.round(moderateScale(13)),
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1.2,
    fontFamily: 'Inter_700Bold',
    padding: 0,
    lineHeight: Math.round(moderateScale(13)) * 1.5
  },
  headerTitleStatic: {
    fontSize: Math.round(moderateScale(13)),
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    letterSpacing: 1.2,
    fontFamily: 'Inter_600SemiBold'
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 15 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  dotActive: { width: 16, backgroundColor: '#3b82f6ff' },
  ringContainer: { alignItems: 'center', justifyContent: 'center', height: horizontalScale(230), position: 'relative' },
  ringCenterText: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  ringGoalLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontFamily: 'Inter_600SemiBold' },
  ringGoalValue: { fontSize: 28, width: 165, textAlign: 'center', fontFamily: 'Manrope_800ExtraBold', color: '#FFFFFF' },
  ringPercent: { color: '#67E8F9', fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  motivationalText: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginBottom: 24, fontSize: 13, lineHeight: 20 },
  summaryRow: { marginBottom: 24 },
  goalStatusCard: { backgroundColor: 'rgba(28, 29, 31, 0.8)', borderRadius: 24, padding: 18, minHeight: 130, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', position: 'relative', overflow: 'hidden' },
  deleteTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.12)',
    backgroundColor: 'rgba(255, 77, 77, 0.04)',
    alignSelf: 'center',
    marginBottom: 10
  },
  deleteText: {
    color: 'rgba(255, 77, 77, 0.5)',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    marginLeft: 8
  },
  forecastCaption: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
    fontFamily: 'Inter_500Medium',
    paddingHorizontal: 20
  },
  statusLabel: {
    fontSize: moderateScale(11),
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: horizontalScale(4),
    fontFamily: 'Inter_600SemiBold',
  },
  statusValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(20),
    color: '#FFFFFF',
  },
  periodLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
  goalStatusIconContainer: { position: 'absolute', right: -20, width: 140, alignItems: 'center' },
  goalStatusIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  performanceCard: { backgroundColor: 'rgba(28, 29, 31, 0.8)', borderRadius: 24, padding: 20, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  perfLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Manrope_700Bold' },
  perfValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 26 },
  perfTargetLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter_600SemiBold' },
  perfTargetValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 21, color: '#FFFFFF', marginTop: 4 },
  perfStatusBox: { marginTop: 24, borderRadius: 16, borderLeftWidth: 4, overflow: 'hidden' },
  perfStatusContent: { padding: 20 },
  perfStatusText: { fontSize: 13, color: '#FFFFFF', lineHeight: 20, fontFamily: 'Inter_600SemiBold' },
});
