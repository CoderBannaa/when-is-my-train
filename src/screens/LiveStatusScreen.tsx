import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, RefreshControl, Animated, Easing } from 'react-native';
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

export interface StationDepartureItem {
  number: string;
  name: string;
  destCode: string;
  destName: string;
  platform: string;
  schedDep: string;
  actualDep: string;
  delayMinutes: number;
  isDelayed: boolean;
  type: string;
  isLocalEmu: boolean;
}

const DEPARTURE_BOARD_DATABASE: { [stationCode: string]: StationDepartureItem[] } = {
  NDLS: [
    { number: '22436', name: 'Vande Bharat Express', destCode: 'BSB', destName: 'Varanasi Jn', platform: 'PF 16', schedDep: '06:00 AM', actualDep: '06:00 AM', delayMinutes: 0, isDelayed: false, type: 'Vande Bharat', isLocalEmu: false },
    { number: '12004', name: 'Lucknow Shatabdi Exp', destCode: 'LKO', destName: 'Lucknow Jn', platform: 'PF 1', schedDep: '06:10 AM', actualDep: '06:15 AM', delayMinutes: 5, isDelayed: true, type: 'Shatabdi', isLocalEmu: false },
    { number: '64902', name: 'New Delhi - Mathura EMU', destCode: 'MTJ', destName: 'Mathura Jn', platform: 'PF 5', schedDep: '06:30 AM', actualDep: '06:30 AM', delayMinutes: 0, isDelayed: false, type: 'EMU Local', isLocalEmu: true },
    { number: '12418', name: 'Prayagraj Superfast Exp', destCode: 'PRYJ', destName: 'Prayagraj Jn', platform: 'PF 14', schedDep: '06:45 AM', actualDep: '06:45 AM', delayMinutes: 0, isDelayed: false, type: 'Superfast', isLocalEmu: false },
    { number: '12314', name: 'Sealdah Rajdhani Express', destCode: 'SDAH', destName: 'Sealdah', platform: 'PF 12', schedDep: '07:05 AM', actualDep: '07:05 AM', delayMinutes: 0, isDelayed: false, type: 'Rajdhani', isLocalEmu: false },
    { number: '12952', name: 'Mumbai Central Tejas Rajdhani', destCode: 'MMCT', destName: 'Mumbai Central', platform: 'PF 3', schedDep: '07:25 AM', actualDep: '07:37 AM', delayMinutes: 12, isDelayed: true, type: 'Tejas Rajdhani', isLocalEmu: false },
    { number: '64904', name: 'Ghaziabad - Palwal EMU', destCode: 'PWL', destName: 'Palwal', platform: 'PF 7', schedDep: '07:45 AM', actualDep: '07:45 AM', delayMinutes: 0, isDelayed: false, type: 'EMU Local', isLocalEmu: true },
    { number: '12002', name: 'Bhopal Shatabdi Express', destCode: 'RKMP', destName: 'Rani Kamalapati', platform: 'PF 1', schedDep: '08:00 AM', actualDep: '08:00 AM', delayMinutes: 0, isDelayed: false, type: 'Shatabdi', isLocalEmu: false },
    { number: '14006', name: 'Lichchavi Express', destCode: 'SMI', destName: 'Sitamarhi', platform: 'PF 9', schedDep: '08:20 AM', actualDep: '08:45 AM', delayMinutes: 25, isDelayed: true, type: 'Mail / Express', isLocalEmu: false },
  ],
  CNB: [
    { number: '22436', name: 'Vande Bharat Express', destCode: 'BSB', destName: 'Varanasi Jn', platform: 'PF 1', schedDep: '10:20 AM', actualDep: '10:20 AM', delayMinutes: 0, isDelayed: false, type: 'Vande Bharat', isLocalEmu: false },
    { number: '12418', name: 'Prayagraj Superfast', destCode: 'PRYJ', destName: 'Prayagraj Jn', platform: 'PF 2', schedDep: '11:05 AM', actualDep: '11:05 AM', delayMinutes: 0, isDelayed: false, type: 'Superfast', isLocalEmu: false },
    { number: '64901', name: 'Kanpur - Lucknow MEMU', destCode: 'LKO', destName: 'Lucknow Charbagh', platform: 'PF 4', schedDep: '11:30 AM', actualDep: '11:30 AM', delayMinutes: 0, isDelayed: false, type: 'MEMU Local', isLocalEmu: true },
    { number: '12004', name: 'New Delhi Shatabdi', destCode: 'NDLS', destName: 'New Delhi', platform: 'PF 1', schedDep: '12:15 PM', actualDep: '12:25 PM', delayMinutes: 10, isDelayed: true, type: 'Shatabdi', isLocalEmu: false },
    { number: '05379', name: 'Lucknow - Kasganj Passenger', destCode: 'KSJ', destName: 'Kasganj Jn', platform: 'PF 6', schedDep: '01:00 PM', actualDep: '01:00 PM', delayMinutes: 0, isDelayed: false, type: 'Passenger', isLocalEmu: true },
  ],
  AGC: [
    { number: '12002', name: 'Bhopal Shatabdi', destCode: 'RKMP', destName: 'Rani Kamalapati', platform: 'PF 1', schedDep: '09:07 AM', actualDep: '09:07 AM', delayMinutes: 0, isDelayed: false, type: 'Shatabdi', isLocalEmu: false },
    { number: '22436', name: 'Vande Bharat Express', destCode: 'CNB', destName: 'Kanpur Central', platform: 'PF 1', schedDep: '09:09 AM', actualDep: '09:09 AM', delayMinutes: 0, isDelayed: false, type: 'Vande Bharat', isLocalEmu: false },
    { number: '64902', name: 'Mathura - Agra Passenger', destCode: 'AF', destName: 'Agra Fort', platform: 'PF 3', schedDep: '09:40 AM', actualDep: '09:40 AM', delayMinutes: 0, isDelayed: false, type: 'Local Passenger', isLocalEmu: true },
    { number: '12954', name: 'August Kranti Tejas Rajdhani', destCode: 'MMCT', destName: 'Mumbai Central', platform: 'PF 2', schedDep: '10:15 AM', actualDep: '10:35 AM', delayMinutes: 20, isDelayed: true, type: 'Tejas Rajdhani', isLocalEmu: false },
  ],
  BSB: [
    { number: '22435', name: 'Vande Bharat Express', destCode: 'NDLS', destName: 'New Delhi', platform: 'PF 1', schedDep: '03:00 PM', actualDep: '03:00 PM', delayMinutes: 0, isDelayed: false, type: 'Vande Bharat', isLocalEmu: false },
    { number: '12560', name: 'Shiv Ganga Express', destCode: 'NDLS', destName: 'New Delhi', platform: 'PF 8', schedDep: '07:15 PM', actualDep: '07:15 PM', delayMinutes: 0, isDelayed: false, type: 'Superfast', isLocalEmu: false },
    { number: '14265', name: 'Varanasi - Dehradun Janta', destCode: 'DDN', destName: 'Dehradun', platform: 'PF 5', schedDep: '08:25 PM', actualDep: '08:40 PM', delayMinutes: 15, isDelayed: true, type: 'Express', isLocalEmu: false },
  ],
  HWH: [
    { number: '12301', name: 'Howrah Rajdhani Express', destCode: 'NDLS', destName: 'New Delhi', platform: 'PF 9', schedDep: '04:50 PM', actualDep: '04:50 PM', delayMinutes: 0, isDelayed: false, type: 'Rajdhani', isLocalEmu: false },
    { number: '12863', name: 'Howrah - SMVT Bengaluru SF', destCode: 'SMVB', destName: 'SMVT Bengaluru', platform: 'PF 18', schedDep: '05:40 PM', actualDep: '05:40 PM', delayMinutes: 0, isDelayed: false, type: 'Superfast', isLocalEmu: false },
    { number: '38821', name: 'Howrah - Midnapore Local', destCode: 'MDN', destName: 'Midnapore', platform: 'PF 14', schedDep: '06:10 PM', actualDep: '06:10 PM', delayMinutes: 0, isDelayed: false, type: 'Local EMU', isLocalEmu: true },
  ],
  MMCT: [
    { number: '12951', name: 'Mumbai Central Rajdhani', destCode: 'NDLS', destName: 'New Delhi', platform: 'PF 1', schedDep: '05:00 PM', actualDep: '05:00 PM', delayMinutes: 0, isDelayed: false, type: 'Tejas Rajdhani', isLocalEmu: false },
    { number: '12953', name: 'August Kranti Rajdhani', destCode: 'NZM', destName: 'Hazrat Nizamuddin', platform: 'PF 2', schedDep: '05:40 PM', actualDep: '05:40 PM', delayMinutes: 0, isDelayed: false, type: 'Rajdhani', isLocalEmu: false },
    { number: '90001', name: 'Churchgate - Virar Fast Local', destCode: 'VR', destName: 'Virar', platform: 'PF 3', schedDep: '06:05 PM', actualDep: '06:05 PM', delayMinutes: 0, isDelayed: false, type: 'Fast Local', isLocalEmu: true },
  ],
};

