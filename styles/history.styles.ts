import { StyleSheet } from 'react-native';
import { horizontalScale, moderateScale } from '../utils/scaling';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0c14' },
  scrollContent: {
    paddingHorizontal: horizontalScale(20),
    paddingTop: horizontalScale(20)
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1D1F',
    paddingVertical: horizontalScale(14),
    borderRadius: moderateScale(30),
    marginBottom: horizontalScale(16),
    position: 'relative',
  },
  monthText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(20),
    color: '#FFFFFF',
    letterSpacing: 1,
    paddingHorizontal: horizontalScale(40),
    textAlign: 'center',
  },
  summaryCardLarge: {
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(24),
    padding: moderateScale(16),
    marginBottom: horizontalScale(20),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(12),
  },
  largeCard: {
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(28),
    padding: horizontalScale(18),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: horizontalScale(4),
  },
  summaryMetric: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: moderateScale(30),
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: moderateScale(12),
  },
  summaryBottom: {
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: moderateScale(11),
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
    marginBottom: horizontalScale(4),
    fontFamily: 'Inter_600SemiBold',
  },
  profitValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(26),
  },
  summaryLabel: {
    fontSize: moderateScale(10),
    letterSpacing: 1.5,
    marginBottom: horizontalScale(4),
    fontFamily: 'Inter_700Bold',
  },
  summaryValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(22),
  },

  weekSelectorScroll: {
    marginBottom: horizontalScale(24),
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  weekCard: {
    width: horizontalScale(75),
    height: horizontalScale(75),
    backgroundColor: '#1A1B1E',
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  weekCardActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: horizontalScale(8) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(10),
    elevation: 8,
  },
  weekLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: moderateScale(9),
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginBottom: horizontalScale(4),
    textTransform: 'uppercase',

  },
  weekLabelActive: { color: 'rgba(255,255,255,0.8)' },
  weekNumber: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(22),
    color: 'rgba(255,255,255,0.6)',
    lineHeight: moderateScale(26),
  },
  weekNumberActive: { color: '#FFFFFF' },
  weekRange: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(9),
    color: 'rgba(255,255,255,0.4)',
    marginTop: horizontalScale(2),
  },
  weekRangeActive: {
    color: 'rgba(255,255,255,0.6)',
  },

  weekHeader: { marginBottom: horizontalScale(12) },
  weekTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(26),
    color: '#FFFFFF'
  },
  weekIncomeLabelSmall: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(14),
    color: 'rgba(255,255,255,0.3)',
    marginTop: horizontalScale(4),
  },
  weekIncomeValueSmall: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(16)
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: horizontalScale(24),
  },
  dayGroup: { marginBottom: horizontalScale(32) },
  daySeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: horizontalScale(16),
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: horizontalScale(10),
  },
  dayName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(26),
    color: '#FFFFFF'
  },
  dayDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.3)',
    marginTop: horizontalScale(2),
    letterSpacing: 0.5,
  },
  dailyTotalLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(9),
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 1,
    marginBottom: horizontalScale(2),
  },
  dailyTotalValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(20)
  },
  dayHeaderRight: {
    alignItems: 'flex-end',
    flex: 1,
    paddingLeft: horizontalScale(10)
  },
  transactionsContainerLegacy: {
    gap: horizontalScale(8),
  },
  transactionCard: {
    flexDirection: 'column',
    backgroundColor: '#1c1e24',
    padding: horizontalScale(14),
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
  },
  iconCircle: {
    width: horizontalScale(36),
    height: horizontalScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: horizontalScale(10),
  },
  transactionInfo: { flex: 1 },
  transactionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(17),
    color: '#FFFFFF',
  },
  transactionSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.3)',
    marginTop: horizontalScale(2),
  },
  itemSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: horizontalScale(8),
  },
  calendarIconContainer: {
    position: 'absolute',
    left: horizontalScale(16),
    width: horizontalScale(32),
    height: horizontalScale(32),
    borderRadius: moderateScale(8),
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronIconContainer: {
    position: 'absolute',
    right: horizontalScale(16),
    width: horizontalScale(32),
    height: horizontalScale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionAmount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(17)
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: horizontalScale(60),
    backgroundColor: '#1A1B1E',
    borderRadius: moderateScale(30),
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.07)',
  },
  emptyStateTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(18),
    color: 'rgba(255,255,255,0.8)',
    marginTop: horizontalScale(16),
  },
  emptyStateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.4)',
    marginTop: horizontalScale(4),
    textAlign: 'center',
    paddingHorizontal: horizontalScale(40),
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionCardExpanded: {
    backgroundColor: '#24262c',
  },
  expandedContent: {
    marginTop: horizontalScale(4),
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: horizontalScale(12),
  },
  detailSection: {
    width: '100%',
    alignItems: 'flex-start',
  },
  detailValueLarge: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(22),
    width: '100%',
  },
  detailLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: moderateScale(9),
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    marginBottom: horizontalScale(4),
  },
  detailValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: moderateScale(18),
  },
  detailValueSmall: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  notesText: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.6)',
    lineHeight: moderateScale(18),
  },

  detailSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  detailSectionRowRight: {
    justifyContent: 'flex-end',
  },
  detailInfo: {
    flex: 1,
  },
  inlineDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(235, 86, 86, 0.1)',
    paddingVertical: horizontalScale(8),
    paddingHorizontal: horizontalScale(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: 'rgba(235, 86, 86, 0.2)',
    gap: horizontalScale(6),
  },
  inlineDeleteText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(13),
    color: '#eb5656',
  },
  weekTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  filterIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1D1F',
    paddingVertical: horizontalScale(8),
    paddingHorizontal: horizontalScale(12),
    borderRadius: moderateScale(12),
    gap: horizontalScale(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterIconButtonActive: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filterModeLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: moderateScale(11),
    letterSpacing: 0.5,
  },

});

export default styles;
