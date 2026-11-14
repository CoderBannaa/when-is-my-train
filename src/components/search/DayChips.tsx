import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Index 0 = Sunday, ..., 6 = Saturday

interface DayChipsProps {
  runsOn?: boolean[];
  selectedDayIndex: number; // 0..6 (Sun..Sat)
  isDarkMode?: boolean;
}

export const DayChips: React.FC<DayChipsProps> = React.memo(({
  runsOn = [true, true, true, true, true, true, true],
  selectedDayIndex,
  isDarkMode = false,
}) => {
  return (
    <View style={styles.container}>
      {DAY_LABELS.map((dayChar, idx) => {
        const isRunning = !!runsOn[idx];
        const isSelectedDay = idx === selectedDayIndex;

        return (
          <View key={idx} style={styles.dayCol}>
            <Text
              style={[
                styles.dayText,
                isRunning
                  ? [styles.dayRunning, { color: isDarkMode ? '#38BDF8' : '#2563EB' }]
                  : [styles.dayNotRunning, { color: isDarkMode ? '#64748B' : '#94A3B8' }],
                isSelectedDay && [
                  styles.daySelected,
                  {
                    textDecorationColor: isRunning
                      ? (isDarkMode ? '#38BDF8' : '#2563EB')
                      : (isDarkMode ? '#64748B' : '#94A3B8'),
                  },
                ],
              ]}
            >
              {dayChar}
            </Text>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dayCol: {
    minWidth: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  dayRunning: {
    fontWeight: '800',
  },
  dayNotRunning: {
    fontWeight: '400',
    opacity: 0.7,
  },
  daySelected: {
    textDecorationLine: 'underline',
    fontWeight: '900',
  },
});