export const LiveStatusScreen: React.FC<LiveStatusScreenProps> = ({ initialTrainNumber, onTrackTrain }) => {
  const { isDarkMode, colors, t } = usePreferences();
  const [screenMode, setScreenMode] = useState<'spot_train' | 'departure_board'>('spot_train');
  const [selectedDepartureStation, setSelectedDepartureStation] = useState('NDLS');
  const [departureStationQuery, setDepartureStationQuery] = useState('New Delhi (NDLS)');
  const [departureFilter, setDepartureFilter] = useState<'all' | 'express' | 'local'>('all');

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

  const currentDepartures = useMemo(() => {
    return DEPARTURE_BOARD_DATABASE[selectedDepartureStation] || DEPARTURE_BOARD_DATABASE.NDLS;
  }, [selectedDepartureStation]);

  const filteredDepartures = useMemo(() => {
    return currentDepartures.filter((d) => {
      if (departureFilter === 'express') return !d.isLocalEmu;
      if (departureFilter === 'local') return d.isLocalEmu;
      return true;
    });
  }, [currentDepartures, departureFilter]);

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

  const screenFadeAnim = useRef(new Animated.Value(0)).current;
  const screenSlideAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(screenSlideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [screenFadeAnim, screenSlideAnim, screenMode]);

  return (
    <ScrollView
      style={[styles.container, isDarkMode && { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
      }
    >
      <Animated.View style={{ opacity: screenFadeAnim, transform: [{ translateY: screenSlideAnim }] }}>
      {/* 0. Top Segmented View Switcher: Spot Train vs Station Live Departures */}
      <View style={[styles.topSegmentedSwitcher, isDarkMode && { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.topSegmentedBtn, screenMode === 'spot_train' && styles.topSegmentedBtnActive]}
          onPress={() => setScreenMode('spot_train')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="train"
            size={16}
            color={screenMode === 'spot_train' ? '#FFFFFF' : Colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.topSegmentedText, screenMode === 'spot_train' && styles.topSegmentedTextActive]}>
            Spot Train
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topSegmentedBtn, screenMode === 'departure_board' && styles.topSegmentedBtnActive]}
          onPress={() => setScreenMode('departure_board')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="domain"
            size={16}
            color={screenMode === 'departure_board' ? '#FFFFFF' : Colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.topSegmentedText, screenMode === 'departure_board' && styles.topSegmentedTextActive]}>
            Station Departure Board
          </Text>
        </TouchableOpacity>
      </View>

      {screenMode === 'spot_train' ? (
        <>
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
                ⚡ Simulated Route
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simPill, timeMode === 'real' && styles.simPillActive]}
              onPress={() => setTimeMode('real')}
            >
              <Text style={[styles.simPillText, timeMode === 'real' && styles.simPillTextActive]}>
                🕒 Live Time
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

      {/* Button to Open the full-screen tracker screen */}
      {onTrackTrain && (
        <TouchableOpacity
          style={styles.openTrackerBtn}
          onPress={() => onTrackTrain(selectedTrainNum, activeTrain.name)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="train" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.openTrackerBtnText}>OPEN LIVE TRAIN TRACKER</Text>
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
    </>
  ) : (
    <View style={styles.deptMainWrapper}>
      {/* 1. Station Selector & Search Card */}
      <View style={[styles.deptStationCard, isDarkMode && { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.deptHeaderRow}>
          <View style={styles.deptIconCircle}>
            <MaterialCommunityIcons name="clock-time-four-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.deptTitle, { color: colors.textPrimary }]}>Live Station Departures</Text>
            <Text style={[styles.deptSub, { color: colors.textSecondary }]}>
              Real-time platform & delay updates
            </Text>
          </View>
        </View>

        {/* Station Search Input */}
        <View style={[styles.deptSearchInputRow, isDarkMode && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
          <Ionicons name="search" size={17} color={Colors.primary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.deptInput, isDarkMode && { color: colors.textPrimary }]}
            value={departureStationQuery}
            onChangeText={(text) => {
              setDepartureStationQuery(text);
              const upper = text.trim().toUpperCase();
              if (DEPARTURE_BOARD_DATABASE[upper]) {
                setSelectedDepartureStation(upper);
              }
            }}
            placeholder="Search station (e.g. NDLS, Kanpur, AGC, HWH)..."
            placeholderTextColor={colors.textMuted}
          />
          {departureStationQuery.length > 0 && (
            <TouchableOpacity onPress={() => setDepartureStationQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Station Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickStationsScroll}>
          {[
            { code: 'NDLS', name: 'New Delhi' },
            { code: 'CNB', name: 'Kanpur Central' },
            { code: 'AGC', name: 'Agra Cantt' },
            { code: 'BSB', name: 'Varanasi' },
            { code: 'HWH', name: 'Howrah' },
            { code: 'MMCT', name: 'Mumbai' },
          ].map((st) => {
            const isSel = selectedDepartureStation === st.code;
            return (
              <TouchableOpacity
                key={st.code}
                style={[styles.quickStationPill, isSel && styles.quickStationPillActive]}
                onPress={() => {
                  setSelectedDepartureStation(st.code);
                  setDepartureStationQuery(`${st.name} (${st.code})`);
                }}
              >
                <Text style={[styles.quickStationPillCode, isSel && styles.quickStationPillCodeActive]}>
                  {st.code}
                </Text>
                <Text style={[styles.quickStationPillName, isSel && styles.quickStationPillNameActive]}>
                  {st.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter Chips (All vs Express vs Local) */}
        <View style={styles.filterPillsRow}>
          {[
            { key: 'all', label: `All (${currentDepartures.length})` },
            { key: 'express', label: 'Express / Mail' },
            { key: 'local', label: 'Local EMU' },
          ].map((f) => {
            const isFActive = departureFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, isFActive && styles.filterPillActive]}
                onPress={() => setDepartureFilter(f.key as any)}
              >
                <Text style={[styles.filterPillText, isFActive && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. Departures List */}
      <View style={styles.departureListContainer}>
        {filteredDepartures.map((dept) => (
          <View
            key={dept.number}
            style={[styles.deptItemCard, isDarkMode && { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.deptCardRow}>
              {/* Scheduled & Actual Times */}
              <View style={styles.deptTimeCol}>
                <Text style={[styles.deptSchedTime, { color: colors.textPrimary }]}>{dept.schedDep}</Text>
                <Text
                  style={[
                    styles.deptTimeExp,
                    dept.isDelayed ? styles.actualTimeDelayed : styles.actualTimeOnTime,
                  ]}
                >
                  Exp: {dept.actualDep}
                </Text>
              </View>

              {/* Train Name & Route */}
              <View style={styles.deptMidCol}>
                <View style={styles.deptBadgeAndNum}>
                  <View style={[styles.deptNumBadge, dept.isLocalEmu && styles.deptEmuBadge]}>
                    <Text style={styles.deptNumBadgeText}>{dept.number}</Text>
                  </View>
                  <Text style={[styles.deptTrainName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {dept.name}
                  </Text>
                </View>
                <Text style={[styles.deptDestSub, { color: colors.textSecondary }]}>
                  ➔ To {dept.destName} ({dept.destCode}) • {dept.type}
                </Text>
              </View>

              {/* Platform & Delay status */}
              <View style={styles.deptRightCol}>
                <View style={[styles.deptPlatformBadge, isDarkMode && { backgroundColor: colors.cardSecondary }]}>
                  <Text style={[styles.deptPlatformText, isDarkMode && { color: colors.textPrimary }]}>{dept.platform}</Text>
                </View>
                <View
                  style={[
                    styles.deptStatusPill,
                    dept.isDelayed ? styles.deptStatusPillRed : styles.deptStatusPillGreen,
                  ]}
                >
                  <Text
                    style={[
                      styles.deptStatusText,
                      dept.isDelayed ? styles.actualTimeDelayed : styles.actualTimeOnTime,
                    ]}
                  >
                    {dept.isDelayed ? `+${dept.delayMinutes}m` : 'ON TIME'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Track Action Button */}
            {onTrackTrain && (
              <TouchableOpacity
                style={styles.deptTrackBtn}
                onPress={() => onTrackTrain(dept.number, dept.name)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="train" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.deptTrackBtnText}>Track Train Live</Text>
                <Ionicons name="chevron-forward" size={13} color={Colors.primary} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </View>
  )}

      <View style={{ height: 35 }} />
      </Animated.View>
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
    borderRadius: 18,
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
    borderRadius: 12,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: Colors.primary,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.1,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modeSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  modeGpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    marginRight: 6,
  },
  gpsPillText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.primary,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  suggestionsContainer: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
  },
  suggestionsHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionNumBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  suggestionEmuBadge: {
    backgroundColor: '#15803D',
  },
  suggestionNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  suggestionNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  suggestionRouteText: {
    fontSize: 10.5,
    color: Colors.textSecondary,
  },
  quickScroll: {
    marginTop: 12,
  },
  quickChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primary,
  },
  quickChipTextActive: {
    color: Colors.primaryDark,
  },
  quickChipSub: {
    fontSize: 9.5,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  quickChipSubActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  liveBannerCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
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
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  emuNumBadge: {
    backgroundColor: '#15803D',
  },
  trainNumText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  typeBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  emuTypeBadge: {
    backgroundColor: '#DCFCE7',
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.primary,
  },
  commuterTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  commuterTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#92400E',
  },
  trainHeadingName: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  routeSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  telemetryDashboard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
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
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3,
  },
  telemetryLabel: {
    fontSize: 9.5,
    color: Colors.textSecondary,
    marginTop: 1,
    fontWeight: '500',
  },
  telemetryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
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

  // Top Segmented Switcher
  topSegmentedSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  topSegmentedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  topSegmentedBtnActive: {
    backgroundColor: Colors.primary,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  topSegmentedText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  topSegmentedTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Departure Board Styles
  deptMainWrapper: {
    width: '100%',
  },
  deptStationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  deptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deptIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    marginLeft: 8,
  },
  deptSub: {
    fontSize: 11,
    marginLeft: 8,
    marginTop: 1,
  },
  deptSearchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  deptInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickStationsScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  quickStationPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  quickStationPillActive: {
    backgroundColor: Colors.primary,
  },
  quickStationPillCode: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickStationPillCodeActive: {
    color: '#FFFFFF',
  },
  quickStationPillName: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  quickStationPillNameActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  departureListContainer: {
    marginBottom: 16,
  },
  deptItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  deptCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deptTimeCol: {
    width: 72,
  },
  deptSchedTime: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  deptTimeExp: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  deptMidCol: {
    flex: 1,
    marginHorizontal: 8,
  },
  deptBadgeAndNum: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  deptNumBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginRight: 6,
  },
  deptEmuBadge: {
    backgroundColor: '#DCFCE7',
  },
  deptNumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  deptTrainName: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  deptDestSub: {
    fontSize: 11,
    marginTop: 1,
  },
  deptRightCol: {
    alignItems: 'flex-end',
  },
  deptPlatformBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  deptPlatformText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  deptStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deptStatusPillGreen: {
    backgroundColor: '#DCFCE7',
  },
  deptStatusPillRed: {
    backgroundColor: '#FEE2E2',
  },
  deptStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  textOnTimeGreen: {
    color: '#15803D',
  },
  textDelayedRed: {
    color: '#DC2626',
  },
  deptTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingVertical: 7,
    marginTop: 10,
  },
  deptTrackBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primary,
  },
});
