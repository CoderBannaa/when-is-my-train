import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { usePreferences } from '../../../context/PreferencesContext';
import { TrackerViewModel } from '../buildTrackerViewModel';
import { DayChips } from '../../../components/search/DayChips';
import { Typography } from '../../../theme/typography';

interface TrackerInfoTabProps {
  vm: TrackerViewModel;
  runsOn?: boolean[];
}

export const TrackerInfoTab: React.FC<TrackerInfoTabProps> = React.memo(({
  vm,
  runsOn = [true, true, true, true, true, true, true],
}) => {
  const { colors, isDarkMode } = usePreferences();
  const selectedDayIdx = new Date().getDay();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Schedule & Days Specifications Card (Single source of truth: No repeated train name or delay) */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
            borderColor: isDarkMode ? colors.border : '#E2E8F0',
          },
        ]}
      >
        {/* Running Days */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>RUNNING DAYS</Text>
          <DayChips
            runsOn={runsOn}
            selectedDayIndex={selectedDayIdx}
            isDarkMode={isDarkMode}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: isDarkMode ? colors.border : '#F1F5F9' }]} />

        {/* Origin */}
        {vm.originStation && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>ORIGIN</Text>
            <Text style={[styles.val, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
              {vm.originStation.stationName} ({vm.originStation.stationCode})
            </Text>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: isDarkMode ? colors.border : '#F1F5F9' }]} />

        {/* Destination */}
        {vm.destinationStation && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>DESTINATION</Text>
            <Text style={[styles.val, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
              {vm.destinationStation.stationName} ({vm.destinationStation.stationCode})
            </Text>
          </View>
        )}

        {vm.totalDistanceKm !== undefined && vm.totalDistanceKm > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: isDarkMode ? colors.border : '#F1F5F9' }]} />
            <View style={styles.row}>
              <Text style={[styles.label, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>TOTAL DISTANCE</Text>
              <Text style={[styles.val, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                {vm.totalDistanceKm} km
              </Text>
            </View>
          </>
        )}

        {vm.totalHaltsCount !== undefined && vm.totalHaltsCount > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: isDarkMode ? colors.border : '#F1F5F9' }]} />
            <View style={styles.row}>
              <Text style={[styles.label, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>COMMERCIAL STOPS</Text>
              <Text style={[styles.val, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                {vm.totalHaltsCount} Halts
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 14,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  label: {
    ...Typography.microLabel,
    fontSize: 11,
  },
  val: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
    paddingLeft: 10,
  },
});
