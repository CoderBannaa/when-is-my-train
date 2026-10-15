import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { CORRIDOR_TRAINS_MASTER, CorridorTrain, findOrGenerateTrain } from '../data/trainsBetweenStations';
import { searchAndRankTrains } from '../utils/searchRanker';
import { calculateLiveStatus, parseTimeToMinutes } from '../utils/liveStatusEngine';
import { usePreferences } from '../context/PreferencesContext';

interface LiveStatusScreenProps {
  initialTrainNumber?: string;
  onTrackTrain?: (trainNumber: string, trainName: string) => void;
}

const QUICK_TRAINS = [
  { number: '22436', name: 'Vande Bharat Express' },
  { number: '12417', name: 'Prayagraj Express' },
  { number: '12002', name: 'NDLS - Bhopal Shatabdi' },
  { number: '64902', name: 'New Delhi - Mathura EMU' },
  { number: '05379', name: 'Lucknow Jn. - Kasganj Passenger' },
  { number: '64901', name: 'Mathura - New Delhi EMU' },
];

export const LiveStatusScreen: React.FC<LiveStatusScreenProps> = ({ initialTrainNumber, onTrackTrain }) => {
  const { isDarkMode, colors, t } = usePreferences();
  const [trainQuery, setTrainQuery] = useState(initialTrainNumber || '22436');
  const [selectedTrainNum, setSelectedTrainNum] = useState(initialTrainNumber || '22436');
  const [trackingMode, setTrackingMode] = useState<'gps' | 'internet'>('gps');
  const [timeMode, setTimeMode] = useState<'real' | 'simulated'>('simulated');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState('Just now');
  const refreshTimerRef = useRef<any>(null);

  useEffect(() => {
    if (initialTrainNumber) {
      setTrainQuery(initialTrainNumber);
      setSelectedTrainNum(initialTrainNumber);
    }
  }, [initialTrainNumber]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // Ranked auto-suggestions when typing in search bar
  const searchSuggestions = useMemo(() => {
    if (!trainQuery.trim() || trainQuery.trim() === selectedTrainNum) return [];
    return searchAndRankTrains(trainQuery, CORRIDOR_TRAINS_MASTER).slice(0, 5);
  }, [trainQuery, selectedTrainNum]);

  // Find active train in master database or dynamically generate
  const activeTrain = useMemo(() => {
    return findOrGenerateTrain(selectedTrainNum);
  }, [selectedTrainNum]);

  // Compute simulation time: halfway through the train's route
  const simulationMinutes = useMemo(() => {
    if (!activeTrain.stops || activeTrain.stops.length < 2) return 8 * 60;
    const originMins = parseTimeToMinutes(activeTrain.stops[0].dep === '--' ? activeTrain.stops[0].arr : activeTrain.stops[0].dep);
    const destMins = parseTimeToMinutes(activeTrain.stops[activeTrain.stops.length - 1].arr);
    return Math.floor((originMins + destMins) / 2) + 12; // Middle + 12m running
  }, [activeTrain]);

  // Calculate real-time live status data
  const liveData = useMemo(() => {
    const minutesToUse = timeMode === 'simulated' ? simulationMinutes : undefined;
    return calculateLiveStatus(activeTrain, minutesToUse, 7); // 7 mins delay for realistic tracking
  }, [activeTrain, timeMode, simulationMinutes, lastRefreshedAt]);

  const handleSelectTrain = useCallback((num: string) => {
    setSelectedTrainNum(num);
    setTrainQuery(num);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      setLastRefreshedAt(`${hh}:${mm}`);
      setIsRefreshing(false);
    }, 400);
  }, []);

  return (
    <ScrollView
      style={[styles.container, isDarkMode && { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
      }
    >
      {/* 1. Iconic "Where is My Train" Top Tracking Mode Switcher */}
      <View style={[styles.modeCard, isDarkMode && { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, trackingMode === 'gps' && styles.modeTabActive]}
            activeOpacity={0.8}
            onPress={() => setTrackingMode('gps')}
          >
            <Ionicons
              name="location"
              size={14}
              color={trackingMode === 'gps' ? '#FFFFFF' : Colors.textSecondary}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.modeTabText, trackingMode === 'gps' && styles.modeTabTextActive]}>
              Inside Train (Cell / GPS)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, trackingMode === 'internet' && styles.modeTabActive]}
            activeOpacity={0.8}
            onPress={() => setTrackingMode('internet')}
          >
            <Ionicons
              name="globe-outline"
              size={14}
              color={trackingMode === 'internet' ? '#FFFFFF' : Colors.textSecondary}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.modeTabText, trackingMode === 'internet' && styles.modeTabTextActive]}>
              Internet (NTES Live)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modeSubRow}>
          <View style={styles.modeGpsPill}>
            <View style={styles.gpsGreenDot} />
            <Text style={styles.gpsPillText}>
              {trackingMode === 'gps' ? 'Offline Cell Tower & GPS Sync' : 'IRCTC / NTES Cloud Sync'}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <Ionicons name="sync" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.refreshText}>{lastRefreshedAt}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Spot Train Search Bar */}
      <View style={[styles.searchCard, isDarkMode && { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.cardLabel}>SPOT TRAIN / EMU LOCAL</Text>
        <View style={[styles.searchBar, isDarkMode && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
          <Ionicons name="search" size={19} color={Colors.primary} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.input, isDarkMode && { color: colors.textPrimary }]}
            value={trainQuery}
            onChangeText={(text) => {
              setTrainQuery(text);
              const exact = CORRIDOR_TRAINS_MASTER.find((t) => t.number === text.trim());
              if (exact) setSelectedTrainNum(exact.number);
            }}
            placeholder="Search train no or name (e.g. 64902, Mathura, Taj)..."
            placeholderTextColor={colors.textMuted}
          />
          {trainQuery.length > 0 && (
            <TouchableOpacity onPress={() => setTrainQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Intelligent Ranked Auto-suggestions Dropdown */}
        {searchSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsHeader}>Matching Corridor Trains ({searchSuggestions.length}):</Text>
            {searchSuggestions.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectTrain(t.number)}
              >
                <View style={[styles.suggestionNumBadge, t.isLocalEmu && styles.suggestionEmuBadge]}>
                  <Text style={styles.suggestionNumText}>{t.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionNameText}>{t.name}</Text>
                  <Text style={styles.suggestionRouteText}>
                    {t.originCode} ➔ {t.destCode} • {t.type}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Corridor Trains Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
          {QUICK_TRAINS.map((train) => {
            const isSelected = selectedTrainNum === train.number;
            return (
              <TouchableOpacity
                key={train.number}
                style={[styles.quickChip, isSelected && styles.quickChipActive]}
                onPress={() => handleSelectTrain(train.number)}
              >
                <Text style={[styles.quickChipText, isSelected && styles.quickChipTextActive]}>
                  {train.number}
                </Text>
                <Text style={[styles.quickChipSub, isSelected && styles.quickChipSubActive]}>
                  {train.name.split('-')[1]?.trim() || train.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Iconic Live Running Status Banner */}
      <View
        style={[
          styles.liveBannerCard,
          liveData.isDelayed ? styles.bannerDelayed : styles.bannerOnTime,
        ]}
      >
        <View style={styles.bannerTopRow}>
          <View style={styles.bannerIconBox}>
            <MaterialCommunityIcons
              name={liveData.state === 'HALTED_AT_STATION' ? 'bus-stop' : 'train-variant'}
              size={24}
              color="#FFFFFF"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.bannerMainTitle}>{liveData.bannerStatusText}</Text>
            <Text style={styles.bannerSubTitle}>{liveData.bannerSubText}</Text>
          </View>
          <View style={styles.delayMinutesBadge}>
            <Text style={styles.delayMinutesText}>
              {liveData.delayMinutes > 0 ? `+${liveData.delayMinutes}m` : '0m'}
            </Text>
          </View>
        </View>

        {/* Real Clock vs Demo Simulation Switcher */}
        <View style={styles.simSwitchRow}>
          <Text style={styles.simLabel}>Tracking Mode:</Text>
          <View style={styles.simPillsContainer}>
            <TouchableOpacity
              style={[styles.simPill, timeMode === 'simulated' && styles.simPillActive]}
              onPress={() => setTimeMode('simulated')}
            >
              <Text style={[styles.simPillText, timeMode === 'simulated' && styles.simPillTextActive]}>
                ⚡ En-Route Demo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simPill, timeMode === 'real' && styles.simPillActive]}
              onPress={() => setTimeMode('real')}
            >
              <Text style={[styles.simPillText, timeMode === 'real' && styles.simPillTextActive]}>
                🕒 Device Clock
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 4. Train Overview & Telemetry Dashboard */}
      <View style={styles.trainOverviewCard}>
        <View style={styles.overviewTopRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.numberRow}>
              <View style={[styles.trainNumBadge, liveData.isLocalEmu && styles.emuNumBadge]}>
                <Text style={styles.trainNumText}>{liveData.trainNumber}</Text>
              </View>
              <View style={[styles.typeBadge, liveData.isLocalEmu && styles.emuTypeBadge]}>
                <Text style={[styles.typeBadgeText, liveData.isLocalEmu && { color: '#15803D' }]}>
                  {liveData.type}
                </Text>
              </View>
              {liveData.isLocalEmu && (
                <View style={styles.commuterTag}>
                  <Text style={styles.commuterTagText}>DAILY COMMUTER</Text>
                </View>
              )}
            </View>
            <Text style={styles.trainHeadingName}>{liveData.trainName}</Text>
            <Text style={styles.routeSubtitle}>
              {activeTrain.originName} ({activeTrain.originCode}) ➔ {activeTrain.destName} ({activeTrain.destCode})
            </Text>
          </View>
        </View>

        {/* Live Telemetry Bar */}
        <View style={styles.telemetryDashboard}>
          <View style={styles.telemetryCol}>
            <Ionicons name="speedometer-outline" size={20} color={Colors.primary} />
            <Text style={styles.telemetryVal}>{liveData.currentSpeed} km/h</Text>
            <Text style={styles.telemetryLabel}>Live Speed</Text>
          </View>

          <View style={styles.telemetryDivider} />

          <View style={styles.telemetryCol}>
            <Ionicons name="location-outline" size={20} color={Colors.secondary} />
            <Text style={styles.telemetryVal}>{liveData.currentPlatform}</Text>
            <Text style={styles.telemetryLabel}>
              {liveData.state === 'HALTED_AT_STATION' ? 'At Platform' : 'Next Platform'}
            </Text>
          </View>

          <View style={styles.telemetryDivider} />

          <View style={styles.telemetryCol}>
            <Ionicons name="navigate-outline" size={20} color={Colors.accent} />
            <Text style={styles.telemetryVal}>{liveData.distanceCoveredKm} / {liveData.totalDistanceKm} km</Text>
            <Text style={styles.telemetryLabel}>Corridor Progress</Text>
          </View>
        </View>
      </View>

      {/* Button to Open the full-screen "Where is my train" exact tracker screen */}
      {onTrackTrain && (
        <TouchableOpacity
          style={styles.openTrackerBtn}
          onPress={() => onTrackTrain(selectedTrainNum, activeTrain.name)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="train" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.openTrackerBtnText}>OPEN FULL LIVE TRACKER (SCREENSHOT UI)</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      )}

      {/* 5. Iconic "Where is My Train" Station Timeline */}
      <View style={styles.timelineCard}>
        <View style={styles.timelineHeader}>
          <Text style={[styles.thLabel, { flex: 2 }]}>STATION & PLATFORM</Text>
          <Text style={[styles.thLabel, { flex: 1.2, textAlign: 'center' }]}>SCHED / ACTUAL</Text>
          <Text style={[styles.thLabel, { flex: 0.8, textAlign: 'right' }]}>HALT</Text>
        </View>

        <View style={styles.timelineList}>
          {liveData.stationDetails.map((st, idx) => {
            const isPassed = st.status === 'PASSED';
            const isCurrent = st.status === 'CURRENT';
            const isLast = idx === liveData.stationDetails.length - 1;

            return (
              <View key={`${st.code}-${idx}`} style={[styles.stationRow, isCurrent && styles.stationRowActive]}>
                {/* Station Info */}
                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                  {/* Track Node & Line */}
                  <View style={styles.nodeColumn}>
                    {isCurrent ? (
                      <View style={styles.currentNodeGlow}>
                        <MaterialCommunityIcons name="train" size={13} color="#FFFFFF" />
                      </View>
                    ) : isPassed ? (
                      <View style={styles.passedNode}>
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={styles.upcomingNode} />
                    )}

                    {!isLast && (
                      <View
                        style={[
                          styles.trackLine,
                          isPassed && styles.trackLinePassed,
                          isCurrent && styles.trackLineActive,
                        ]}
                      />
                    )}
                  </View>

                  {/* Station Details */}
                  <View style={styles.stationDetailsTextCol}>
                    <Text style={[styles.stationNameText, isCurrent && styles.stationNameActive]}>
                      {st.name} <Text style={styles.stationCodeSub}>({st.code})</Text>
                    </Text>
                    <View style={styles.platformBadgeRow}>
                      <View style={[styles.pfBadge, isCurrent && styles.pfBadgeActive]}>
                        <Text style={[styles.pfBadgeText, isCurrent && styles.pfBadgeTextActive]}>
                          {st.platform}
                        </Text>
                      </View>
                      <Text style={styles.kmDistanceText}>{st.distanceKm} km</Text>
                    </View>
                  </View>
                </View>

                {/* Timings (Scheduled vs Actual) */}
                <View style={{ flex: 1.2, alignItems: 'center' }}>
                  <Text style={[styles.schedTimeText, isPassed && styles.timePassedText]}>
                    {st.scheduledArr === '--' ? st.scheduledDep : st.scheduledArr}
                  </Text>
                  <Text
                    style={[
                      styles.actualTimeText,
                      liveData.isDelayed ? styles.actualTimeDelayed : styles.actualTimeOnTime,
                      isPassed && styles.timePassedText,
                    ]}
                  >
                    {st.actualArr === '--' ? st.actualDep : st.actualArr}
                  </Text>
                </View>

                {/* Halt Info */}
                <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                  <Text style={[styles.haltText, isCurrent && styles.haltTextActive]}>
                    {st.haltDuration}
                  </Text>
                  {isCurrent && (
                    <View style={styles.liveIndicatorPill}>
                      <Text style={styles.liveIndicatorText}>LIVE</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ height: 35 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7FD',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  modeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: Colors.primary,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  modeSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  modeGpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    marginRight: 6,
  },
  gpsPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  refreshText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
  },
  suggestionsHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionNumBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  suggestionEmuBadge: {
    backgroundColor: '#15803D',
  },
  suggestionNumText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  suggestionNameText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  suggestionRouteText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  quickScroll: {
    marginTop: 10,
  },
  quickChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  quickChipTextActive: {
    color: Colors.primaryDark,
  },
  quickChipSub: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
  quickChipSubActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  liveBannerCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  bannerOnTime: {
    backgroundColor: '#16A34A',
  },
  bannerDelayed: {
    backgroundColor: '#DC2626',
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerMainTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  bannerSubTitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '600',
  },
  delayMinutesBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  delayMinutesText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  simSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  simLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  simPillsContainer: {
    flexDirection: 'row',
  },
  simPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  simPillActive: {
    backgroundColor: '#FFFFFF',
  },
  simPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  simPillTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  trainOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trainNumBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  emuNumBadge: {
    backgroundColor: '#15803D',
  },
  trainNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  typeBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  emuTypeBadge: {
    backgroundColor: '#DCFCE7',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  commuterTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commuterTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
  },
  trainHeadingName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  routeSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  telemetryDashboard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  telemetryCol: {
    alignItems: 'center',
    flex: 1,
  },
  telemetryVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  telemetryLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  telemetryDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#E2E8F0',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  timelineHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
    marginBottom: 10,
  },
  thLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  timelineList: {
    paddingLeft: 4,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 6,
    borderRadius: 10,
  },
  stationRowActive: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    marginHorizontal: -6,
    borderRadius: 10,
  },
  nodeColumn: {
    width: 26,
    alignItems: 'center',
    position: 'relative',
    height: '100%',
    justifyContent: 'center',
  },
  passedNode: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  currentNodeGlow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 4,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  upcomingNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
    zIndex: 2,
  },
  trackLine: {
    position: 'absolute',
    top: 24,
    bottom: -20,
    width: 3,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  trackLinePassed: {
    backgroundColor: Colors.secondary,
  },
  trackLineActive: {
    backgroundColor: '#16A34A',
  },
  stationDetailsTextCol: {
    flex: 1,
    marginLeft: 10,
  },
  stationNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  stationNameActive: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  stationCodeSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  platformBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  pfBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginRight: 6,
  },
  pfBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  pfBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  pfBadgeTextActive: {
    color: '#15803D',
  },
  kmDistanceText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  schedTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  actualTimeText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  actualTimeOnTime: {
    color: '#16A34A',
  },
  actualTimeDelayed: {
    color: '#DC2626',
  },
  timePassedText: {
    color: '#94A3B8',
  },
  haltText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  haltTextActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  liveIndicatorPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  liveIndicatorText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#15803D',
  },
  openTrackerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565C0',
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  openTrackerBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});
