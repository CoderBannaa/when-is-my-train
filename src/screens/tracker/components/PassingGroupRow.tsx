import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../../context/PreferencesContext';
import { TimelineStation } from '../buildTrackerViewModel';
import { StationRow } from './StationRow';
import { trackerStyles } from '../trackerStyles';

interface PassingGroupRowProps {
  stations: TimelineStation[];
  onSelectStation: (station: TimelineStation) => void;
}

export const PassingGroupRow: React.FC<PassingGroupRowProps> = React.memo(({
  stations,
  onSelectStation,
}) => {
  const { colors, isDarkMode } = usePreferences();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!stations || stations.length === 0) return null;

  return (
    <View>
      <View style={trackerStyles.passingGroupContainer}>
        {/* Rail Column */}
        <View style={trackerStyles.passingRailCol}>
          <View
            style={[
              trackerStyles.passingRailLine,
              { backgroundColor: isDarkMode ? '#334155' : '#CBD5E1' },
            ]}
          />
        </View>

        {/* Collapsible toggle pill */}
        <TouchableOpacity
          onPress={() => setIsExpanded((prev) => !prev)}
          style={[
            trackerStyles.passingToggleBtn,
            {
              backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
              borderColor: isDarkMode ? colors.border : '#E2E8F0',
            },
          ]}
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel={`${isExpanded ? 'Hide' : 'Show'} ${stations.length} intermediate passing stations`}
        >
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={isDarkMode ? '#94A3B8' : '#64748B'}
          />
          <Text style={[trackerStyles.passingToggleText, { color: isDarkMode ? '#CBD5E1' : '#475569' }]}>
            {stations.length} intermediate passing stations
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expanded passing stations list */}
      {isExpanded &&
        stations.map((st, i) => (
          <StationRow
            key={st.stationCode + i}
            station={st}
            isFirst={false}
            isLast={false}
            onPress={onSelectStation}
          />
        ))}
    </View>
  );
});

