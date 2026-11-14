import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

interface DateStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onOpenCalendar: () => void;
  isDarkMode?: boolean;
  colors?: any;
  t?: (key: any) => string;
}

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export const DateStrip: React.FC<DateStripProps> = React.memo(({
  selectedDate,
  onSelectDate,
  onOpenCalendar,
  isDarkMode = false,
  colors = {},
  t = (s: string) => s,
}) => {
  const next7Days = useMemo(() => {
    const list: { label: string; date: Date }[] = [];
    const now = new Date();
    const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      let label = '';
      if (i === 0) label = t('today') || 'Today';
      else if (i === 1) label = t('tomorrow') || 'Tomorrow';
      else label = `${daysShort[d.getDay()]} ${d.getDate()}`;

      list.push({ label, date: d });
    }
    return list;
  }, [t]);

  return (
    <View
      style={[
        styles.dateStripWrapper,
        {
          backgroundColor: isDarkMode ? (colors.surface || '#1E293B') : '#FFFFFF',
          borderBottomColor: isDarkMode ? (colors.border || '#334155') : '#E2E8F0',
        },
      ]}
    >
      {/* Calendar Button */}
      <TouchableOpacity
        style={[
          styles.calendarIconButton,
          {
            backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9',
            borderColor: isDarkMode ? (colors.border || '#334155') : '#E2E8F0',
          },
        ]}
        onPress={onOpenCalendar}
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel="Open calendar date picker"
      >
        <Ionicons name="calendar-outline" size={17} color={isDarkMode ? '#38BDF8' : Colors.primary} />
      </TouchableOpacity>

      {/* 7-Day Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStripScrollContent}
      >
        {next7Days.map((item) => {
          const isSelected = isSameCalendarDay(item.date, selectedDate);
          return (
            <TouchableOpacity
              key={item.date.toISOString()}
              style={[
                styles.dateChip,
                {
                  backgroundColor: isSelected
                    ? (isDarkMode ? '#0284C7' : Colors.primary)
                    : (isDarkMode ? '#0F172A' : '#F8FAFC'),
                  borderColor: isSelected
                    ? (isDarkMode ? '#38BDF8' : Colors.primary)
                    : (isDarkMode ? '#334155' : '#E2E8F0'),
                },
              ]}
              onPress={() => onSelectDate(item.date)}
              activeOpacity={0.75}
              accessible={true}
              accessibilityLabel={`Select travel date ${item.label}`}
            >
              <Text
                style={[
                  styles.dateChipText,
                  {
                    color: isSelected
                      ? '#FFFFFF'
                      : (isDarkMode ? '#CBD5E1' : '#334155'),
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  dateStripWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingLeft: 10,
    borderBottomWidth: 1,
  },
  calendarIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dateStripScrollContent: {
    paddingRight: 14,
    gap: 7,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateChipText: {
    fontSize: 12,
  },
});

