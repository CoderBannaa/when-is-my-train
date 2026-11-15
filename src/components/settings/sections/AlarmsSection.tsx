import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../SectionCard';
import {
  usePreferences,
  AlarmTiming,
} from '../../../context/PreferencesContext';

const TIMING_OPTIONS: { id: AlarmTiming; label: string }[] = [
  { id: '10m', label: '10 min' },
  { id: '15m', label: '15 min' },
  { id: '30m', label: '30 min' },
  { id: '5km', label: '5 km' },
  { id: '10km', label: '10 km' },
];

export const AlarmsSection: React.FC = () => {
  const { defaultAlarmTiming, setDefaultAlarmTiming, isDarkMode } = usePreferences();

  return (
    <SectionCard title="Station Alarm" icon="alarm-outline">
      <View style={styles.subBlock}>
        <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
          Default Wake-Up Trigger
        </Text>
        <View style={styles.chipRow}>
          {TIMING_OPTIONS.map((opt) => {
            const isSelected = defaultAlarmTiming === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.75}
                onPress={() => setDefaultAlarmTiming(opt.id)}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Wake up ${opt.label} before destination`}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? '#0284C7'
                      : isDarkMode
                      ? '#0F172A'
                      : '#F1F5F9',
                    borderColor: isSelected
                      ? '#0284C7'
                      : isDarkMode
                      ? '#334155'
                      : '#E2E8F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected
                        ? '#FFFFFF'
                        : isDarkMode
                        ? '#F8FAFC'
                        : '#0F172A',
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.hintText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
          Pre-selected timing interval when scheduling new station wake-up alarms.
        </Text>
      </View>

      {/* Info notice about alarm behavior */}
      <View
        style={[
          styles.infoNotice,
          {
            backgroundColor: isDarkMode ? '#0F172A' : '#EFF6FF',
            borderColor: isDarkMode ? '#1E3A8A' : '#BFDBFE',
          },
        ]}
      >
        <Ionicons name="information-circle-outline" size={18} color="#0284C7" style={{ marginRight: 8 }} />
        <Text
          style={[
            styles.infoText,
            { color: isDarkMode ? '#93C5FD' : '#1E40AF' },
          ]}
        >
          Alerts work while the app is open (banner + vibration).
        </Text>
      </View>
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  subBlock: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
  },
  hintText: {
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});

