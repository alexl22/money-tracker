import { CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/loans.styles';
import { horizontalScale, moderateScale } from '../../utils/scaling';
import { Loan } from './types';

interface LoanCardProps {
  loan: Loan;
  isExpanded: boolean;
  onToggleExpand: (loanId: string) => void;
  onDelete: (loanId: string, displayName: string) => void;
  onToggleStatus: (loanId: string, currentStatus: 'active' | 'settled') => void;
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  currency: string;
  format: (amount: number, options?: any) => string;
  primaryColor: string;
}

export function LoanCard({
  loan,
  isExpanded,
  onToggleExpand,
  onDelete,
  onToggleStatus,
  currentUserId,
  currentUserEmail,
  currency,
  format,
  primaryColor,
}: LoanCardProps) {
  const isOwner = currentUserId
    ? (loan.userId === currentUserId || (loan.ownerEmail && loan.ownerEmail === currentUserEmail))
    : false;
  const effectiveType = isOwner ? loan.type : (loan.type === 'lent' ? 'borrowed' : 'lent');

  const displayName = isOwner ? loan.personName : (loan.ownerName || loan.ownerEmail?.split('@')[0] || 'From');

  const isSameCurrency = loan.currency === currency;
  const displayValueForLoan = isSameCurrency
    ? loan.amount
    : (loan.amountUSD || loan.amount);

  const finalLoanAmount = effectiveType === 'lent' ? -displayValueForLoan : displayValueForLoan;

  return (
    <View key={loan.id}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onToggleExpand(loan.id)}
        onLongPress={() => onDelete(loan.id, displayName)}
        delayLongPress={300}
        style={[
          styles.loanCard,
          { borderColor: effectiveType === 'lent' ? 'rgba(235, 86, 86, 0.6)' : 'rgba(16, 185, 129, 0.6)' }
        ]}
      >
        <View style={styles.loanMainContent}>
          <View style={styles.loanLeft}>
            <View style={styles.avatarContainer}>
              <Text style={[styles.avatarText, { color: effectiveType === 'lent' ? '#eb5656' : '#6ee591' }]}>
                {displayName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.loanName} numberOfLines={isExpanded ? undefined : 1}>
                {isOwner ? `To ${loan.personName}` : `From ${displayName}`}
              </Text>
              <Text style={styles.loanNote} numberOfLines={isExpanded ? undefined : 1}>{loan.note}</Text>
            </View>
          </View>
          <View style={styles.loanRight}>
            <Text
              style={[styles.loanAmount, { color: effectiveType === 'lent' ? '#eb5656' : '#6ee591' }]}
              numberOfLines={1}
            >
              {format(finalLoanAmount, {
                compact: true,
                showSign: true,
                threshold: 1000000,
                isConverted: isSameCurrency
              })}
            </Text>
            <TouchableOpacity
              style={styles.checkmarkContainer}
              onPress={() => onToggleStatus(loan.id, loan.status)}
            >
              <CheckCircle2
                color={loan.status === 'settled' ? primaryColor : "rgba(255,255,255,0.4)"}
                size={moderateScale(20)}
              />
            </TouchableOpacity>
          </View>
        </View>

        {isExpanded && Math.abs(displayValueForLoan) >= 1000000 && (
          <View style={styles.expandedSection}>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>EXACT AMOUNT</Text>
                <Text
                  style={[styles.detailValue, { color: effectiveType === 'lent' ? '#eb5656' : '#6ee591' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {format(finalLoanAmount, {
                    showSign: true,
                    isConverted: isSameCurrency
                  })}
                </Text>
              </View>
            </View>

            {loan.note && (
              <View style={{ marginTop: horizontalScale(12) }}>
                <Text style={styles.detailLabel}>NOTES</Text>
                <Text style={styles.fullNoteText}>{loan.note}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
