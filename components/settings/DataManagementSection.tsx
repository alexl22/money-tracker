import { ChevronDown, Database, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { horizontalScale, moderateScale } from '../../utils/scaling';

interface DataManagementSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  onClearTransactions: () => void;
  onClearLoans: () => void;
  styles: any;
}

export function DataManagementSection({
  isExpanded,
  onToggle,
  onClearTransactions,
  onClearLoans,
  styles,
}: DataManagementSectionProps) {
  return (
    <View style={styles.securityWrapper}>
      <TouchableOpacity
        style={[styles.actionCard, isExpanded && styles.actionCardExpanded]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.actionCardLeft}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
            <Database color="#3b82f6" size={20} />
          </View>
          <Text style={styles.actionCardTitle}>Data Management</Text>
        </View>
        <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
          <ChevronDown color="rgba(255,255,255,0.4)" size={20} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.securityDropdown}>
          <TouchableOpacity
            style={[styles.actionCard, { marginTop: 0, height: horizontalScale(60), borderColor: 'rgba(239, 68, 68, 0.2)' }]}
            onPress={onClearTransactions}
            activeOpacity={0.7}
          >
            <View style={styles.actionCardLeft}>
              <View style={[styles.iconCircle, { width: 36, height: 36, backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                <Trash2 color="#ef4444" size={16} />
              </View>
              <Text style={[styles.actionCardTitle, { fontSize: moderateScale(14) }]}>Clear All Transactions</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { marginTop: 0, marginBottom: 0, height: horizontalScale(60), borderColor: 'rgba(239, 68, 68, 0.2)' }]}
            onPress={onClearLoans}
            activeOpacity={0.7}
          >
            <View style={styles.actionCardLeft}>
              <View style={[styles.iconCircle, { width: 36, height: 36, backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                <Trash2 color="#ef4444" size={16} />
              </View>
              <Text style={[styles.actionCardTitle, { fontSize: moderateScale(14) }]}>Clear All Loans</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
