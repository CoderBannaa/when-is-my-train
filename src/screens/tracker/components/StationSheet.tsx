import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../../context/PreferencesContext';
import { TimelineStation } from '../buildTrackerViewModel';
import { trackerStyles } from '../trackerStyles';

interface StationSheetProps {
  station: TimelineStation | null;
  onClose: () => void;
  onSetAlarm: (station: TimelineStation) => void;
}

export const StationSheet: React.FC<StationSheetProps> = React.memo(({
  station,
  onClose,
  onSetAlarm,
}) => {
  const { colors, isDarkMode, t } = usePreferences();

  if (!station) return null;

  const isDelay = station.delayMinutes > 0;
  const isHighDelay = station.delayMinutes > 15;

  return (
    <Modal visible={Boolean(station)} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={trackerStyles.sheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[
            trackerStyles.sheetContainer,
            {
              backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
              borderColor: isDarkMode ? colors.border : '#E2E8F0',
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={[trackerStyles.sheetDragHandle, { backgroundColor: isDarkMode ? '#475569' : '#CBD5E1' }]} />

          {/* Header Row: Station Name + Close Button */}
          <View style={trackerStyles.sheetHeaderRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[trackerStyles.sheetStationTitle, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                {station.stationName} ({station.stationCode})
              </Text>
              <Text style={[trackerStyles.sheetStationSub, { color: isDarkMode ? colors.textSecondary : '#64748B' }]}>
                {station.platform ? `Platform ${station.platform}` : 'Platform not assigned'}
                {station.distanceKm !== undefined ? ` • ${station.distanceKm} km from origin` : ''}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{ padding: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              accessible={true}
              accessibilityLabel="Close station details"
            >
              <Ionicons name="close" size={22} color={isDarkMode ? colors.textSecondary : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Scheduled vs Expected Arrival & Departure Grid */}
          <View
            style={[
              trackerStyles.sheetGrid,
              {
                borderTopColor: isDarkMode ? colors.border : '#F1F5F9',
                borderBottomColor: isDarkMode ? colors.border : '#F1F5F9',
              },
            ]}
          >
            {/* Arrival */}
            <View style={trackerStyles.sheetGridCol}>
              <Text style={[trackerStyles.sheetGridLabel, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>
                ARRIVAL
              </Text>
              <Text style={[trackerStyles.sheetGridVal, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                {station.expectedArrival || station.scheduledArrival}
              </Text>
              {isDelay && station.scheduledArrival !== '--:--' && (
                <Text style={{ fontSize: 11, color: isDarkMode ? colors.textMuted : '#94A3B8', textDecorationLine: 'line-through', marginTop: 1 }}>
                  {station.scheduledArrival}
                </Text>
              )}
            </View>

            {/* Halt */}
            <View style={trackerStyles.sheetGridCol}>
              <Text style={[trackerStyles.sheetGridLabel, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>
                HALT
              </Text>
              <Text style={[trackerStyles.sheetGridVal, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                {station.haltMinutes !== undefined ? `${station.haltMinutes} min` : '--'}
              </Text>
            </View>

            {/* Departure */}
            <View style={trackerStyles.sheetGridCol}>
              <Text style={[trackerStyles.sheetGridLabel, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>
                DEPARTURE
              </Text>
              <Text style={[trackerStyles.sheetGridVal, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                {station.expectedDeparture || station.scheduledDeparture}
              </Text>
              {isDelay && station.scheduledDeparture !== '--:--' && (
                <Text style={{ fontSize: 11, color: isDarkMode ? colors.textMuted : '#94A3B8', textDecorationLine: 'line-through', marginTop: 1 }}>
                  {station.scheduledDeparture}
                </Text>
              )}
            </View>

            {/* Delay */}
            <View style={trackerStyles.sheetGridCol}>
              <Text style={[trackerStyles.sheetGridLabel, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>
                DELAY
              </Text>
              <Text
                style={[
                  trackerStyles.sheetGridVal,
                  {
                    color: !isDelay
                      ? (isDarkMode ? '#34D399' : '#059669')
                      : isHighDelay
                      ? (isDarkMode ? '#F87171' : '#DC2626')
                      : (isDarkMode ? '#FBBF24' : '#D97706'),
                  },
                ]}
              >
                {!isDelay ? 'On Time' : `+${station.delayMinutes}m`}
              </Text>
            </View>
          </View>

          {/* Set Alarm Button for this station */}
          <TouchableOpacity
            style={[trackerStyles.sheetAlarmBtn, { backgroundColor: colors.primary }]}
            onPress={() => onSetAlarm(station)}
            activeOpacity={0.88}
            accessible={true}
            accessibilityLabel={`Set wake up alarm for ${station.stationName}`}
          >
            <Ionicons name="alarm" size={19} color="#FFFFFF" />
            <Text style={trackerStyles.sheetAlarmBtnText}>
              Set Alarm for {station.stationName}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

