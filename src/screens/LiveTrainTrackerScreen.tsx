/**
 * LiveTrainTrackerScreen
 * 
 * SINGLE SOURCE OF TRUTH PLACEMENT MAP:
 * - Train number + name + type badge: Header only (not again in hero/info).
 * - Date chip: Header only.
 * - Refresh: Header icon only + pull-to-refresh. Removed from QuickActions and modals.
 * - Save / Star: Header only.
 * - Share: QuickActions only (removed from header and menus).
 * - Alarm: QuickActions entry + StationSheet button (synchronized state).
 * - Status headline ("Running between X and Y" / "At X"): StatusHero only.
 * - Delay: Hero chip shows total delay. Station rows show delay only when differing from hero.
 * - Next station: StatusHero sub-line only. Timeline indicates via highlighted dot.
 * - Data source / freshness: StatusHero footer only.
 * - Scheduled dep / arr: Hero displays origin dep and destination arr. Timeline rows show station times.
 * - Journey duration & halts: JourneySummaryStrip only (no duplicate dep/arr).
 * - Platform: Station row right side (e.g. "PF 2"). Never in hero.
 * - Train specs (days of run, distance, rake): Info tab and Coach tab only.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePreferences } from '../context/PreferencesContext';
import { useTrackerData } from './tracker/useTrackerData';
import { TimelineStation } from './tracker/buildTrackerViewModel';
import { TrackerHeader } from './tracker/components/TrackerHeader';
import { StatusHero } from './tracker/components/StatusHero';
import { QuickActions } from './tracker/components/QuickActions';
import { JourneySummaryStrip } from './tracker/components/JourneySummaryStrip';
import { JourneyTimeline } from './tracker/components/JourneyTimeline';
import { StationSheet } from './tracker/components/StationSheet';
import { TrackerMapTab } from './tracker/components/TrackerMapTab';
import { TrackerCoachTab } from './tracker/components/TrackerCoachTab';
import { TrackerInfoTab } from './tracker/components/TrackerInfoTab';
import { AlarmStore, SavedAlarm, AlarmMode } from '../utils/alarmStore';
import { SavedTrainsStore } from '../utils/savedTrainsStore';
import { parseTimeToMinutes } from '../utils/liveStatusEngine';
import { Typography } from '../theme/typography';

interface LiveTrainTrackerScreenProps {
  trainNumber: string;
  trainName?: string;
  fromStationCode?: string;
  toStationCode?: string;
  fromStationName?: string;
  toStationName?: string;
  onBack: () => void;
}

type TrackerTab = 'timeline' | 'map' | 'coach' | 'info';

export const LiveTrainTrackerScreen: React.FC<LiveTrainTrackerScreenProps> = ({
  trainNumber,
  trainName: propTrainName,
  fromStationCode,
  toStationCode,
  onBack,
}) => {
  const { colors, isDarkMode, t } = usePreferences();
  const cleanTrainNo = (trainNumber || '').trim().replace(/\D/g, '');

  const { vm, refresh, isRefreshing } = useTrackerData(cleanTrainNo);

  const [activeTab, setActiveTab] = useState<TrackerTab>('timeline');
  const [selectedStation, setSelectedStation] = useState<TimelineStation | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Foreground Alarm state & modal
  const [savedAlarm, setSavedAlarm] = useState<SavedAlarm | null>(null);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);
  const [alarmTargetStation, setAlarmTargetStation] = useState<TimelineStation | null>(null);
  const [alarmMode, setAlarmMode] = useState<AlarmMode>('15m');
  const [alarmToastText, setAlarmToastText] = useState<string | null>(null);

  // Resolve display name: prefer real scraped name from VM, fallback to prop
  const displayName = vm.trainName || propTrainName || `Train ${cleanTrainNo}`;

  // 1. Unified Saved Trains Store integration
  useEffect(() => {
    if (!cleanTrainNo) return;
    SavedTrainsStore.isTrainSaved(cleanTrainNo).then(setIsSaved).catch(() => {});
    SavedTrainsStore.recordViewedTrain({
      number: cleanTrainNo,
      name: displayName,
      fromCode: fromStationCode || vm.originStation?.stationCode,
      toCode: toStationCode || vm.destinationStation?.stationCode,
      isSaved: false,
    }).catch(() => {});
  }, [cleanTrainNo]);

  useEffect(() => {
    if (!cleanTrainNo || !vm.trainName) return;
    SavedTrainsStore.recordViewedTrain({
      number: cleanTrainNo,
      name: vm.trainName || displayName,
      fromCode: fromStationCode || vm.originStation?.stationCode,
      toCode: toStationCode || vm.destinationStation?.stationCode,
      isSaved,
    }).catch(() => {});
  }, [cleanTrainNo, vm.trainName, vm.originStation, vm.destinationStation, isSaved]);

  const toggleSave = useCallback(async () => {
    const nextSaved = await SavedTrainsStore.toggleSaveTrain(
      cleanTrainNo,
      displayName,
      fromStationCode || vm.originStation?.stationCode,
      toStationCode || vm.destinationStation?.stationCode
    );
    setIsSaved(nextSaved);
  }, [cleanTrainNo, displayName, fromStationCode, toStationCode, vm.originStation, vm.destinationStation]);

  // 2. AlarmStore initialization
  useEffect(() => {
    if (!cleanTrainNo) return;
    AlarmStore.getAlarmForTrain(cleanTrainNo).then(setSavedAlarm).catch(() => {});
  }, [cleanTrainNo]);

  // 3. Foreground Alarm evaluation against live VM updates
  useEffect(() => {
    if (!savedAlarm || savedAlarm.fired || vm.state === 'cancelled' || vm.state === 'completed' || vm.isStale) {
      return;
    }
    const st = vm.stations.find((s) => s.stationCode === savedAlarm.stationCode);
    if (!st) return;

    let shouldFire = false;
    let triggerMsg = '';

    if (savedAlarm.mode === '5km' || savedAlarm.mode === '10km') {
      const targetKm = savedAlarm.mode === '5km' ? 5 : 10;
      if (st.distanceKm !== undefined && vm.distanceCoveredKm !== undefined) {
        const distRem = st.distanceKm - vm.distanceCoveredKm;
        if (distRem <= targetKm && distRem >= -2) {
          shouldFire = true;
          triggerMsg = `🔔 Approaching ${st.stationName} (~${Math.max(0, Math.round(distRem))} km away)`;
        }
      }
    } else {
      // Time mode: '10m' | '15m' | '30m'
      const targetMins = parseInt(savedAlarm.mode, 10);
      let remainingMins: number | undefined;

      if (vm.nextStation?.stationCode === st.stationCode && vm.minutesToNextStation !== undefined) {
        remainingMins = vm.minutesToNextStation;
      } else {
        const arrivalStr = st.expectedArrival || st.scheduledArrival;
        if (arrivalStr && arrivalStr !== '--') {
          const now = new Date();
          const nowMins = now.getHours() * 60 + now.getMinutes();
          const arrMins = parseTimeToMinutes(arrivalStr);
          remainingMins = arrMins - nowMins;
          if (remainingMins < -720) remainingMins += 1440;
        }
      }

      if (remainingMins !== undefined && remainingMins <= targetMins && remainingMins >= -5) {
        shouldFire = true;
        triggerMsg = `🔔 Arriving at ${st.stationName} in ~${Math.max(0, remainingMins)} min`;
      }
    }

    if (shouldFire) {
      try {
        Vibration.vibrate([0, 500, 200, 500]);
      } catch {}
      setAlarmToastText(triggerMsg);
      AlarmStore.markAlarmFired(cleanTrainNo);
      setSavedAlarm((prev) => (prev ? { ...prev, fired: true } : null));
      setTimeout(() => setAlarmToastText(null), 8000);
    }
  }, [vm, savedAlarm, cleanTrainNo]);

  const handleSetAlarmForStation = useCallback((st: TimelineStation) => {
    setAlarmTargetStation(st);
    setSelectedStation(null);
    setShowAlarmModal(true);
  }, []);

  const handleOpenGeneralAlarm = useCallback(() => {
    setAlarmTargetStation(vm.nextStation || vm.currentStation || vm.stations[0] || null);
    setShowAlarmModal(true);
  }, [vm.nextStation, vm.currentStation, vm.stations]);

  const handleConfirmAlarm = useCallback(async () => {
    if (!alarmTargetStation) return;
    const newAlarm: SavedAlarm = {
      trainNumber: cleanTrainNo,
      stationCode: alarmTargetStation.stationCode,
      stationName: alarmTargetStation.stationName,
      mode: alarmMode,
      createdAt: Date.now(),
      fired: false,
    };
    await AlarmStore.saveAlarm(newAlarm);
    setSavedAlarm(newAlarm);
    setShowAlarmModal(false);
    const modeLabel = alarmMode.endsWith('km') ? `${alarmMode} before` : `${alarmMode} before arrival`;
    setAlarmToastText(`🔔 Wake-up alarm set for ${alarmTargetStation.stationName} (${modeLabel})`);
    setTimeout(() => {
      setAlarmToastText(null);
    }, 4500);
  }, [cleanTrainNo, alarmTargetStation, alarmMode]);

  const handleCancelAlarm = useCallback(async () => {
    await AlarmStore.clearAlarm(cleanTrainNo);
    setSavedAlarm(null);
    setAlarmToastText('Alarm cancelled');
    setTimeout(() => {
      setAlarmToastText(null);
    }, 2500);
  }, [cleanTrainNo]);

  // Combined Header component for Timeline FlatList (Hero + Actions + Summary)
  const TimelineHeader = useMemo(() => {
    return (
      <View>
        <StatusHero vm={vm} onRetry={refresh} />
        <QuickActions
          vm={vm}
          activeAlarm={savedAlarm}
          onOpenAlarm={handleOpenGeneralAlarm}
          onCancelAlarm={handleCancelAlarm}
        />
        <JourneySummaryStrip vm={vm} />
        <View style={{ height: 12 }} />
      </View>
    );
  }, [vm, savedAlarm, refresh, handleOpenGeneralAlarm, handleCancelAlarm]);

  const canUseDistance = Boolean(
    alarmTargetStation?.distanceKm !== undefined && vm.distanceCoveredKm !== undefined
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: isDarkMode ? colors.background : '#F0F7FD' }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
      />

      {/* 1. TOP APP HEADER */}
      <TrackerHeader
        trainNumber={cleanTrainNo}
        trainName={displayName}
        trainType={vm.trainType}
        travelDateLabel="Today"
        isRefreshing={isRefreshing}
        isSaved={isSaved}
        onBack={onBack}
        onRefresh={refresh}
        onToggleSave={toggleSave}
      />

      {/* 2. TAB SWITCHER (TIMELINE | MAP | COACH | INFO) */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
            borderBottomColor: isDarkMode ? colors.border : '#E2E8F0',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'timeline' && [
              styles.tabItemActive,
              { borderBottomColor: isDarkMode ? '#38BDF8' : colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('timeline')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="list-outline"
            size={16}
            color={activeTab === 'timeline' ? (isDarkMode ? '#38BDF8' : colors.primary) : (isDarkMode ? colors.textMuted : '#64748B')}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'timeline' ? (isDarkMode ? '#38BDF8' : colors.primary) : (isDarkMode ? colors.textMuted : '#64748B'),
                fontWeight: activeTab === 'timeline' ? '800' : '600',
              },
            ]}
          >
            Timeline
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'map' && [
              styles.tabItemActive,
              { borderBottomColor: isDarkMode ? '#38BDF8' : colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('map')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="map-outline"
            size={16}
            color={activeTab === 'map' ? (isDarkMode ? '#38BDF8' : colors.primary) : (isDarkMode ? colors.textMuted : '#64748B')}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'map' ? (isDarkMode ? '#38BDF8' : colors.primary) : (isDarkMode ? colors.textMuted : '#64748B'),
                fontWeight: activeTab === 'map' ? '800' : '600',
              },
            ]}
          >
            Route
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'coach' && [
              styles.tabItemActive,
              { borderBottomColor: isDarkMode ? '#38BDF8' : colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('coach')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="train-car"
            size={16}
            color={activeTab === 'coach' ? (isDarkMode ? '#38BDF8' : colors.primary) : (isDarkMode ? colors.textMuted : '#64748B')}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'coach' ? (isDarkMode ? '#38BDF8' : colors.primary) : (isDarkMode ? colors.textMuted : '#64748B'),
                fontWeight: activeTab === 'coach' ? '800' : '600',
              },
            ]}
          >
            Coach
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'info' && [
              styles.tabItemActive,
              { borderBottomColor: isDarkMode ? '#38BDF8' : colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('info')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={activeTab === 'info' ? (isDarkMode ? '#38BDF8' : colors.primary) : (isDarkMode ? colors.textMuted : '#64748B')}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'info' ? (isDarkMode ? '#38BDF8' : colors.primary) : (isDarkMode ? colors.textMuted : '#64748B'),
                fontWeight: activeTab === 'info' ? '800' : '600',
              },
            ]}
          >
            Train Info
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. ALARM TOAST NOTIFICATION */}
      {alarmToastText && (
        <View style={[styles.toastContainer, { backgroundColor: isDarkMode ? '#065F46' : '#059669' }]}>
          <Ionicons name="notifications-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{alarmToastText}</Text>
        </View>
      )}

      {/* 4. ACTIVE TAB CONTENT */}
      <View style={{ flex: 1 }}>
        {activeTab === 'timeline' && (
          <JourneyTimeline
            vm={vm}
            onSelectStation={(st) => setSelectedStation(st)}
            ListHeaderComponent={TimelineHeader}
          />
        )}

        {activeTab === 'map' && (
          <TrackerMapTab
            vm={vm}
            onSelectStation={(st) => setSelectedStation(st)}
          />
        )}

        {activeTab === 'coach' && (
          <TrackerCoachTab trainNumber={cleanTrainNo} />
        )}

        {activeTab === 'info' && (
          <TrackerInfoTab vm={vm} />
        )}
      </View>

      {/* 5. STATION DETAIL BOTTOM SHEET */}
      <StationSheet
        station={selectedStation}
        onClose={() => setSelectedStation(null)}
        onSetAlarm={handleSetAlarmForStation}
      />

      {/* 6. STATION ALARM CONFIG MODAL */}
      <Modal visible={showAlarmModal} transparent animationType="fade" onRequestClose={() => setShowAlarmModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAlarmModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.alarmModalCard,
              {
                backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
                borderColor: isDarkMode ? colors.border : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.alarmModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alarm" size={20} color={isDarkMode ? '#38BDF8' : colors.primary} />
                <Text style={[styles.alarmModalTitle, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                  Station Wake-up Alarm
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAlarmModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={isDarkMode ? colors.textSecondary : '#64748B'} />
              </TouchableOpacity>
            </View>

            {alarmTargetStation && (
              <View
                style={[
                  styles.alarmStationTargetCard,
                  {
                    backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9',
                    borderColor: isDarkMode ? colors.border : '#E2E8F0',
                  },
                ]}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? '#38BDF8' : colors.primary }}>
                  TARGET STATION
                </Text>
                <Text style={[styles.alarmTargetName, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                  {alarmTargetStation.stationName} ({alarmTargetStation.stationCode})
                </Text>
                <Text style={{ fontSize: 12, color: isDarkMode ? colors.textSecondary : '#64748B', marginTop: 2 }}>
                  Expected: {alarmTargetStation.expectedArrival || alarmTargetStation.scheduledArrival}
                </Text>
              </View>
            )}

            <Text style={[styles.alarmLeadLabel, { color: isDarkMode ? colors.textSecondary : '#475569' }]}>
              Trigger alarm before station:
            </Text>

            {/* Time-based modes */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? colors.textMuted : '#64748B', marginBottom: 6 }}>
              TIME BEFORE ARRIVAL
            </Text>
            <View style={styles.alarmLeadOptions}>
              {(['10m', '15m', '30m'] as AlarmMode[]).map((mode) => {
                const isSelected = alarmMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.alarmLeadPill,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : isDarkMode
                          ? '#0F172A'
                          : '#F8FAFC',
                        borderColor: isSelected
                          ? colors.primary
                          : isDarkMode
                          ? colors.border
                          : '#E2E8F0',
                      },
                    ]}
                    onPress={() => setAlarmMode(mode)}
                  >
                    <Text
                      style={[
                        styles.alarmLeadPillText,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : isDarkMode
                            ? colors.textPrimary
                            : '#334155',
                          fontWeight: isSelected ? '800' : '600',
                        },
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Distance-based modes */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? colors.textMuted : '#64748B' }}>
                DISTANCE BEFORE STATION
              </Text>
              {!canUseDistance && (
                <Text style={{ fontSize: 10, color: '#F59E0B', fontStyle: 'italic' }}>
                  GPS/distance data not available
                </Text>
              )}
            </View>
            <View style={styles.alarmLeadOptions}>
              {(['5km', '10km'] as AlarmMode[]).map((mode) => {
                const isSelected = alarmMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    disabled={!canUseDistance}
                    style={[
                      styles.alarmLeadPill,
                      {
                        opacity: canUseDistance ? 1 : 0.45,
                        backgroundColor: isSelected
                          ? colors.primary
                          : isDarkMode
                          ? '#0F172A'
                          : '#F8FAFC',
                        borderColor: isSelected
                          ? colors.primary
                          : isDarkMode
                          ? colors.border
                          : '#E2E8F0',
                      },
                    ]}
                    onPress={() => setAlarmMode(mode)}
                  >
                    <Text
                      style={[
                        styles.alarmLeadPillText,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : isDarkMode
                            ? colors.textPrimary
                            : '#334155',
                          fontWeight: isSelected ? '800' : '600',
                        },
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Honest Foreground Notification Disclaimer */}
            <View style={[styles.alarmNoticeBox, { backgroundColor: isDarkMode ? '#0F172A' : '#EFF6FF', borderColor: isDarkMode ? '#1E293B' : '#BFDBFE' }]}>
              <Ionicons name="information-circle" size={15} color={isDarkMode ? '#38BDF8' : '#2563EB'} style={{ marginRight: 6 }} />
              <Text style={[styles.alarmNoticeText, { color: isDarkMode ? '#94A3B8' : '#1E40AF' }]}>
                Works while the app is open. Background alerts are not available yet.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.alarmSetConfirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirmAlarm}
              activeOpacity={0.88}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.alarmSetConfirmText}>Set Wake-up Alarm</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 44,
    gap: 5,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {},
  tabText: {
    ...Typography.caption,
    fontSize: 12,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  toastText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alarmModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    elevation: 8,
  },
  alarmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  alarmModalTitle: {
    ...Typography.h3,
    fontSize: 16,
  },
  alarmStationTargetCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  alarmTargetName: {
    ...Typography.bodyBold,
    fontSize: 15,
    marginTop: 3,
  },
  alarmLeadLabel: {
    ...Typography.caption,
    fontSize: 12,
    marginBottom: 8,
  },
  alarmLeadOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  alarmLeadPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alarmLeadPillText: {
    fontSize: 12,
  },
  alarmNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  alarmNoticeText: {
    ...Typography.caption,
    fontSize: 11,
    flex: 1,
  },
  alarmSetConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 10,
    gap: 6,
  },
  alarmSetConfirmText: {
    ...Typography.button,
    color: '#FFFFFF',
    fontSize: 14,
  },
});
