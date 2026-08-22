import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  Pressable,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import {
  ArrowLeft,
  Briefcase,
  Clock,
  Coins,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  X,
  Check
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useShifts, Job, Shift } from '../context/ShiftsContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAlert } from '../context/AlertContext';
import { Colors } from '../constants/DesignSystem';
import { horizontalScale, moderateScale } from '../utils/scaling';
import { DatePicker } from '../components/DatePicker';

export default function ShiftsScreen() {
  const { jobs, shifts, loading, addJob, deleteJob, addShift, updateShift, deleteShift } = useShifts();
  const { format, currency } = useCurrency();
  const { showAlert } = useAlert();

  // Modals visibility
  const [isLogShiftVisible, setIsLogShiftVisible] = useState(false);
  const [isManageJobsVisible, setIsManageJobsVisible] = useState(false);
  const [isEditShiftVisible, setIsEditShiftVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // Forms state
  const [selectedJobId, setSelectedJobId] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date());
  const [shiftHours, setShiftHours] = useState('');
  const [shiftTips, setShiftTips] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');

  // Job form state
  const [newJobName, setNewJobName] = useState('');
  const [newJobRate, setNewJobRate] = useState('');

  // Edit Shift state
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editTips, setEditTips] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Dropdown helper
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);

  // Stats calculation (current month)
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalHours = 0;
    let basePay = 0;
    let tips = 0;
    let totalPay = 0;

    shifts.forEach((s) => {
      let shiftDateObj: Date;
      const rawDate = s.date;

      if (rawDate && typeof rawDate.toDate === 'function') {
        shiftDateObj = rawDate.toDate();
      } else if (rawDate instanceof Date) {
        shiftDateObj = rawDate;
      } else if (rawDate && typeof rawDate.seconds === 'number') {
        shiftDateObj = new Date(rawDate.seconds * 1000);
      } else {
        shiftDateObj = new Date(rawDate);
      }

      if (shiftDateObj.getMonth() === currentMonth && shiftDateObj.getFullYear() === currentYear) {
        totalHours += s.hours;
        basePay += s.basePay;
        tips += s.tips;
        totalPay += s.totalPay;
      }
    });

    const averageHourly = totalHours > 0 ? totalPay / totalHours : 0;

    return {
      totalHours,
      basePay,
      tips,
      totalPay,
      averageHourly
    };
  }, [shifts]);

  const handleSaveJob = async () => {
    if (!newJobName.trim() || !newJobRate.trim()) {
      showAlert('Required Fields', 'Please enter a job name and hourly rate.', 'alert');
      return;
    }
    const rate = parseFloat(newJobRate);
    if (isNaN(rate) || rate < 0) {
      showAlert('Invalid Rate', 'Please enter a valid hourly rate.', 'alert');
      return;
    }
    try {
      await addJob(newJobName.trim(), rate);
      setNewJobName('');
      setNewJobRate('');
      showAlert('Job Added', 'New job has been created successfully.', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to save job.', 'alert');
    }
  };

  const handleDeleteJob = (jobId: string, jobName: string) => {
    showAlert(
      'Delete Job',
      `Are you sure you want to delete "${jobName}"? Existing shifts won't be deleted, but you won't be able to select this job anymore.`,
      'alert',
      async () => {
        try {
          await deleteJob(jobId);
        } catch (e) {
          console.error(e);
        }
      },
      true
    );
  };

  const handleSaveShift = async () => {
    if (!selectedJobId) {
      showAlert('Job Required', 'Please select a job for this shift.', 'alert');
      return;
    }
    const hoursNum = parseFloat(shiftHours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      showAlert('Invalid Hours', 'Please enter a valid duration of hours.', 'alert');
      return;
    }
    const tipsNum = parseFloat(shiftTips) || 0;
    if (tipsNum < 0) {
      showAlert('Invalid Tips', 'Please enter a valid tips amount.', 'alert');
      return;
    }

    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) return;

    try {
      await addShift(job.id, job.name, shiftDate, hoursNum, job.hourlyRate, tipsNum, shiftNotes);
      setIsLogShiftVisible(false);
      // Reset inputs
      setSelectedJobId('');
      setShiftDate(new Date());
      setShiftHours('');
      setShiftTips('');
      setShiftNotes('');
      showAlert('Shift Logged', 'Your shift has been recorded.', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to log shift.', 'alert');
    }
  };

  const handleOpenEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setEditHours(shift.hours.toString());
    setEditTips(shift.tips.toString());
    setEditNotes(shift.notes || '');
    setIsEditShiftVisible(true);
  };

  const handleSaveEditShift = async () => {
    if (!editingShift) return;
    const hoursNum = parseFloat(editHours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      showAlert('Invalid Hours', 'Please enter a valid duration of hours.', 'alert');
      return;
    }
    const tipsNum = parseFloat(editTips) || 0;
    if (tipsNum < 0) {
      showAlert('Invalid Tips', 'Please enter a valid tips amount.', 'alert');
      return;
    }

    try {
      await updateShift(editingShift.id, {
        hours: hoursNum,
        tips: tipsNum,
        notes: editNotes
      });
      setIsEditShiftVisible(false);
      setEditingShift(null);
      showAlert('Shift Updated', 'Shift details have been saved.', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to update shift.', 'alert');
    }
  };

  const handleDeleteShift = () => {
    if (!editingShift) return;
    showAlert(
      'Delete Shift',
      'Are you sure you want to delete this shift record?',
      'alert',
      async () => {
        try {
          await deleteShift(editingShift.id);
          setIsEditShiftVisible(false);
          setEditingShift(null);
        } catch (e) {
          console.error(e);
        }
      },
      true
    );
  };

  const formatDateLabel = (timestamp: any) => {
    let d: Date;
    if (timestamp && typeof timestamp.toDate === 'function') {
      d = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      d = timestamp;
    } else if (timestamp && typeof timestamp.seconds === 'number') {
      d = new Date(timestamp.seconds * 1000);
    } else {
      d = new Date(timestamp);
    }
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#FFFFFF" size={moderateScale(24)} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shift Tracker</Text>
        <View style={{ width: moderateScale(40) }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Month Title */}
          <Text style={styles.monthTitle}>
            THIS MONTH ({new Date().toLocaleDateString('en-US', { month: 'long' })})
          </Text>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Clock color="#3b82f6" size={20} style={styles.statIcon} />
              <Text style={styles.statLabel}>HOURS WORKED</Text>
              <Text style={styles.statValue}>{stats.totalHours.toFixed(1)}h</Text>
            </View>

            <View style={styles.statCard}>
              <Coins color="#10b981" size={20} style={styles.statIcon} />
              <Text style={styles.statLabel}>HOURLY AVG</Text>
              <Text style={styles.statValue}>
                {format(stats.averageHourly, { isConverted: true })}/h
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>BASE PAY</Text>
              <Text style={[styles.statValue, { fontSize: moderateScale(18), color: '#ffffffb3' }]}>
                {format(stats.basePay, { isConverted: true })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TIPS EARNED</Text>
              <Text style={[styles.statValue, { fontSize: moderateScale(18), color: '#10b981' }]}>
                {format(stats.tips, { isConverted: true })}
              </Text>
            </View>
          </View>

          {/* Main Month earnings */}
          <View style={styles.totalPayCard}>
            <Text style={styles.totalPayLabel}>ESTIMATED EARNINGS</Text>
            <Text style={styles.totalPayValue}>
              {format(stats.totalPay, { isConverted: true })}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#1C1D1F', borderColor: 'rgba(255,255,255,0.08)' }]}
              onPress={() => setIsManageJobsVisible(true)}
            >
              <Briefcase color="rgba(255,255,255,0.6)" size={18} />
              <Text style={styles.actionBtnText}>Manage Jobs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}
              onPress={() => setIsLogShiftVisible(true)}
            >
              <Plus color="#FFFFFF" size={18} />
              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Log Shift</Text>
            </TouchableOpacity>
          </View>

          {/* History Label */}
          <Text style={styles.historyLabel}>RECENT SHIFTS</Text>

          {/* Shifts List */}
          {shifts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No shifts logged yet.</Text>
            </View>
          ) : (
            shifts.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.shiftRow}
                activeOpacity={0.7}
                onPress={() => handleOpenEditShift(item)}
              >
                <View style={styles.shiftLeft}>
                  <Text style={styles.shiftJobName}>{item.jobName}</Text>
                  <Text style={styles.shiftDate}>{formatDateLabel(item.date)}</Text>
                </View>

                <View style={styles.shiftRight}>
                  <Text style={styles.shiftTotalPay}>
                    {format(item.totalPay, { isConverted: true })}
                  </Text>
                  <Text style={styles.shiftHoursText}>
                    {item.hours}h • {format(item.hourlyRate, { isConverted: true })}/h
                  </Text>
                  {item.tips > 0 && (
                    <Text style={styles.shiftTipsBadge}>
                      +{format(item.tips, { isConverted: true })} tips
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: horizontalScale(60) }} />
        </ScrollView>
      )}

      {/* MODAL 1: Log Shift */}
      <Modal
        visible={isLogShiftVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLogShiftVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Shift</Text>
              <TouchableOpacity onPress={() => setIsLogShiftVisible(false)}>
                <X color="rgba(255,255,255,0.4)" size={20} />
              </TouchableOpacity>
            </View>

            {jobs.length === 0 ? (
              <View style={styles.noJobsContainer}>
                <Text style={styles.noJobsText}>Please create a job first before logging shifts.</Text>
                <TouchableOpacity
                  style={styles.createJobBtnInline}
                  onPress={() => {
                    setIsLogShiftVisible(false);
                    setIsManageJobsVisible(true);
                  }}
                >
                  <Text style={styles.createJobBtnInlineText}>Go to Manage Jobs</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Job Selector Dropdown */}
                <Text style={styles.inputLabel}>SELECT JOB</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setIsJobDropdownOpen(!isJobDropdownOpen)}
                >
                  <Text style={styles.dropdownValue}>
                    {jobs.find((j) => j.id === selectedJobId)?.name || 'Select a Job...'}
                  </Text>
                  <ChevronDown color="rgba(255,255,255,0.4)" size={20} />
                </TouchableOpacity>

                {isJobDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    {jobs.map((j) => (
                      <TouchableOpacity
                        key={j.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedJobId(j.id);
                          setIsJobDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{j.name}</Text>
                        <Text style={styles.dropdownItemSubText}>
                          {format(j.hourlyRate, { isConverted: true })}/h
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Date Picker Trigger */}
                <Text style={styles.inputLabel}>SHIFT DATE</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setIsDatePickerVisible(true)}
                >
                  <Text style={styles.dropdownValue}>{shiftDate.toLocaleDateString('en-GB')}</Text>
                  <CalendarIcon color="rgba(255,255,255,0.4)" size={20} />
                </TouchableOpacity>

                {/* Hours Worked */}
                <Text style={styles.inputLabel}>HOURS WORKED</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. 8.5"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="numeric"
                  value={shiftHours}
                  onChangeText={setShiftHours}
                />

                {/* Tips (Optional) */}
                <Text style={styles.inputLabel}>TIPS RECEIVED (OPTIONAL)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Leave empty if tips are not known yet"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="numeric"
                  value={shiftTips}
                  onChangeText={setShiftTips}
                />

                {/* Notes (Optional) */}
                <Text style={styles.inputLabel}>NOTES</Text>
                <TextInput
                  style={[styles.inputField, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                  placeholder="Anything to remember..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  multiline
                  value={shiftNotes}
                  onChangeText={setShiftNotes}
                />

                {/* Submit */}
                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveShift}>
                  <Text style={styles.submitBtnText}>LOG SHIFT</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: Manage Jobs */}
      <Modal
        visible={isManageJobsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsManageJobsVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Jobs</Text>
              <TouchableOpacity onPress={() => setIsManageJobsVisible(false)}>
                <X color="rgba(255,255,255,0.4)" size={20} />
              </TouchableOpacity>
            </View>

            {/* Add Job Form */}
            <View style={styles.addJobContainer}>
              <Text style={styles.sectionLabel}>ADD NEW JOB</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Job Name (e.g. Waiter)"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={newJobName}
                onChangeText={setNewJobName}
              />
              <TextInput
                style={styles.inputField}
                placeholder={`Hourly Rate (${currency})`}
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                value={newJobRate}
                onChangeText={setNewJobRate}
              />
              <TouchableOpacity style={styles.addJobBtn} onPress={handleSaveJob}>
                <Text style={styles.addJobBtnText}>Create Job</Text>
              </TouchableOpacity>
            </View>

            {/* Jobs List */}
            <Text style={styles.sectionLabel}>YOUR JOBS</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {jobs.length === 0 ? (
                <Text style={styles.noJobsListedText}>No jobs created yet.</Text>
              ) : (
                jobs.map((j) => (
                  <View key={j.id} style={styles.jobRow}>
                    <View>
                      <Text style={styles.jobRowName}>{j.name}</Text>
                      <Text style={styles.jobRowRate}>
                        {format(j.hourlyRate, { isConverted: true })}/h
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteJob(j.id, j.name)}>
                      <Trash2 color="#ef4444" size={20} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 3: Edit Shift (for updating tips later) */}
      <Modal
        visible={isEditShiftVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsEditShiftVisible(false);
          setEditingShift(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Shift</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsEditShiftVisible(false);
                  setEditingShift(null);
                }}
              >
                <X color="rgba(255,255,255,0.4)" size={20} />
              </TouchableOpacity>
            </View>

            {editingShift && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.editShiftMeta}>
                  {editingShift.jobName} • {formatDateLabel(editingShift.date)}
                </Text>

                {/* Edit Hours */}
                <Text style={styles.inputLabel}>HOURS WORKED</Text>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  value={editHours}
                  onChangeText={setEditHours}
                />

                {/* Edit Tips */}
                <Text style={styles.inputLabel}>TIPS RECEIVED</Text>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  placeholder="0"
                  value={editTips}
                  onChangeText={setEditTips}
                />

                {/* Edit Notes */}
                <Text style={styles.inputLabel}>NOTES</Text>
                <TextInput
                  style={[styles.inputField, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                  multiline
                  value={editNotes}
                  onChangeText={setEditNotes}
                />

                {/* Edit Operations */}
                <View style={styles.editButtonRow}>
                  <TouchableOpacity style={styles.deleteShiftBtn} onPress={handleDeleteShift}>
                    <Trash2 color="#ef4444" size={20} style={{ marginRight: 8 }} />
                    <Text style={styles.deleteShiftBtnText}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.saveEditBtn} onPress={handleSaveEditShift}>
                    <Check color="#FFFFFF" size={20} style={{ marginRight: 8 }} />
                    <Text style={styles.saveEditBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Shared DatePicker for Log Shift */}
      <DatePicker
        isVisible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        initialStartDate={shiftDate}
        title="SELECT SHIFT DATE"
        onSave={(date) => {
          setShiftDate(date);
          setIsDatePickerVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: horizontalScale(16),
    paddingTop: Platform.OS === 'ios' ? horizontalScale(50) : horizontalScale(20),
    height: horizontalScale(90),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(20)
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    padding: horizontalScale(24)
  },
  monthTitle: {
    fontSize: moderateScale(11),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    marginBottom: horizontalScale(16)
  },
  statsGrid: {
    flexDirection: 'row',
    gap: horizontalScale(16),
    marginBottom: horizontalScale(16)
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(20),
    padding: horizontalScale(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  statIcon: {
    marginBottom: horizontalScale(8)
  },
  statLabel: {
    fontSize: moderateScale(9),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: horizontalScale(4)
  },
  statValue: {
    fontSize: moderateScale(20),
    fontFamily: 'Manrope_800ExtraBold',
    color: '#FFFFFF'
  },
  totalPayCard: {
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(24),
    padding: horizontalScale(20),
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: horizontalScale(24),
    alignItems: 'center'
  },
  totalPayLabel: {
    fontSize: moderateScale(10),
    color: '#3b82f6',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    marginBottom: horizontalScale(6)
  },
  totalPayValue: {
    fontSize: moderateScale(30),
    fontFamily: 'Manrope_800ExtraBold',
    color: '#3b82f6'
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: horizontalScale(16),
    marginBottom: horizontalScale(32)
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: horizontalScale(56),
    borderRadius: moderateScale(18),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: horizontalScale(8)
  },
  actionBtnText: {
    fontSize: moderateScale(14),
    fontFamily: 'Manrope_700Bold',
    color: 'rgba(255,255,255,0.8)'
  },
  historyLabel: {
    fontSize: moderateScale(11),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    marginBottom: horizontalScale(16)
  },
  emptyContainer: {
    paddingVertical: horizontalScale(40),
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'Inter_500Medium',
    fontSize: moderateScale(14)
  },
  shiftRow: {
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(22),
    paddingHorizontal: horizontalScale(20),
    paddingVertical: horizontalScale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: horizontalScale(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  shiftLeft: {
    flex: 1,
    marginRight: horizontalScale(12)
  },
  shiftJobName: {
    fontSize: moderateScale(16),
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    marginBottom: horizontalScale(4)
  },
  shiftDate: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_400Regular'
  },
  shiftRight: {
    alignItems: 'flex-end'
  },
  shiftTotalPay: {
    fontSize: moderateScale(16),
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
    marginBottom: horizontalScale(2)
  },
  shiftHoursText: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_500Medium',
    marginBottom: horizontalScale(4)
  },
  shiftTipsBadge: {
    fontSize: moderateScale(11),
    color: '#10b981',
    fontFamily: 'Inter_700Bold',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: horizontalScale(6),
    paddingVertical: horizontalScale(2),
    borderRadius: moderateScale(6)
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#151517',
    borderTopLeftRadius: moderateScale(32),
    borderTopRightRadius: moderateScale(32),
    paddingHorizontal: horizontalScale(24),
    paddingTop: horizontalScale(20),
    paddingBottom: Platform.OS === 'ios' ? horizontalScale(40) : horizontalScale(24),
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: horizontalScale(24)
  },
  modalTitle: {
    fontSize: moderateScale(22),
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold'
  },
  noJobsContainer: {
    paddingVertical: horizontalScale(30),
    alignItems: 'center'
  },
  noJobsText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(14),
    textAlign: 'center',
    marginBottom: horizontalScale(20)
  },
  createJobBtnInline: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: horizontalScale(24),
    paddingVertical: horizontalScale(14),
    borderRadius: moderateScale(16)
  },
  createJobBtnInlineText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(14)
  },
  inputLabel: {
    fontSize: moderateScale(9),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    marginBottom: horizontalScale(8),
    marginTop: horizontalScale(16)
  },
  dropdownTrigger: {
    height: horizontalScale(56),
    borderRadius: moderateScale(16),
    backgroundColor: '#1C1D1F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(16),
    marginBottom: horizontalScale(8)
  },
  dropdownValue: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontFamily: 'Inter_500Medium'
  },
  dropdownMenu: {
    backgroundColor: '#202022',
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: horizontalScale(8),
    paddingVertical: horizontalScale(4),
    marginBottom: horizontalScale(16)
  },
  dropdownItem: {
    paddingVertical: horizontalScale(14),
    paddingHorizontal: horizontalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontFamily: 'Inter_500Medium'
  },
  dropdownItemSubText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: moderateScale(13),
    fontFamily: 'Inter_400Regular'
  },
  inputField: {
    height: horizontalScale(56),
    borderRadius: moderateScale(16),
    backgroundColor: '#1C1D1F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFFFFF',
    paddingHorizontal: horizontalScale(16),
    fontSize: moderateScale(15),
    fontFamily: 'Inter_500Medium',
    marginBottom: horizontalScale(8)
  },
  submitBtn: {
    backgroundColor: '#3b82f6',
    height: horizontalScale(58),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: horizontalScale(24)
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(16),
    letterSpacing: 0.5
  },
  addJobContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: horizontalScale(16),
    borderRadius: moderateScale(22),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: horizontalScale(24)
  },
  sectionLabel: {
    fontSize: moderateScale(10),
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    marginBottom: horizontalScale(12)
  },
  addJobBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    height: horizontalScale(48),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: horizontalScale(4)
  },
  addJobBtnText: {
    color: '#3b82f6',
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(14)
  },
  noJobsListedText: {
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(14),
    textAlign: 'center',
    paddingVertical: horizontalScale(30)
  },
  jobRow: {
    backgroundColor: '#1C1D1F',
    borderRadius: moderateScale(16),
    paddingHorizontal: horizontalScale(16),
    paddingVertical: horizontalScale(14),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: horizontalScale(10),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)'
  },
  jobRowName: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontFamily: 'Inter_600SemiBold'
  },
  jobRowRate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: moderateScale(13),
    fontFamily: 'Inter_400Regular',
    marginTop: 2
  },
  editShiftMeta: {
    fontSize: moderateScale(14),
    color: '#3b82f6',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: horizontalScale(16)
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: horizontalScale(16),
    marginTop: horizontalScale(24)
  },
  deleteShiftBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    height: horizontalScale(56),
    borderRadius: moderateScale(16),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteShiftBtnText: {
    color: '#ef4444',
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(15)
  },
  saveEditBtn: {
    flex: 2,
    backgroundColor: '#3b82f6',
    height: horizontalScale(56),
    borderRadius: moderateScale(16),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  saveEditBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    fontSize: moderateScale(15)
  }
});
