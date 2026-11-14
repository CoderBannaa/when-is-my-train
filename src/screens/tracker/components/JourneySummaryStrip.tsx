import React from 'react';
import { View, Text } from 'react-native';
import { usePreferences } from '../../../context/PreferencesContext';
import { TrackerViewModel } from '../buildTrackerViewModel';
import { trackerStyles } from '../trackerStyles';

interface JourneySummaryStripProps {
  vm: TrackerViewModel;
}

export const JourneySummaryStrip: React.FC<JourneySummaryStripProps> = React.memo(({ vm }) => {
  const { colors, isDarkMode } = usePreferences();

  if (!vm.totalDurationText && (vm.totalHaltsCount === undefined || vm.totalHaltsCount === 0)) {
    return null;
  }

  return (
    <View
      style={[
        trackerStyles.summaryStrip,
        {
          backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
          borderColor: isDarkMode ? colors.border : '#E2E8F0',
        },
      ]}
      accessible={true}
      accessibilityLabel={`Travel duration ${vm.totalDurationText || '--'}, ${vm.totalHaltsCount || 0} commercial halts`}
    >
      {/* 1. Duration (Single source of truth in Summary Strip) */}
      {vm.totalDurationText && (
        <View style={trackerStyles.summaryCol}>
          <Text style={[trackerStyles.summaryColLabel, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>
            TOTAL DURATION
          </Text>
          <Text style={[trackerStyles.summaryColValue, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
            {vm.totalDurationText}
          </Text>
        </View>
      )}

      {/* 2. Halts (Single source of truth in Summary Strip) */}
      {vm.totalHaltsCount !== undefined && vm.totalHaltsCount > 0 && (
        <View style={trackerStyles.summaryCol}>
          <Text style={[trackerStyles.summaryColLabel, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>
            COMMERCIAL STOPS
          </Text>
          <Text style={[trackerStyles.summaryColValue, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
            {vm.totalHaltsCount} Halts
          </Text>
        </View>
      )}
    </View>
  );
});
