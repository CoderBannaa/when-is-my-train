import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../../context/PreferencesContext';
import { TrackerViewModel, TimelineStation } from '../buildTrackerViewModel';
import { Typography } from '../../../theme/typography';

interface TrackerMapTabProps {
  vm: TrackerViewModel;
  onSelectStation: (station: TimelineStation) => void;
}

export const TrackerMapTab: React.FC<TrackerMapTabProps> = React.memo(({
  vm,
  onSelectStation,
}) => {
  const { colors, isDarkMode } = usePreferences();
  const stations = vm.stations.filter((s) => !s.isPassing);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Route Schematic Card */}
      <View
        style={[
          styles.mapCard,
          {
            backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
            borderColor: isDarkMode ? colors.border : '#E2E8F0',
          },
        ]}
      >
        <View style={styles.header}>
          <Ionicons name="map-outline" size={18} color={isDarkMode ? '#38BDF8' : colors.primary} />
          <Text style={[styles.title, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
            Schematic Route Map
          </Text>
        </View>

        {/* Vertical Schematic Rail with Train Marker */}
        <View style={styles.schematicList}>
          {stations.map((st, i) => {
            const isPassed = st.status === 'departed';
            const isCurrent = st.status === 'current';
            const isFirst = i === 0;
            const isLast = i === stations.length - 1;

            return (
              <View key={st.stationCode + i} style={styles.nodeRow}>
                {/* Rail Column */}
                <View style={styles.railCol}>
                  <View
                    style={[
                      styles.railSegment,
                      {
                        backgroundColor: isFirst
                          ? 'transparent'
                          : isPassed || isCurrent
                          ? colors.primary
                          : isDarkMode
                          ? '#334155'
                          : '#CBD5E1',
                      },
                    ]}
                  />

                  {/* Marker Node */}
                  <View
                    style={[
                      styles.nodeMarker,
                      {
                        backgroundColor: isCurrent
                          ? colors.primary
                          : isPassed
                          ? (isDarkMode ? '#0369A1' : colors.primary)
                          : isDarkMode
                          ? '#1E293B'
                          : '#F1F5F9',
                        borderColor: isCurrent
                          ? '#FFFFFF'
                          : isPassed
                          ? colors.primary
                          : isDarkMode
                          ? '#64748B'
                          : '#94A3B8',
                      },
                    ]}
                  >
                    {isCurrent ? (
                      <MaterialCommunityIcons name="train" size={13} color="#FFFFFF" />
                    ) : isPassed ? (
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.railSegment,
                      {
                        backgroundColor: isLast
                          ? 'transparent'
                          : isPassed
                          ? colors.primary
                          : isDarkMode
                          ? '#334155'
                          : '#CBD5E1',
                      },
                    ]}
                  />
                </View>

                {/* Station Info */}
                <View style={styles.nodeInfo}>
                  <Text
                    style={[
                      styles.nodeStationName,
                      {
                        color: isCurrent
                          ? (isDarkMode ? '#38BDF8' : colors.primary)
                          : isDarkMode
                          ? colors.textPrimary
                          : '#1E293B',
                        fontWeight: isCurrent ? '800' : '600',
                      },
                    ]}
                  >
                    {st.stationName} ({st.stationCode})
                  </Text>
                  <Text style={[styles.nodeMeta, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>
                    {st.expectedArrival || st.scheduledArrival}
                    {st.distanceKm !== undefined ? ` • ${st.distanceKm} km` : ''}
                    {st.platform ? ` • PF ${st.platform}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
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
    paddingBottom: 40,
  },
  mapCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 14,
  },
  title: {
    ...Typography.h3,
    fontSize: 15,
  },
  schematicList: {
    marginTop: 6,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
  },
  railCol: {
    width: 36,
    alignItems: 'center',
    height: 50,
  },
  railSegment: {
    width: 3,
    flex: 1,
  },
  nodeMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeInfo: {
    flex: 1,
    paddingLeft: 10,
    justifyContent: 'center',
  },
  nodeStationName: {
    ...Typography.body,
    fontSize: 13,
  },
  nodeMeta: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
});

