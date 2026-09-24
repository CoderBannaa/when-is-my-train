import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface CalendarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dateString: string, isPast: boolean) => void;
}

export const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({
  visible,
  onClose,
  onSelectDate,
}) => {
  const [selectedDay, setSelectedDay] = useState(13); // Today is 13 Sep 2026
  const currentMonth = 'September 2026';
  const TODAY = 13;
  const MIN_ALLOWED_DAY = 10; // Up to 3 days in the past (10, 11, 12 Sep)

  // 30 days in September
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDayName = (day: number) => {
    // 13 Sep 2026 is Sunday
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = (day - 13 + 70) % 7;
    return dayNames[d];
  };

  const isPastDay = (day: number) => day < TODAY;

  const handleConfirm = () => {
    const dayName = getDayName(selectedDay);
    const isPast = isPastDay(selectedDay);
    let label = `${selectedDay} Sep (${dayName})`;
    if (selectedDay === TODAY) {
      label = `Today, ${selectedDay} Sep`;
    } else if (selectedDay === TODAY - 1) {
      label = `Yesterday, ${selectedDay} Sep`;
    } else if (selectedDay === TODAY - 2) {
      label = `2 Days Ago (${selectedDay} Sep)`;
    } else if (selectedDay === TODAY - 3) {
      label = `3 Days Ago (${selectedDay} Sep)`;
    }
    onSelectDate(label, isPast);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Select Date</Text>
              <Text style={styles.modalSubtitle}>{currentMonth} • Past 3 Days History Available</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Past History Info Tag */}
          <View style={styles.historyInfoBanner}>
            <Ionicons name="time-outline" size={15} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.historyInfoText}>
              Past 3 days (10, 11, 12 Sep) enabled for delay & timing history.
            </Text>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekDaysRow}>
            {weekDays.map((w, idx) => (
              <Text key={idx} style={styles.weekDayText}>{w}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.daysGrid}>
            {daysInMonth.map((day) => {
              const isDisabled = day < MIN_ALLOWED_DAY; // Only older than 3 days disabled
              const isPast = day < TODAY && day >= MIN_ALLOWED_DAY; // 10, 11, 12
              const isSelected = day === selectedDay;
              const isToday = day === TODAY;

              return (
                <TouchableOpacity
                  key={day}
                  disabled={isDisabled}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isDisabled && styles.dayCellDisabled,
                    isPast && !isSelected && styles.dayCellPastEnabled,
                  ]}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                      isDisabled && styles.dayNumberDisabled,
                      isToday && !isSelected && styles.dayNumberToday,
                      isPast && !isSelected && styles.dayNumberPastEnabled,
                    ]}
                  >
                    {day}
                  </Text>
                  {isToday && !isSelected && <View style={styles.todayDot} />}
                  {isPast && !isSelected && <View style={styles.historyDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Footer */}
          <View style={styles.footer}>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedLabel}>
                {isPastDay(selectedDay) ? '📜 Past Run History Date:' : '📅 Selected Travel Date:'}
              </Text>
              <Text
                style={[
                  styles.selectedVal,
                  isPastDay(selectedDay) && { color: Colors.accent },
                ]}
              >
                {selectedDay} Sep 2026 ({getDayName(selectedDay)})
                {isPastDay(selectedDay) ? ' (Past Run)' : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>SET DATE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  historyInfoText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    width: 38,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 20,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellPastEnabled: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayNumberDisabled: {
    color: '#94A3B8',
  },
  dayNumberToday: {
    color: Colors.primary,
    fontWeight: '800',
  },
  dayNumberPastEnabled: {
    color: '#C2410C',
    fontWeight: '700',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  historyDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EA580C',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedInfo: {
    flex: 1,
    paddingRight: 8,
  },
  selectedLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  selectedVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
