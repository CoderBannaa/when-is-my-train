import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  Modal,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { CorridorTrain, findOrGenerateTrain } from '../data/trainsBetweenStations';
import { calculateLiveStatus, parseTimeToMinutes, StationLiveDetail } from '../utils/liveStatusEngine';
import { LiveTrainApi, TrainCache, LiveTrainTrackingData } from '../services/liveTrainApiService';
import { usePreferences } from '../context/PreferencesContext';

function calculateDurationText(depStr: string, arrStr: string): string {
  try {
    const parse = (s: string) => {
      const parts = s.trim().split(' ');
      const [hStr, mStr] = parts[0].split(':');
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const mer = parts[1]?.toUpperCase();
      if (mer === 'PM' && h !== 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    const depM = parse(depStr);
    let arrM = parse(arrStr);
    if (arrM < depM) arrM += 1440;
    const diff = arrM - depM;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  } catch {
    return '04h 08m';
  }
}

export const VANDE_BHARAT_22436_STOPS: StationLiveDetail[] = [
  {
    code: 'NDLS',
    name: 'New Delhi (NDLS)',
    scheduledArr: '06:00 AM',
    scheduledDep: '06:00 AM',
    actualArr: '06:00 AM',
    actualDep: '06:00 AM',
    platform: 'Platform 16',
    distanceKm: 0,
    haltDuration: 'Origin',
    status: 'PASSED',
    delayAtStopMinutes: 0,
    isDelayed: false,
  },
  {
    code: 'NZM',
    name: 'Hazrat Nizamuddin (NZM)',
    scheduledArr: '06:18 AM',
    scheduledDep: '06:20 AM',
    actualArr: '06:19 AM',
    actualDep: '06:21 AM',
    platform: 'Platform 2',
    distanceKm: 15,
    haltDuration: 'Pass',
    status: 'PASSED',
    delayAtStopMinutes: 1,
    isDelayed: false,
    isPassing: true,
  },
  {
    code: 'TKD',
    name: 'Tughlakabad (TKD)',
    scheduledArr: '06:55 AM',
    scheduledDep: '06:57 AM',
    actualArr: '07:02 AM',
    actualDep: '07:05 AM',
    platform: 'Through',
    distanceKm: 32,
    haltDuration: 'Pass',
    status: 'PASSED',
    delayAtStopMinutes: 7,
    delayMinutes: 2,
    isDelayed: true,
    isPassing: true,
  },
  {
    code: 'FDB',
    name: 'Faridabad (FDB)',
    scheduledArr: '07:23 AM',
    scheduledDep: '07:25 AM',
    actualArr: '07:26 AM',
    actualDep: '07:28 AM',
    platform: 'Platform 3',
    distanceKm: 58,
    haltDuration: 'Pass',
    status: 'PASSED',
    delayAtStopMinutes: 3,
    delayMinutes: 3,
    isDelayed: true,
    isPassing: true,
  },
  {
    code: 'MTJ',
    name: 'Mathura Jn (MTJ)',
    scheduledArr: '08:10 AM',
    scheduledDep: '08:12 AM',
    actualArr: '08:12 AM',
    actualDep: '08:14 AM',
    platform: 'Platform 4',
    distanceKm: 187,
    haltDuration: '2m',
    status: 'CURRENT',
    delayAtStopMinutes: 2,
    delayMinutes: 2,
    isDelayed: true,
  },
  {
    code: 'BTSR',
    name: 'Bhuteshwar (BTSR)',
    scheduledArr: '08:22 AM',
    scheduledDep: '08:22 AM',
    actualArr: '08:24 AM',
    actualDep: '08:24 AM',
    platform: 'Through',
    distanceKm: 190,
    haltDuration: 'Pass',
    status: 'UPCOMING',
    delayAtStopMinutes: 2,
    isDelayed: false,
    isPassing: true,
  },
  {
    code: 'FAR',
    name: 'Farah (FAR)',
    scheduledArr: '08:38 AM',
    scheduledDep: '08:38 AM',
    actualArr: '08:40 AM',
    actualDep: '08:40 AM',
    platform: 'Through',
    distanceKm: 212,
    haltDuration: 'Pass',
    status: 'UPCOMING',
    delayAtStopMinutes: 2,
    isDelayed: false,
    isPassing: true,
  },
  {
    code: 'RNKA',
    name: 'Runkuta (RNKA)',
    scheduledArr: '08:52 AM',
    scheduledDep: '08:52 AM',
    actualArr: '08:54 AM',
    actualDep: '08:54 AM',
    platform: 'Through',
    distanceKm: 228,
    haltDuration: 'Pass',
    status: 'UPCOMING',
    delayAtStopMinutes: 0,
    isDelayed: false,
    isPassing: true,
  },
  {
    code: 'AGC',
    name: 'Agra Cantt (AGC)',
    scheduledArr: '09:07 AM',
    scheduledDep: '09:09 AM',
    actualArr: '09:07 AM',
    actualDep: '09:09 AM',
    platform: 'Platform 1',
    distanceKm: 243,
    haltDuration: '2m',
    status: 'UPCOMING',
    delayAtStopMinutes: 0,
    isDelayed: false,
  },
  {
    code: 'BHA',
    name: 'Bhandai Jn (BHA)',
    scheduledArr: '09:20 AM',
    scheduledDep: '09:20 AM',
    actualArr: '09:20 AM',
    actualDep: '09:20 AM',
    platform: 'Through',
    distanceKm: 254,
    haltDuration: 'Pass',
    status: 'UPCOMING',
    delayAtStopMinutes: 0,
    isDelayed: false,
    isPassing: true,
  },
  {
    code: 'TDL',
    name: 'Tundla Jn (TDL)',
    scheduledArr: '09:38 AM',
    scheduledDep: '09:38 AM',
    actualArr: '09:38 AM',
    actualDep: '09:38 AM',
    platform: 'Through',
    distanceKm: 295,
    haltDuration: 'Pass',
    status: 'UPCOMING',
    delayAtStopMinutes: 0,
    isDelayed: false,
    isPassing: true,
  },
  {
    code: 'SKB',
    name: 'Shikohabad Jn (SKB)',
    scheduledArr: '09:48 AM',
    scheduledDep: '09:48 AM',
    actualArr: '09:48 AM',
    actualDep: '09:48 AM',
    platform: 'Through',
    distanceKm: 318,
    haltDuration: 'Pass',
    status: 'UPCOMING',
    delayAtStopMinutes: 0,
    isDelayed: false,
    isPassing: true,
  },
  {
    code: 'ETW',
    name: 'Etawah (ETW)',
    scheduledArr: '10:02 AM',
    scheduledDep: '10:04 AM',
    actualArr: '10:04 AM',
    actualDep: '10:04 AM',
    platform: 'Platform 2',
    distanceKm: 346,
    haltDuration: '2m',
    status: 'UPCOMING',
    delayAtStopMinutes: 0,
    isDelayed: false,
  },
  {
    code: 'PHD',
    name: 'Phaphund (PHD)',
    scheduledArr: '10:24 AM',
    scheduledDep: '10:24 AM',
    actualArr: '10:24 AM',
    actualDep: '10:24 AM',
    platform: 'Through',
    distanceKm: 382,
    haltDuration: 'Pass',
    status: 'UPCOMING',
    delayAtStopMinutes: 0,
    isDelayed: false,
    isPassing: true,
  },
  {
    code: 'RURA',
    name: 'Rura (RURA)',
    scheduledArr: '10:38 AM',
    scheduledDep: '10:38 AM',
    actualArr: '10:38 AM',
    actualDep: '10:38 AM',
    platform: 'Through',
    distanceKm: 405,
    haltDuration: 'Pass',
    status: 'UPCOMING',
    delayAtStopMinutes: 0,
    isDelayed: false,
    isPassing: true,
  },
  {
    code: 'PNKD',
    name: 'Panki Dham (PNKD)',
    scheduledArr: '10:52 AM',
    scheduledDep: '10:52 AM',
    actualArr: '10:52 AM',
    actualDep: '10:52 AM',
    platform: 'Through',
    distanceKm: 428,
    haltDuration: 'Pass',
    status: 'UPCOMING',
    delayAtStopMinutes: 0,
    isDelayed: false,
    isPassing: true,
  },
  {
    code: 'CNB',
    name: 'Kanpur Central (CNB)',
    scheduledArr: '10:08 AM',
    scheduledDep: '10:20 AM',
    actualArr: '10:20 AM',
    actualDep: '10:20 AM',
    platform: 'Platform 1',
    distanceKm: 440,
    haltDuration: 'Dest',
    status: 'UPCOMING',
    delayAtStopMinutes: 0,
    isDelayed: false,
  },
];

export interface TimelineCommercialItem {
  type: 'commercial';
  station: StationLiveDetail;
  originalIndex: number;
}

export interface TimelinePassingGroupItem {
  type: 'passingGroup';
  key: string;
  stations: {
    station: StationLiveDetail;
    originalIndex: number;
  }[];
}

export type TimelineItemType = TimelineCommercialItem | TimelinePassingGroupItem;

interface LiveTrainTrackerScreenProps {
  trainNumber: string;
  trainName?: string;
  fromStationCode?: string;
  toStationCode?: string;
  fromStationName?: string;
  toStationName?: string;
  onBack: () => void;
}

export const LiveTrainTrackerScreen: React.FC<LiveTrainTrackerScreenProps> = ({
  trainNumber,
  trainName,
  fromStationCode,
  toStationCode,
  fromStationName,
  toStationName,
  onBack,
}) => {
  const { isDarkMode, colors, t } = usePreferences();
  const [selectedDateMode, setSelectedDateMode] = useState<'today' | 'yesterday' | 'tomorrow'>('today');
  const [showDateModal, setShowDateModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [alarmStation, setAlarmStation] = useState<string | null>(null);
  const [liveApiResponse, setLiveApiResponse] = useState<LiveTrainTrackingData | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedSec, setLastUpdatedSec] = useState(0);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [customDestCode, setCustomDestCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'journey' | 'live_map' | 'coach_position' | 'info'>('journey');
  const [selectedCoach, setSelectedCoach] = useState<string>('C3');
  const [trackingSource, setTrackingSource] = useState<'cell' | 'gps'>('cell');
  const [selectedMapStationCode, setSelectedMapStationCode] = useState<string | null>(null);
  const [isTelemetryDeckExpanded, setIsTelemetryDeckExpanded] = useState<boolean>(true);
  const [alarmInterval, setAlarmInterval] = useState<'10m' | '15m' | '30m' | '5km' | '10km'>('15m');
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);

  // In-between / passing stations accordion expand state: { [groupKey: string]: boolean }
  const [expandedPassingGroups, setExpandedPassingGroups] = useState<{ [key: string]: boolean }>({});

  const scrollRef = useRef<ScrollView>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const whistleBounce = useRef(new Animated.Value(1)).current;
  const [showHornBanner, setShowHornBanner] = useState(false);

  const handlePlayHorn = () => {
    Animated.sequence([
      Animated.timing(whistleBounce, { toValue: 1.35, duration: 90, useNativeDriver: true }),
      Animated.timing(whistleBounce, { toValue: 0.85, duration: 90, useNativeDriver: true }),
      Animated.timing(whistleBounce, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start();
    setShowHornBanner(true);
    setTimeout(() => setShowHornBanner(false), 2400);
  };

  const togglePassingGroup = useCallback((groupKey: string) => {
    setExpandedPassingGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);

  // Dynamic train lookup from catalog - default to 22436 Vande Bharat Express if no train is selected
  const activeTrain: CorridorTrain = useMemo(() => {
    const targetNumber = (trainNumber && trainNumber.trim().length > 0) ? trainNumber.trim() : '22436';
    let train = findOrGenerateTrain(targetNumber);
    if (fromStationCode && toStationCode && (train.originCode !== fromStationCode || train.destCode !== toStationCode)) {
      const routeSpecific = findOrGenerateTrain(`dyn-${targetNumber}-${fromStationCode}-${toStationCode}`);
      if (routeSpecific && routeSpecific.originCode === fromStationCode) {
        train = routeSpecific;
      }
    }
    return train;
  }, [trainNumber, fromStationCode, toStationCode]);

  // Load Real-time Live Status from Railway API with dynamic timely updates
  const fetchLiveTracking = useCallback(async (forceRefresh: boolean = false) => {
    setIsLoadingApi(true);
    try {
      const data = await LiveTrainApi.getLiveTrainStatus(activeTrain.number, forceRefresh);
      if (data) {
        setLiveApiResponse(data);
        setLastUpdatedSec(0);
      }
    } catch (err) {
      console.warn('Live API fetch error:', err);
    } finally {
      setIsLoadingApi(false);
    }
  }, [activeTrain.number]);

  useEffect(() => {
    // Check 10-minute cache first - will NOT hit API if already cached
    fetchLiveTracking(false);

    // Gentle 5-minute background cache sync (never forces API call)
    const interval = setInterval(() => {
      fetchLiveTracking(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLiveTracking]);

  // Animated pulse for current station train location
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdatedSec((prev) => (prev >= 60 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute simulation minutes: for default 22436 on Delhi corridor, default to 08:11 AM (491 mins)
  const simulationMinutes = useMemo(() => {
    const isDelhiCorridor = activeTrain.originCode === 'NDLS' && (activeTrain.destCode === 'CNB' || activeTrain.destCode === 'AGC' || activeTrain.destCode === 'MTJ' || activeTrain.destCode === 'PRYJ' || activeTrain.destCode === 'BSB');
    if (activeTrain.number === '22436' && isDelhiCorridor && !fromStationCode) {
      return 491; // 08:11 AM - train is at Mathura Jn (MTJ)
    }
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffsetMs);
    const mins = istDate.getHours() * 60 + istDate.getMinutes();

    const firstStopMins = parseTimeToMinutes(activeTrain.stops[0]?.dep || '06:00 AM');
    const lastStopMins = parseTimeToMinutes(activeTrain.stops[activeTrain.stops.length - 1]?.arr || '10:08 AM');
    if (mins < firstStopMins || mins > lastStopMins) {
      return Math.round((firstStopMins + lastStopMins) / 2);
    }
    return mins;
  }, [activeTrain, fromStationCode]);

  // Live data calculation
  const liveData = useMemo(() => {
    // If train is 22436 on the default Delhi-Mathura-Kanpur corridor, format station details to match the screenshot verbatim
    const isDelhiCorridor = activeTrain.originCode === 'NDLS' && (activeTrain.destCode === 'CNB' || activeTrain.destCode === 'AGC' || activeTrain.destCode === 'MTJ' || activeTrain.destCode === 'PRYJ' || activeTrain.destCode === 'BSB');
    if (activeTrain.number === '22436' && isDelhiCorridor && !fromStationCode) {
      return {
        trainNumber: '22436',
        trainName: 'Vande Bharat Express',
        type: 'Superfast',
        isLocalEmu: false,
        state: 'RUNNING_BETWEEN_STATIONS' as any,
        currentPlatform: 'Platform 4',
        currentStationName: 'Mathura Jn',
        currentStationCode: 'MTJ',
        nextStationName: 'Agra Cantt',
        nextStationCode: 'AGC',
        distanceToNextKm: 15,
        currentSpeed: 96,
        distanceRemainingKm: 253,
        totalDistanceKm: 440,
        distanceCoveredKm: 187,
        expectedArrivalAtDestination: '10:20 AM',
        lastUpdatedText: 'Day 0 - Sat, 20 Sep',
        etaNextStopMinutes: 55,
        delayMinutes: 2,
        isDelayed: true,
        activeStopIndex: 4,
        bannerStatusText: '15 km to Agra Cantt',
        bannerSubText: 'Speed 96 km/h • Next: Agra Cantt',
        stationDetails: VANDE_BHARAT_22436_STOPS,
      };
    }

    if (liveApiResponse && liveApiResponse.stations && liveApiResponse.stations.length > 0) {
      const apiStations = liveApiResponse.stations;
      let activeIdx = apiStations.findIndex((s) => s.status === 'current');
      if (activeIdx === -1) {
        for (let i = apiStations.length - 1; i >= 0; i--) {
          if (apiStations[i].status === 'departed') {
            activeIdx = i;
            break;
          }
        }
      }
      if (activeIdx === -1) activeIdx = 0;

      const stationDetails: StationLiveDetail[] = apiStations.map((st, idx) => {
        let pfStr = st.platform || '1';
        if (!pfStr.toLowerCase().includes('pf') && !pfStr.toLowerCase().includes('platform')) {
          pfStr = `Platform ${pfStr}`;
        }
        let status: 'PASSED' | 'CURRENT' | 'UPCOMING' = 'UPCOMING';
        if (idx < activeIdx) status = 'PASSED';
        else if (idx === activeIdx) status = 'CURRENT';

        return {
          code: st.stationCode,
          name: st.stationName,
          scheduledArr: st.scheduledArrival,
          scheduledDep: st.scheduledDeparture,
          actualArr: st.actualArrival,
          actualDep: st.actualDeparture,
          delayMinutes: st.delayMinutes || 0,
          delayAtStopMinutes: st.delayMinutes || 0,
          isDelayed: (st.delayMinutes || 0) > 0,
          platform: pfStr,
          distanceKm: st.distanceKm,
          haltDuration: st.isPassing ? 'Pass' : '2m',
          haltMinutes: st.isPassing ? 0 : 2,
          status,
          isPassing: !!st.isPassing,
          day: st.day || 1,
        };
      });

      const covered = stationDetails[activeIdx]?.distanceKm || 0;
      const totalDist = stationDetails[stationDetails.length - 1]?.distanceKm || activeTrain.totalDistanceKm || 635;
      const remainingDist = liveApiResponse.distanceLeftKm ?? Math.max(0, totalDist - covered);

      let distNext = liveApiResponse.distanceToNextKm;
      if (!distNext) {
        if (activeIdx + 1 < stationDetails.length) {
          distNext = Math.max(1, stationDetails[activeIdx + 1].distanceKm - covered);
        } else {
          distNext = 15;
        }
      }

      return {
        trainNumber: activeTrain.number,
        trainName: activeTrain.name,
        type: activeTrain.type,
        isLocalEmu: activeTrain.isLocalEmu,
        state: 'RUNNING_BETWEEN_STATIONS' as any,
        currentPlatform: stationDetails[activeIdx]?.platform || 'Platform 4',
        currentStationName: liveApiResponse.currentStationName,
        currentStationCode: liveApiResponse.currentStationCode,
        nextStationName: liveApiResponse.nextStationName,
        nextStationCode: liveApiResponse.nextStationCode,
        distanceToNextKm: distNext,
        currentSpeed: liveApiResponse.currentSpeedKmH || 92,
        distanceRemainingKm: remainingDist,
        totalDistanceKm: totalDist,
        distanceCoveredKm: covered,
        expectedArrivalAtDestination: liveApiResponse.expectedArrivalAtDestination,
        lastUpdatedText: liveApiResponse.lastUpdated || 'RailRadar GPS Real-time',
        etaNextStopMinutes: 15,
        delayMinutes: liveApiResponse.totalDelayMinutes || 0,
        isDelayed: (liveApiResponse.totalDelayMinutes || 0) > 0,
        activeStopIndex: activeIdx,
        bannerStatusText: liveApiResponse.statusBanner,
        bannerSubText: `Speed ${liveApiResponse.currentSpeedKmH || 92} km/h • Next: ${liveApiResponse.nextStationName}`,
        stationDetails,
      };
    }

    // Engine calculation
    return calculateLiveStatus(activeTrain, simulationMinutes);
  }, [liveApiResponse, activeTrain, simulationMinutes]);

  // Clean station items mapping with collapsible intermediate passing groups
  const timelineItems: TimelineItemType[] = useMemo(() => {
    const items: TimelineItemType[] = [];
    let currentPassing: { station: StationLiveDetail; originalIndex: number }[] = [];
    let groupCount = 0;

    liveData.stationDetails.forEach((st, idx) => {
      if (st.isPassing) {
        currentPassing.push({ station: st, originalIndex: idx });
      } else {
        if (currentPassing.length > 0) {
          items.push({
            type: 'passingGroup',
            key: `pass-group-${groupCount++}`,
            stations: [...currentPassing],
          });
          currentPassing = [];
        }
        items.push({
          type: 'commercial',
          station: st,
          originalIndex: idx,
        });
      }
    });

    if (currentPassing.length > 0) {
      items.push({
        type: 'passingGroup',
        key: `pass-group-${groupCount++}`,
        stations: [...currentPassing],
      });
    }

    return items;
  }, [liveData.stationDetails]);

  // Derived route info
  const routeOriginStation = useMemo(() => {
    const firstComm = liveData.stationDetails.find((s) => !s.isPassing);
    return firstComm || liveData.stationDetails[0] || { code: activeTrain.originCode, scheduledDep: '06:00 AM' };
  }, [liveData.stationDetails, activeTrain.originCode]);

  const routeDestStation = useMemo(() => {
    if (customDestCode) {
      const match = liveData.stationDetails.find((s) => s.code === customDestCode);
      if (match) return match;
    }
    const comms = liveData.stationDetails.filter((s) => !s.isPassing);
    return comms[comms.length - 1] || liveData.stationDetails[liveData.stationDetails.length - 1] || { code: activeTrain.destCode, scheduledArr: '10:08 AM' };
  }, [liveData.stationDetails, customDestCode, activeTrain.destCode]);

  const routeOriginCode = routeOriginStation.code || activeTrain.originCode;
  const routeOriginDepTime = routeOriginStation.scheduledDep !== '--' ? routeOriginStation.scheduledDep : routeOriginStation.scheduledArr;
  const routeDestCode = routeDestStation.code || activeTrain.destCode;
  const routeDestArrTime = routeDestStation.scheduledArr !== '--' ? routeDestStation.scheduledArr : routeDestStation.scheduledDep;

  const routeCommercialHalts = useMemo(() => {
    const halts = liveData.stationDetails.filter((s) => !s.isPassing);
    return Math.max(0, halts.length - 2);
  }, [liveData.stationDetails]);

  const routeDuration = useMemo(() => {
    if (activeTrain.number === '22436' && !customDestCode) return '04h 08m';
    if (activeTrain.duration && !customDestCode) return activeTrain.duration;
    return calculateDurationText(routeOriginDepTime, routeDestArrTime);
  }, [activeTrain.number, activeTrain.duration, customDestCode, routeOriginDepTime, routeDestArrTime]);

  // Keep active station state synced
  useEffect(() => {
    // Current train stop index is tracked via liveData.activeStopIndex
  }, [liveData.activeStopIndex]);

  const handleScrollToCurrent = useCallback(() => {
    if (scrollRef.current && liveData.activeStopIndex >= 0) {
      if (liveData.activeStopIndex > 2) {
        scrollRef.current.scrollTo({
          y: Math.max(0, (liveData.activeStopIndex - 2) * 60),
          animated: true,
        });
      } else {
        scrollRef.current.scrollTo({ y: 0, animated: true });
      }
    }
  }, [liveData.activeStopIndex]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 650,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => spinAnim.setValue(0));

    TrainCache.invalidate(`live_status_${activeTrain.number}`);
    setLastUpdatedSec(0);
    await fetchLiveTracking(true);
    setTimeout(() => {
      handleScrollToCurrent();
    }, 350);
    setIsRefreshing(false);
  }, [activeTrain.number, fetchLiveTracking, handleScrollToCurrent, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Anchored at top on screen mount - no automatic shift or jumping down

  const handleShare = useCallback(async () => {
    const text = `🚆 ${activeTrain.number} ${activeTrain.name}
📍 Current Location: ${liveData.currentStationName} (${liveData.currentStationCode})
➡️ Next Station: ${liveData.nextStationName} (${liveData.nextStationCode})
🟢 Status: ${liveData.isDelayed ? `${liveData.delayMinutes} min late` : 'On Time'}
Speed: ${liveData.currentSpeed || 96} km/h • Distance Left: ${liveData.distanceRemainingKm ?? 252} km
Expected Arrival: ${(liveData as any).expectedArrivalAtDestination || routeDestArrTime || '10:20 AM'}
Tracked on When is my train App`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          alert('Live train status copied to clipboard!');
        }
      } else {
        await Share.share({ message: text });
      }
    } catch {}
  }, [activeTrain, liveData]);

  // Formatted date string matching screenshot: Day 0 - Sat, 20 Sep
  const formattedDayText = useMemo(() => {
    const now = new Date();
    if (selectedDateMode === 'yesterday') now.setDate(now.getDate() - 1);
    if (selectedDateMode === 'tomorrow') now.setDate(now.getDate() + 1);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `Day 0 - ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
  }, [selectedDateMode]);

  const datePillLabel = useMemo(() => {
    if (selectedDateMode === 'yesterday') return 'Yesterday';
    if (selectedDateMode === 'tomorrow') return 'Tomorrow';
    return 'Today';
  }, [selectedDateMode]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ================= 1. FIXED TOP HEADER ================= */}
      <View style={[styles.headerWrapper, isDarkMode && { backgroundColor: '#0B192C' }]}>
        <View style={[styles.header, isDarkMode && { backgroundColor: '#0B192C' }]}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitleText} numberOfLines={1}>
              {activeTrain.number} - {activeTrain.name}
            </Text>
            <Text style={styles.headerSubText} numberOfLines={1}>
              {activeTrain.originCode} ➔ {routeDestCode} ({activeTrain.originName} to {activeTrain.destName})
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconBtn, { marginLeft: 10 }]}
              onPress={() => setShowMenuModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 2. ACTION CHIPS BAR (Today ▾, Alarm, Coach, Share) ================= */}
        <View style={[styles.actionPillsBar, isDarkMode && { backgroundColor: '#0B192C' }]}>
          <TouchableOpacity
            style={styles.todayActionPill}
            activeOpacity={0.85}
            onPress={() => setShowDateModal(true)}
          >
            <Text style={styles.todayActionPillText}>{datePillLabel}</Text>
            <Ionicons name="caret-down" size={13} color={Colors.primary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlinedActionPill, isAlarmActive && { backgroundColor: '#16A34A', borderColor: '#16A34A' }]}
            onPress={() => setShowAlarmModal(true)}
            activeOpacity={0.75}
          >
            <Ionicons name={isAlarmActive ? 'alarm' : 'alarm-outline'} size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.outlinedActionPillText}>{isAlarmActive ? 'Alarm ON' : 'Alarm'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlinedActionPill}
            onPress={() => setActiveTab('coach_position')}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="train" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.outlinedActionPillText}>Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlinedActionPill}
            onPress={handleShare}
            activeOpacity={0.75}
          >
            <Ionicons name="share-social-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.outlinedActionPillText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= 3. SQUEEZED ROUTE & TRACKING COMPACT STRIP (High Density, Saves 80px) ================= */}
      <View style={[styles.squeezedRouteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Top: Compact Route Track Row */}
        <View style={styles.squeezedRouteRow}>
          <View style={styles.squeezedStationCol}>
            <Text style={[styles.squeezedCodeBig, { color: colors.textPrimary }]}>{routeOriginCode}</Text>
            <Text style={[styles.squeezedTimeSub, { color: colors.textSecondary }]}>{routeOriginDepTime}</Text>
          </View>

          <View style={styles.squeezedCenterTrackCol}>
            <View style={styles.squeezedDurationPill}>
              <Text style={styles.squeezedDurationText}>
                {routeDuration} • {routeCommercialHalts > 0 && activeTrain.number !== '22436' ? `${routeCommercialHalts} stops` : 'Non-stop'}
              </Text>
            </View>
            <View style={styles.squeezedTrackLineRow}>
              <View style={styles.squeezedDotBlue} />
              <View style={styles.squeezedTrackLine} />
              <Ionicons name="arrow-forward" size={11} color={Colors.primary} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.squeezedStationCol, { alignItems: 'flex-end' }]}
            onPress={() => setShowDestModal(true)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.squeezedCodeBig, { color: colors.textPrimary }]}>{routeDestCode}</Text>
              <Ionicons name="chevron-down" size={13} color={Colors.primary} style={{ marginLeft: 2 }} />
            </View>
            <Text style={[styles.squeezedTimeSub, { color: colors.textSecondary }]}>{routeDestArrTime}</Text>
          </TouchableOpacity>
        </View>

        {/* Micro-row: Integrated Squeezed Tracking Engine & Offline Tag */}
        <View style={[styles.squeezedTrackingMicroRow, { borderTopColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
          <View style={styles.squeezedTrackingLeft}>
            <Text style={[styles.squeezedTrackingLabel, { color: colors.textSecondary }]}>Via:</Text>
            <TouchableOpacity
              style={[styles.squeezedSourcePill, trackingSource === 'cell' && styles.squeezedSourcePillActive]}
              onPress={() => setTrackingSource('cell')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="transmission-tower"
                size={11}
                color={trackingSource === 'cell' ? '#FFFFFF' : Colors.primary}
                style={{ marginRight: 3 }}
              />
              <Text style={[styles.squeezedSourcePillText, trackingSource === 'cell' && styles.squeezedSourcePillTextActive]}>
                Cell tower
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.squeezedSourcePill, trackingSource === 'gps' && styles.squeezedSourcePillActive]}
              onPress={() => setTrackingSource('gps')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={11}
                color={trackingSource === 'gps' ? '#FFFFFF' : Colors.primary}
                style={{ marginRight: 3 }}
              />
              <Text style={[styles.squeezedSourcePillText, trackingSource === 'gps' && styles.squeezedSourcePillTextActive]}>
                GPS
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.squeezedOfflineTag, { backgroundColor: isDarkMode ? '#064E3B' : '#DCFCE7' }]}>
            <View style={styles.squeezedGreenDot} />
            <Text style={[styles.squeezedOfflineText, { color: isDarkMode ? '#34D399' : '#15803D' }]}>
              Works without internet
            </Text>
          </View>
        </View>
      </View>

      {/* ================= 4. 4 SUB-TABS NAVIGATION BAR ================= */}
      <View style={[styles.subTabsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[
          { key: 'journey', label: 'Journey' },
          { key: 'live_map', label: 'Live Map' },
          { key: 'coach_position', label: 'Coach Position' },
          { key: 'info', label: 'Info' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.subTabItem}
              onPress={() => setActiveTab(tab.key as any)}
              activeOpacity={0.75}
            >
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.subTabActiveLine} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ================= TAB 1: JOURNEY (TIMELINE VIEW) ================= */}
      {activeTab === 'journey' && (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Hero Departed Status Banner (Reference App Screenshot 1) */}
          <View style={[styles.heroStatusBanner, { backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF', borderColor: isDarkMode ? '#334155' : '#BFDBFE' }]}>
            <View style={styles.heroStatusLeft}>
              <View style={[styles.heroStatusIconCircle, { backgroundColor: liveData.isDelayed ? '#FEE2E2' : '#DCFCE7' }]}>
                <MaterialCommunityIcons
                  name={liveData.state === 'HALTED_AT_STATION' ? 'bus-stop' : 'train'}
                  size={18}
                  color={liveData.isDelayed ? '#DC2626' : '#16A34A'}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={[styles.heroStatusTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    Departed {liveData.currentStationName}
                  </Text>
                  <View style={[styles.heroDelayPill, { backgroundColor: liveData.isDelayed ? '#FEE2E2' : '#DCFCE7' }]}>
                    <Text style={[styles.heroDelayText, { color: liveData.isDelayed ? '#DC2626' : '#15803D' }]}>
                      {liveData.isDelayed ? `+${liveData.delayMinutes}m` : 'ON TIME'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.heroStatusSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  Next stop: {liveData.nextStationName} ({liveData.distanceToNextKm ?? 56} km away)
                </Text>
              </View>
            </View>
          </View>

          {/* Timeline Column Headers Strip */}
          <View style={[styles.timelineHeaderStrip, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderBottomColor: colors.border }]}>
            <Text style={[styles.stripColText, { color: colors.textSecondary }]}>Arrival</Text>
            <Text style={[styles.stripTitleText, { color: colors.textPrimary }]}>{formattedDayText}</Text>
            <Text style={[styles.stripColText, { color: colors.textSecondary }]}>Departure</Text>
          </View>

          {/* ================= REAL-TIME GPS / TELEMETRY & SPEEDOMETER DECK (find.mytrain.where signature feature) ================= */}
          <View style={[styles.telemetryDeckContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Top Micro-Bar: RailRadar GPS Real-time + Sync Button */}
            <View style={[styles.telemetryStatusSubBar, { backgroundColor: isDarkMode ? '#064E3B' : '#F0FDF4', borderBottomColor: isDarkMode ? '#065F46' : '#DCFCE7' }]}>
              <View style={styles.telemetryLiveIndicatorRow}>
                <View style={styles.telemetryBlinkingDot} />
                <Text style={[styles.telemetryLiveStatusText, { color: isDarkMode ? '#34D399' : '#15803D' }]}>
                  {trackingSource === 'gps' ? 'RailRadar GPS Real-time' : 'Cell Tower Triangulation'} • Updated {lastUpdatedSec}s ago
                </Text>
              </View>

              <TouchableOpacity
                style={styles.telemetrySyncButton}
                onPress={() => fetchLiveTracking(true)}
                activeOpacity={0.7}
                disabled={isLoadingApi}
              >
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sync" size={13} color={isDarkMode ? '#34D399' : '#15803D'} />
                </Animated.View>
                <Text style={[styles.telemetrySyncText, { color: isDarkMode ? '#34D399' : '#15803D' }]}>Sync</Text>
              </TouchableOpacity>
            </View>

            {/* Collapsible Speedometer Stats Row */}
            {isTelemetryDeckExpanded && (
              <>
                <View style={styles.speedometerMetricsRow}>
                  {/* Metric 1: Speed */}
                  <View style={[styles.speedometerMetricBox, { borderRightColor: colors.border }]}>
                    <View style={[styles.speedometerIconCircle, { backgroundColor: isDarkMode ? '#064E3B' : '#DCFCE7' }]}>
                      <MaterialCommunityIcons name="speedometer" size={18} color={isDarkMode ? '#34D399' : '#16A34A'} />
                    </View>
                    <View style={styles.speedometerTextCol}>
                      <Text style={[styles.speedometerLabelText, { color: colors.textSecondary }]}>Speed</Text>
                      <Text style={[styles.speedometerValueText, { color: isDarkMode ? '#34D399' : '#16A34A' }]}>
                        {liveData.currentSpeed || (activeTrain.number === '22436' ? 92 : 88)} km/h
                      </Text>
                    </View>
                  </View>

                  {/* Metric 2: Distance Left */}
                  <View style={[styles.speedometerMetricBox, { borderRightColor: colors.border }]}>
                    <View style={[styles.speedometerIconCircle, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
                      <Ionicons name="location" size={16} color="#0284C7" />
                    </View>
                    <View style={styles.speedometerTextCol}>
                      <Text style={[styles.speedometerLabelText, { color: colors.textSecondary }]}>Distance Left</Text>
                      <Text style={[styles.speedometerValueText, { color: colors.textPrimary }]}>
                        {liveData.distanceRemainingKm ?? 635} km
                      </Text>
                    </View>
                  </View>

                  {/* Metric 3: Expected Arrival */}
                  <View style={styles.speedometerMetricBox}>
                    <View style={[styles.speedometerIconCircle, { backgroundColor: isDarkMode ? '#312E81' : '#EEF2FF' }]}>
                      <Ionicons name="alarm" size={16} color="#4F46E5" />
                    </View>
                    <View style={styles.speedometerTextCol}>
                      <Text style={[styles.speedometerLabelText, { color: colors.textSecondary }]}>Exp. Arrival</Text>
                      <Text style={[styles.speedometerValueText, { color: colors.textPrimary }]}>
                        {liveData.expectedArrivalAtDestination || routeDestArrTime || '07:00 AM'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Telemetry Location & Next Stop Strip */}
                <View style={[styles.telemetryLocationStrip, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderTopColor: colors.border }]}>
                  <View style={styles.telemetryLocationRow}>
                    <Text style={styles.telemetryLocationEmoji}>📍</Text>
                    <Text style={[styles.telemetryLocationLabel, { color: colors.textSecondary }]}>Current:</Text>
                    <Text style={[styles.telemetryLocationValue, { color: colors.textPrimary }]} numberOfLines={1}>
                      {liveData.currentStationName} ({liveData.currentPlatform || 'PF 4'})
                    </Text>
                  </View>
                  <View style={styles.telemetryLocationRow}>
                    <Text style={styles.telemetryLocationEmoji}>➡️</Text>
                    <Text style={[styles.telemetryLocationLabel, { color: colors.textSecondary }]}>Next Stop:</Text>
                    <Text style={[styles.telemetryLocationValue, { color: colors.textPrimary }]} numberOfLines={1}>
                      {liveData.nextStationName}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Mini Toggle Handle to Collapse/Expand */}
            <TouchableOpacity
              style={styles.telemetryCollapseHandle}
              onPress={() => setIsTelemetryDeckExpanded(!isTelemetryDeckExpanded)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isTelemetryDeckExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.timelineScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 85 }}
          >
            <View style={styles.timelineContentWrapper}>
              {timelineItems.map((item, tIdx) => {
                if (item.type === 'passingGroup') {
                  const isExpanded = !!expandedPassingGroups[item.key];
                  return (
                    <View key={item.key} style={styles.passingGroupContainer}>
                      <TouchableOpacity
                        style={[styles.intermediateStationsBar, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC' }]}
                        onPress={() => togglePassingGroup(item.key)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.intermediateTrackLineCol}>
                          <View style={[styles.trackLinePassing, { backgroundColor: isDarkMode ? '#475569' : '#CBD5E1' }]} />
                        </View>
                        <View style={styles.intermediateContentCol}>
                          <View style={[styles.intermediateBadge, { backgroundColor: isDarkMode ? '#334155' : '#E0F2FE' }]}>
                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={12}
                              color={Colors.primary}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.intermediateText}>
                              {isExpanded
                                ? `Hide ${item.stations.length} intermediate stations`
                                : `+ ${item.stations.length} intermediate stations`}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isExpanded &&
                        item.stations.map((pSub) => {
                          const pSt = pSub.station;
                          const pPassed = pSub.originalIndex < liveData.activeStopIndex;
                          const pCurrent = pSub.originalIndex === liveData.activeStopIndex;
                          return (
                            <View
                              key={`passing-${pSt.code}-${pSub.originalIndex}`}
                              style={[
                                styles.passingStationRow,
                                { backgroundColor: colors.surface, borderBottomColor: colors.border },
                                pCurrent && { backgroundColor: isDarkMode ? '#1E3A5F' : '#EDF6FF' },
                              ]}
                            >
                              <View style={styles.timeColLeft}>
                                <Text style={[styles.passingTimeText, { color: colors.textSecondary }]}>
                                  {pSt.actualArr || pSt.scheduledArr || '--'}
                                </Text>
                              </View>
                              <View style={styles.passingTrackCol}>
                                <View style={[styles.passingTrackLineTop, pPassed ? styles.lineGreen : styles.lineGrey]} />
                                <View
                                  style={[
                                    styles.passingTrackDot,
                                    pPassed && styles.passingTrackDotGreen,
                                    pCurrent && styles.passingTrackDotCurrent,
                                  ]}
                                />
                                <View style={[styles.passingTrackLineBottom, pPassed ? styles.lineGreen : styles.lineGrey]} />
                              </View>
                              <View style={styles.passingInfoCol}>
                                <Text style={[styles.passingStationName, { color: colors.textPrimary }]} numberOfLines={1}>
                                  {pSt.name}
                                </Text>
                                <Text style={[styles.passingSpeedText, { color: colors.textSecondary }]}>
                                  Pass • {pSt.distanceKm} km
                                </Text>
                              </View>
                              <View style={styles.timeColRight}>
                                <Text style={[styles.passingTimeText, { color: colors.textSecondary }]}>
                                  {pSt.actualDep || pSt.scheduledDep || '--'}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  );
                }

                const st = item.station;
                const index = item.originalIndex;
                const isFirst = index === 0;
                const isLast = index === liveData.stationDetails.length - 1;
                const isPassed = index < liveData.activeStopIndex;
                const isCurrent = index === liveData.activeStopIndex;
                const isUpcoming = index > liveData.activeStopIndex;

                const schedArrText = st.scheduledArr !== '--' ? st.scheduledArr : st.scheduledDep;
                const schedDepText = st.scheduledDep !== '--' ? st.scheduledDep : st.scheduledArr;

                return (
                  <View
                    key={`${st.code}-${index}`}
                    style={[
                      styles.stationTimelineRow,
                      { backgroundColor: colors.surface, borderBottomColor: colors.border },
                      isCurrent && { backgroundColor: isDarkMode ? '#1E3A5F' : '#EDF6FF' },
                    ]}
                  >
                    {/* 1. Left Arrival Column */}
                    <View style={styles.timeColLeft}>
                      {isUpcoming && index === 5 ? (
                        <>
                          <Text style={styles.expectedLabelText}>Expected</Text>
                          <Text style={[styles.expectedTimeText, { color: isDarkMode ? '#38BDF8' : '#0284C7' }]}>09:07 AM</Text>
                        </>
                      ) : isUpcoming ? (
                        <>
                          <Text style={[styles.schedTimeText, { color: colors.textSecondary }]}>{schedArrText}</Text>
                          <Text style={[styles.expectedTimeText, { color: isDarkMode ? '#38BDF8' : '#0284C7' }]}>{st.actualArr || schedArrText}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.schedTimeText, { color: colors.textSecondary }]}>{schedArrText}</Text>
                          <Text
                            style={[
                              styles.actualTimeText,
                              st.isDelayed ? styles.textDelayedRed : styles.textPassedGreen,
                            ]}
                          >
                            {st.actualArr || schedArrText}
                          </Text>
                        </>
                      )}
                    </View>

                    {/* 2. Track & Node Column */}
                    <View style={styles.trackTrackWrapper}>
                      {!isFirst && (
                        <View
                          style={[
                            styles.trackLineHalfTop,
                            isPassed || isCurrent ? styles.lineGreen : styles.lineGrey,
                          ]}
                        />
                      )}
                      {!isLast && (
                        <View
                          style={[
                            styles.trackLineHalfBottom,
                            isPassed ? styles.lineGreen : styles.lineGrey,
                          ]}
                        />
                      )}

                      {/* Station Node Badge */}
                      {isCurrent ? (
                        <View style={styles.currentStationBadgeWrapper}>
                          <Animated.View
                            style={[
                              styles.currentPulseRing,
                              { transform: [{ scale: pulseAnim }] },
                            ]}
                          />
                          <View style={styles.currentTrainBadge}>
                            <MaterialCommunityIcons name="train" size={14} color="#FFFFFF" />
                          </View>
                        </View>
                      ) : isFirst ? (
                        <View style={styles.originTrainBadge}>
                          <MaterialCommunityIcons name="train" size={13} color="#FFFFFF" />
                        </View>
                      ) : isPassed ? (
                        <View style={styles.passedCheckCircle}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      ) : isLast ? (
                        <View style={styles.destRedDot} />
                      ) : (
                        <View style={styles.upcomingGreyDot} />
                      )}
                    </View>

                    {/* 3. Center Station Details Column */}
                    <View style={styles.stationInfoCol}>
                      <Text style={[styles.stationNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                        {st.name}
                      </Text>

                      <Text style={[styles.stationSubText, { color: colors.textSecondary }]}>
                        {st.distanceKm} km  {st.platform}
                      </Text>

                      {/* Status Badges */}
                      {isCurrent ? (
                        <View style={styles.currentStatusBadge}>
                          <Text style={styles.currentStatusBadgeText}>
                            Current Station • {st.isDelayed ? `${st.delayMinutes} min late` : 'On Time'}
                          </Text>
                        </View>
                      ) : isPassed && st.isDelayed ? (
                        <View style={styles.lateBadge}>
                          <Text style={styles.lateBadgeText}>{st.delayMinutes} min late</Text>
                        </View>
                      ) : isPassed ? (
                        <View style={styles.departedBadge}>
                          <Text style={styles.departedBadgeText}>Departed</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* 4. Right Departure Column */}
                    <View style={styles.timeColRight}>
                      {isUpcoming ? (
                        <>
                          <Text style={styles.expectedLabelText}>Expected</Text>
                          <Text style={[styles.expectedTimeText, { color: isDarkMode ? '#38BDF8' : '#0284C7' }]}>
                            {st.actualDep || schedDepText}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.schedTimeText, { color: colors.textSecondary }]}>{schedDepText}</Text>
                          <Text
                            style={[
                              styles.actualTimeText,
                              st.isDelayed ? styles.textDelayedRed : styles.textPassedGreen,
                            ]}
                          >
                            {st.actualDep || schedDepText}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* ================= 5. DESTINATION TERMINUS & STATION AMENITIES (Fills bottom void) ================= */}
              <View style={[styles.terminalSummaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Header */}
                <View style={styles.terminalHeaderRow}>
                  <View style={styles.terminalFlagCircle}>
                    <MaterialCommunityIcons name="flag-checkered" size={17} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.terminalStationTitle, { color: colors.textPrimary }]}>
                      Terminating at {routeDestStation.name || 'Agra Cantt'} ({routeDestCode})
                    </Text>
                    <Text style={[styles.terminalRunSub, { color: colors.textSecondary }]}>
                      Total Run: {liveData.totalDistanceKm || 195} km • {routeDuration} • {routeCommercialHalts} Halts
                    </Text>
                  </View>
                  <View style={[styles.terminalPlatformBadge, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
                    <Text style={[styles.terminalPlatformText, { color: Colors.primary }]}>PF {routeDestStation.platform ? routeDestStation.platform.replace(/[^0-9]/g, '') || '2' : '2'}</Text>
                  </View>
                </View>

                {/* Key Station Amenities Grid */}
                <View style={[styles.terminalDivider, { backgroundColor: colors.border }]} />
                <View style={styles.terminalAmenitiesHeader}>
                  <Ionicons name="business-outline" size={13} color={Colors.primary} style={{ marginRight: 5 }} />
                  <Text style={[styles.terminalSectionTitle, { color: colors.textSecondary }]}>
                    STATION AMENITIES & PASSENGER FACILITIES
                  </Text>
                </View>

                <View style={styles.terminalAmenitiesGrid}>
                  <View style={[styles.amenityCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="bag-checked" size={15} color="#0284C7" />
                    <View style={{ marginLeft: 7, flex: 1 }}>
                      <Text style={[styles.amenityTitle, { color: colors.textPrimary }]}>Cloak Room</Text>
                      <Text style={[styles.amenityDesc, { color: colors.textSecondary }]}>Platform 1 • 24 Hrs</Text>
                    </View>
                  </View>

                  <View style={[styles.amenityCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="taxi" size={15} color="#16A34A" />
                    <View style={{ marginLeft: 7, flex: 1 }}>
                      <Text style={[styles.amenityTitle, { color: colors.textPrimary }]}>Prepaid Cab & Auto</Text>
                      <Text style={[styles.amenityDesc, { color: colors.textSecondary }]}>Exit Gate 1 & 2</Text>
                    </View>
                  </View>

                  <View style={[styles.amenityCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="bed" size={15} color="#8B5CF6" />
                    <View style={{ marginLeft: 7, flex: 1 }}>
                      <Text style={[styles.amenityTitle, { color: colors.textPrimary }]}>IRCTC Retiring Room</Text>
                      <Text style={[styles.amenityDesc, { color: colors.textSecondary }]}>1st Floor • PF 1</Text>
                    </View>
                  </View>

                  <View style={[styles.amenityCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="food" size={15} color="#EA580C" />
                    <View style={{ marginLeft: 7, flex: 1 }}>
                      <Text style={[styles.amenityTitle, { color: colors.textPrimary }]}>Food Plaza</Text>
                      <Text style={[styles.amenityDesc, { color: colors.textSecondary }]}>Comesum & Jan Aahar</Text>
                    </View>
                  </View>

                  <View style={[styles.amenityCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="wheelchair-accessibility" size={15} color="#0284C7" />
                    <View style={{ marginLeft: 7, flex: 1 }}>
                      <Text style={[styles.amenityTitle, { color: colors.textPrimary }]}>Lifts & Escalators</Text>
                      <Text style={[styles.amenityDesc, { color: colors.textSecondary }]}>All Platforms</Text>
                    </View>
                  </View>

                  <View style={[styles.amenityCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="shield-check" size={15} color="#DC2626" />
                    <View style={{ marginLeft: 7, flex: 1 }}>
                      <Text style={[styles.amenityTitle, { color: colors.textPrimary }]}>RPF Post (139)</Text>
                      <Text style={[styles.amenityDesc, { color: colors.textSecondary }]}>Platform 1</Text>
                    </View>
                  </View>
                </View>

                {/* Train Technical Specs Strip */}
                <View style={[styles.terminalSpecsStrip, { backgroundColor: isDarkMode ? '#0F172A' : '#F0F9FF', borderColor: isDarkMode ? '#1E293B' : '#BAE6FD' }]}>
                  <View style={styles.terminalSpecCol}>
                    <Text style={styles.terminalSpecLabel}>Rake Type</Text>
                    <Text style={[styles.terminalSpecVal, { color: colors.textPrimary }]}>LHB Superfast</Text>
                  </View>
                  <View style={styles.terminalSpecDivider} />
                  <View style={styles.terminalSpecCol}>
                    <Text style={styles.terminalSpecLabel}>Locomotive</Text>
                    <Text style={[styles.terminalSpecVal, { color: colors.textPrimary }]}>WAP-7 (Electric)</Text>
                  </View>
                  <View style={styles.terminalSpecDivider} />
                  <View style={styles.terminalSpecCol}>
                    <Text style={styles.terminalSpecLabel}>Punctuality</Text>
                    <Text style={[styles.terminalSpecVal, { color: '#16A34A' }]}>94% On Time</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Animated Horn Toast */}
          {showHornBanner && (
            <View style={styles.hornSimulatedBanner}>
              <MaterialCommunityIcons name="bullhorn" size={16} color="#FBBF24" style={{ marginRight: 6 }} />
              <Text style={styles.hornSimulatedText}>Train horn sound triggered 📢 Level crossing alert</Text>
            </View>
          )}

          {/* Floating ETA & Speed Capsule (Reference Screenshots 1 & 8) */}
          <View style={[styles.floatingEtaCapsule, { backgroundColor: isDarkMode ? '#1E293B' : '#0F172A' }]}>
            <View style={styles.floatingEtaLeft}>
              <MaterialCommunityIcons name="speedometer" size={17} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={styles.floatingEtaText} numberOfLines={1}>
                {liveData.distanceToNextKm ?? 15} km to {liveData.nextStationName} • Speed {liveData.currentSpeed || 96} km/h
              </Text>
            </View>
            <View style={styles.floatingEtaRight}>
              <TouchableOpacity
                style={styles.floatingWhistleBtn}
                onPress={handlePlayHorn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.8}
              >
                <Animated.View style={{ transform: [{ scale: whistleBounce }] }}>
                  <MaterialCommunityIcons name="bullhorn-outline" size={16} color="#FBBF24" />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.floatingWhistleBtn, { marginLeft: 8 }]}
                onPress={handleShare}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ================= BOTTOM ACTION BAR (Exact from Screenshot 1) ================= */}
          <View style={[styles.journeyBottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.journeyMapBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setActiveTab('live_map')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="map-outline" size={18} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={styles.journeyMapBtnText}>View on Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.journeyRefreshBtn}
              onPress={handleManualRefresh}
              activeOpacity={0.8}
              disabled={isRefreshing}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              </Animated.View>
              <Text style={styles.journeyRefreshBtnText}>Refresh Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ================= TAB 2: LIVE MAP VIEW ================= */}
      {activeTab === 'live_map' && (() => {
        const isVandeBharat = activeTrain.number === '22436';
        const displayStops = liveData.stationDetails.filter((s) => !s.isPassing);
        const activeCurrentStop = displayStops[liveData.activeStopIndex] || displayStops[0];
        const currentStop = (selectedMapStationCode ? displayStops.find(s => s.code === selectedMapStationCode) : null) || activeCurrentStop || {
          code: 'MTJ',
          name: 'Mathura Jn',
          scheduledArr: '08:10 AM',
          actualArr: '08:12 AM',
          scheduledDep: '08:12 AM',
          actualDep: '08:14 AM',
          platform: 'Platform 4',
          distanceKm: 187,
          delayAtStopMinutes: 2,
        };

        const stopsOnMap = isVandeBharat
          ? [
              { code: 'NDLS', name: 'New Delhi (NDLS)', time: '06:00 AM', x: 16, y: 18, isOrigin: true },
              { code: 'MTJ', name: 'Mathura (MTJ)', time: '08:10 AM', x: 42, y: 36, isCurrent: true },
              { code: 'AGC', name: 'Agra Cantt (AGC)', time: '09:07 AM', x: 48, y: 56 },
              { code: 'ETW', name: 'Etawah (ETW)', time: '10:04 AM', x: 68, y: 68 },
              { code: 'CNB', name: 'Kanpur Central (CNB)', time: '10:20 AM', x: 86, y: 80, isDest: true },
            ]
          : displayStops.slice(0, 5).map((st, i, arr) => ({
              code: st.code,
              name: `${st.name} (${st.code})`,
              time: st.scheduledArr || st.scheduledDep || '--:--',
              x: 16 + Math.round((i / Math.max(1, arr.length - 1)) * 68),
              y: 18 + Math.round((i / Math.max(1, arr.length - 1)) * 62),
              isOrigin: i === 0,
              isDest: i === arr.length - 1,
              isCurrent: i === Math.min(liveData.activeStopIndex, arr.length - 1),
            }));

        const cardStnName = `${currentStop.name} (${currentStop.code})`;
        const cardArrSched = currentStop.scheduledArr || '--';
        const cardArrAct = currentStop.actualArr ? `(${currentStop.actualArr})` : '';
        const cardDepSched = currentStop.scheduledDep || '--';
        const cardDepAct = currentStop.actualDep ? `(${currentStop.actualDep})` : '';
        const cardDelayMins = currentStop.delayAtStopMinutes || 0;
        const cardPlatform = currentStop.platform?.replace(/\D/g, '') || '4';
        const originCode = activeTrain.originCode || 'Origin';
        const destCode = activeTrain.destCode || 'Dest';
        const distFromOrigin = currentStop.distanceKm || 0;
        const distToDest = Math.max(0, (liveData.totalDistanceKm || 500) - distFromOrigin);

        return (
          <View style={lmStyles.liveMapRoot}>
            {/* ===== 1. SQUEEZED MAP AREA (FLEX: 1, FITS EVERY SCREEN WITHOUT SCROLL) ===== */}
            <View style={lmStyles.mapAreaContainer}>
              {/* Subtle topographic contour lines background */}
              <View style={lmStyles.mapGridOverlay}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View key={`hline-${i}`} style={[lmStyles.mapGridLineH, { top: `${10 + i * 16}%` }]} />
                ))}
                {[0, 1, 2, 3, 4].map((i) => (
                  <View key={`vline-${i}`} style={[lmStyles.mapGridLineV, { left: `${14 + i * 19}%` }]} />
                ))}
              </View>

              {/* Floating GPS Target / Compass Button in top right */}
              <TouchableOpacity style={lmStyles.compassBtn} activeOpacity={0.8}>
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#007AFF" />
              </TouchableOpacity>

              {/* Railway Track Segments (Connecting NDLS -> MTJ -> AGC -> ETW -> CNB) */}
              <View style={[lmStyles.mapTrackSegment, { left: '15%', top: '16%', width: '28%', transform: [{ rotate: '38deg' }], backgroundColor: '#1E88E5' }]} />
              <View style={[lmStyles.mapTrackSegment, { left: '39%', top: '35%', width: '18%', transform: [{ rotate: '68deg' }], backgroundColor: '#0284C7' }]} />
              <View style={[lmStyles.mapTrackSegment, { left: '48%', top: '56%', width: '25%', transform: [{ rotate: '32deg' }], backgroundColor: '#0284C7' }]} />
              <View style={[lmStyles.mapTrackSegment, { left: '68%', top: '70%', width: '20%', transform: [{ rotate: '34deg' }], backgroundColor: '#0284C7' }]} />

              {/* Train Icon moving between stations */}
              <View style={lmStyles.trainOnTrackBadge}>
                <MaterialCommunityIcons name="train" size={15} color="#FFFFFF" />
              </View>

              {/* Stations on Map */}
              {stopsOnMap.map((st) => {
                const isStationSelected = (currentStop.code === st.code);
                return (
                  <TouchableOpacity
                    key={st.code}
                    style={[
                      lmStyles.mapStationWrapper,
                      { left: `${st.x}%`, top: `${st.y}%` },
                    ]}
                    onPress={() => setSelectedMapStationCode(st.code)}
                    activeOpacity={0.8}
                  >
                    {st.isOrigin && <View style={lmStyles.mapStartGreenDot} />}
                    {st.isDest && <View style={lmStyles.mapDestRedDot} />}
                    {!st.isOrigin && !st.isDest && (
                      <View style={[lmStyles.mapInterDot, isStationSelected && lmStyles.mapInterDotActive]} />
                    )}

                    {/* Station Name & Time Callout Bubble */}
                    <View
                      style={[
                        lmStyles.mapStationBubble,
                        isStationSelected && lmStyles.mapStationBubbleActive,
                        st.isDest && { transform: [{ translateX: -50 }] },
                        st.code === 'AGC' && { transform: [{ translateX: -35 }] },
                      ]}
                    >
                      <Text style={[lmStyles.mapBubbleName, isStationSelected && lmStyles.mapBubbleNameActive]}>{st.name}</Text>
                      <Text style={lmStyles.mapBubbleTime}>{st.time}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ===== 2. BOTTOM DOCKED SECTION (STATION CARD + FULL JOURNEY BUTTON) ===== */}
            <View style={[lmStyles.bottomDockedSection, { backgroundColor: isDarkMode ? '#0B1120' : '#E2F0D9' }]}>
              {/* Station Detail Card */}
              <View style={[lmStyles.stationDetailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Drag Handle Bar */}
                <View style={[lmStyles.bottomCardHandle, { backgroundColor: isDarkMode ? '#475569' : '#CBD5E1' }]} />

                {/* Station Title Row */}
                <View style={lmStyles.bottomStationTitleRow}>
                  <View style={[lmStyles.stationIconCircle, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
                    <MaterialCommunityIcons name="train" size={18} color="#007AFF" />
                  </View>
                  <Text style={[lmStyles.bottomStationTitle, { color: colors.textPrimary }]}>{cardStnName}</Text>
                  <TouchableOpacity
                    style={lmStyles.bottomCloseBtn}
                    onPress={() => setSelectedMapStationCode(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Arrival / Delay / Departure Row */}
                <View style={[lmStyles.timingsRow, { borderBottomColor: colors.border }]}>
                  <View style={lmStyles.timingCol}>
                    <Text style={[lmStyles.timingLabel, { color: colors.textSecondary }]}>Arrived</Text>
                    <Text style={[lmStyles.timingSched, { color: colors.textPrimary }]}>{cardArrSched}</Text>
                    {cardArrAct ? <Text style={lmStyles.timingActualDelayed}>{cardArrAct}</Text> : null}
                  </View>

                  <View style={[lmStyles.delayBadge, cardDelayMins === 0 && { backgroundColor: isDarkMode ? '#064E3B' : '#DCFCE7' }]}>
                    <Text style={[lmStyles.delayBadgeText, cardDelayMins === 0 && { color: isDarkMode ? '#34D399' : '#16A34A' }]}>
                      {cardDelayMins > 0 ? `${cardDelayMins} min late` : 'On Time'}
                    </Text>
                  </View>

                  <View style={[lmStyles.timingCol, { alignItems: 'flex-end' }]}>
                    <Text style={[lmStyles.timingLabel, { color: colors.textSecondary }]}>Departed</Text>
                    <Text style={[lmStyles.timingSched, { color: colors.textPrimary }]}>{cardDepSched}</Text>
                    {cardDepAct ? <Text style={lmStyles.timingActualDelayed}>{cardDepAct}</Text> : null}
                  </View>
                </View>

                {/* Distance Information Row */}
                <View style={[lmStyles.distanceMetricsRow, { borderBottomColor: colors.border }]}>
                  <View style={lmStyles.distanceItemRow}>
                    <Ionicons name="location" size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
                    <Text style={[lmStyles.distanceMetricsText, { color: colors.textSecondary }]}>{distFromOrigin} km from {originCode}</Text>
                  </View>
                  <View style={lmStyles.distanceItemRow}>
                    <MaterialCommunityIcons name="flag-checkered" size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
                    <Text style={[lmStyles.distanceMetricsText, { color: colors.textSecondary }]}>{distToDest} km to {destCode}</Text>
                  </View>
                </View>

                {/* Platform Box, Station Thumbnail & View Station Button */}
                <View style={lmStyles.platformAndPhotoRow}>
                  <View style={[lmStyles.platformNumberCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                    <Text style={[lmStyles.platformNumberLabel, { color: colors.textSecondary }]}>Platform</Text>
                    <Text style={[lmStyles.platformNumberBig, { color: colors.textPrimary }]}>{cardPlatform}</Text>
                  </View>

                  {/* Dynamic Station Image / Badge */}
                  {(currentStop.code === 'MTJ' || isVandeBharat) ? (
                    <Image
                      source={require('../../assets/mathura_station.jpg')}
                      style={lmStyles.stationThumbImage}
                    />
                  ) : (
                    <View style={[lmStyles.dynamicStationBadgeContainer, { backgroundColor: isDarkMode ? '#1E293B' : '#F0F9FF', borderColor: colors.border }]}>
                      <MaterialCommunityIcons name="office-building-marker" size={19} color="#007AFF" />
                      <Text style={lmStyles.dynamicStationBadgeCode}>{currentStop.code}</Text>
                      <Text style={[lmStyles.dynamicStationBadgeType, { color: colors.textSecondary }]} numberOfLines={1}>
                        {currentStop.name.includes('Jn') ? 'Junction' : 'Station'}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity style={lmStyles.viewStationActionBtn} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="map-marker-radius" size={14} color="#FFFFFF" style={{ marginRight: 3 }} />
                    <Text style={lmStyles.viewStationActionBtnText}>View Station</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Show Full Journey Button */}
              <TouchableOpacity
                style={[lmStyles.showFullJourneyFullBtn, { backgroundColor: colors.surface, borderColor: isDarkMode ? colors.border : '#BAE6FD' }]}
                onPress={() => setActiveTab('journey')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="format-list-bulleted" size={17} color="#007AFF" style={{ marginRight: 6 }} />
                <Text style={lmStyles.showFullJourneyFullBtnText}>Show Full Journey</Text>
                <Ionicons name="chevron-up" size={15} color="#007AFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {/* ================= TAB 3: COACH POSITION VIEW ================= */}
      {activeTab === 'coach_position' && (
        <ScrollView style={[styles.coachTabContainer, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
          {/* Card 1: Coach Position */}
          <View style={[styles.coachMainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.coachMainCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="train" size={20} color="#007AFF" style={{ marginRight: 6 }} />
                <Text style={[styles.coachMainCardTitle, { color: colors.textPrimary }]}>Coach Position</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Direction Subheader */}
            <View style={styles.coachDirectionRow}>
              <Text style={[styles.coachDirectionSide, { color: colors.textSecondary }]}>← Engine Side</Text>
              <Text style={[styles.coachDirectionSide, { color: colors.textSecondary }]}>Last Coach →</Text>
            </View>

            {/* Train Side Profile Graphic */}
            <Image
              source={require('../../assets/vande_bharat_rake.jpg')}
              style={styles.coachTrainRakeGraphic}
              resizeMode="contain"
            />

            {/* Interactive Coach Chips Horizontal Bar */}
            <View style={styles.coachSelectorBarWrapper}>
              <TouchableOpacity style={styles.coachNavChevron} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.coachSelectorChipsScroll}
              >
                {[
                  { code: 'ENG', label: 'Engine' },
                  { code: 'GEN', label: 'General' },
                  { code: 'C1', label: 'CC' },
                  { code: 'C2', label: 'CC' },
                  { code: 'C3', label: 'CC' },
                  { code: 'C4', label: 'CC' },
                  { code: 'C5', label: 'CC' },
                  { code: 'C6', label: 'CC' },
                  { code: 'C7', label: 'CC' },
                ].map((c) => {
                  const isSelected = selectedCoach === c.code;
                  return (
                    <View key={c.code} style={styles.coachChipWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.coachSelectorChip,
                          { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: colors.border },
                          isSelected && styles.coachSelectorChipActive,
                        ]}
                        onPress={() => setSelectedCoach(c.code)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.coachSelectorCodeText,
                            { color: colors.textPrimary },
                            isSelected && styles.coachSelectorCodeTextActive,
                          ]}
                        >
                          {c.code}
                        </Text>
                      </TouchableOpacity>
                      <Text style={[styles.coachSelectorSublabel, { color: colors.textSecondary }]}>{c.label}</Text>

                      {isSelected && (
                        <View style={styles.yourCoachPointerWrapper}>
                          <View style={styles.pointerTriangle} />
                          <Text style={styles.yourCoachPointerText}>Your Coach</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.coachNavChevron} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Coach Composition (22436) */}
            <View style={styles.compositionSection}>
              <View style={styles.compositionHeaderRow}>
                <MaterialCommunityIcons name="train-car" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={[styles.compositionTitle, { color: colors.textPrimary }]}>Coach Composition (22436)</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                <View style={styles.compositionRakeBar}>
                  <View style={[styles.miniRakeBlock, { backgroundColor: '#94A3B8' }]}>
                    <Text style={styles.miniRakeText}>ENG</Text>
                  </View>
                  <View style={[styles.miniRakeBlock, { backgroundColor: '#A855F7' }]}>
                    <Text style={styles.miniRakeText}>GEN</Text>
                  </View>
                  <View style={[styles.miniRakeBlock, { backgroundColor: '#93C5FD' }]}>
                    <Text style={styles.miniRakeText}>C1</Text>
                  </View>
                  <View style={[styles.miniRakeBlock, { backgroundColor: '#93C5FD' }]}>
                    <Text style={styles.miniRakeText}>C2</Text>
                  </View>
                  <View style={[styles.miniRakeBlock, { backgroundColor: '#007AFF', borderWidth: 1.5, borderColor: '#0284C7' }]}>
                    <Text style={[styles.miniRakeText, { fontWeight: '900', color: '#FFFFFF' }]}>C3</Text>
                  </View>
                  <View style={[styles.miniRakeBlock, { backgroundColor: '#93C5FD' }]}>
                    <Text style={styles.miniRakeText}>C4</Text>
                  </View>
                  <View style={[styles.miniRakeBlock, { backgroundColor: '#93C5FD' }]}>
                    <Text style={styles.miniRakeText}>C5</Text>
                  </View>
                  <View style={[styles.miniRakeBlock, { backgroundColor: '#93C5FD' }]}>
                    <Text style={styles.miniRakeText}>C6</Text>
                  </View>
                  <View style={[styles.miniRakeBlock, { backgroundColor: '#93C5FD' }]}>
                    <Text style={styles.miniRakeText}>C7</Text>
                  </View>
                  <View style={[styles.miniRakeBlock, { backgroundColor: '#93C5FD' }]}>
                    <Text style={styles.miniRakeText}>C8</Text>
                  </View>
                </View>
              </ScrollView>

              {/* Composition Legend Badges */}
              <View style={styles.compositionLegendRow}>
                <View style={styles.legendBadge}>
                  <View style={[styles.legendColorBox, { backgroundColor: '#0284C7' }]} />
                  <Text style={[styles.legendBadgeText, { color: colors.textSecondary }]}>Chair Car (C1-C8)</Text>
                </View>
                <View style={styles.legendBadge}>
                  <View style={[styles.legendColorBox, { backgroundColor: '#16A34A' }]} />
                  <Text style={[styles.legendBadgeText, { color: colors.textSecondary }]}>End on Generator</Text>
                </View>
                <View style={styles.legendBadge}>
                  <View style={[styles.legendColorBox, { backgroundColor: '#A855F7' }]} />
                  <Text style={[styles.legendBadgeText, { color: colors.textSecondary }]}>General</Text>
                </View>
                <View style={styles.legendBadge}>
                  <View style={[styles.legendColorBox, { backgroundColor: '#EAB308' }]} />
                  <Text style={[styles.legendBadgeText, { color: colors.textSecondary }]}>Engine</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Card 2: Platform Position (at Mathura Jn) */}
          <View style={[styles.platformPositionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.platformPositionHeader}>
              <MaterialCommunityIcons name="train-car" size={18} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={[styles.platformPositionTitle, { color: colors.textPrimary }]}>Platform Position (at Mathura Jn)</Text>
            </View>

            <View style={styles.platformPositionContentRow}>
              <View style={styles.platformPositionLeftCol}>
                <View style={styles.platformIndicatorRow}>
                  <View style={[styles.platformPinCircle, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="location" size={16} color="#007AFF" />
                  </View>
                  <Text style={[styles.platformNumberTitle, { color: colors.textPrimary }]}>{liveData.currentPlatform || 'Platform 4'}</Text>
                </View>
                <Text style={[styles.platformDescText, { color: colors.textSecondary }]}>
                  Engine will arrive near {liveData.currentPlatform || 'Platform 4'} side.{'\n'}Your coach ({selectedCoach}) will be accessible from the main platform concourse.
                </Text>
              </View>

              {(liveData.currentStationCode === 'MTJ' || activeTrain.number === '22436') ? (
                <Image
                  source={require('../../assets/mathura_station.jpg')}
                  style={styles.platformPositionThumb}
                />
              ) : (
                <View style={[styles.dynamicStationThumbBadge, { backgroundColor: isDarkMode ? '#1E293B' : '#F0F9FF', borderColor: colors.border }]}>
                  <MaterialCommunityIcons name="train" size={24} color="#007AFF" />
                  <Text style={[styles.dynamicStationThumbText, { color: colors.textPrimary }]}>{liveData.currentStationCode || 'PF'}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Card 3: Tips */}
          <View style={[styles.tipsContainerCard, { backgroundColor: isDarkMode ? '#1E293B' : '#FFFBEB', borderColor: isDarkMode ? colors.border : '#FDE68A' }]}>
            <View style={styles.tipsHeaderRow}>
              <Ionicons name="bulb-outline" size={18} color="#EAB308" style={{ marginRight: 6 }} />
              <Text style={[styles.tipsCardHeading, { color: isDarkMode ? '#F8FAFC' : '#92400E' }]}>Tips</Text>
            </View>
            <Text style={[styles.tipsItemBullet, { color: isDarkMode ? '#CBD5E1' : '#78350F' }]}>• Coach position may change at some stations.</Text>
            <Text style={[styles.tipsItemBullet, { color: isDarkMode ? '#CBD5E1' : '#78350F' }]}>• Arrive 10-15 minutes before scheduled time.</Text>
            <Text style={[styles.tipsItemBullet, { color: isDarkMode ? '#CBD5E1' : '#78350F' }]}>• Check platform display board for latest information.</Text>
          </View>

          {/* Bottom Floating Map Button */}
          <TouchableOpacity
            style={[styles.coachBottomMapBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setActiveTab('live_map')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="map-outline" size={18} color="#007AFF" style={{ marginRight: 6 }} />
            <Text style={[styles.coachBottomMapBtnText, { color: '#007AFF' }]}>View on Map</Text>
          </TouchableOpacity>

          <View style={{ height: 35 }} />
        </ScrollView>
      )}

      {/* ================= TAB 4: INFO VIEW ================= */}
      {activeTab === 'info' && (
        <ScrollView style={[styles.infoTabContainer, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
          {/* Train Information Block */}
          <View style={[styles.infoSectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoSectionHeader}>
              <MaterialCommunityIcons name="train" size={18} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={[styles.infoSectionTitle, { color: colors.textPrimary }]}>Train Information</Text>
            </View>

            {[
              { label: 'Train Number', val: activeTrain.number },
              { label: 'Train Name', val: activeTrain.name },
              { label: 'Running Days', val: 'Sun, Mon, Tue, Thu, Fri, Sat' },
              { label: 'Type', val: 'Vande Bharat Superfast' },
              { label: 'Rake Zone', val: 'NR (Northern Railway)' },
              { label: 'Total Distance', val: `${liveData.totalDistanceKm || 440} km` },
              { label: 'Top Operating Speed', val: '130 km/h' },
            ].map((row, rIdx) => (
              <View key={rIdx} style={[styles.infoDataRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoDataLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.infoDataValue, { color: colors.textPrimary }]}>{row.val}</Text>
              </View>
            ))}
          </View>

          {/* Route Information Block */}
          <View style={[styles.infoSectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoSectionHeader}>
              <Ionicons name="map-outline" size={18} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={[styles.infoSectionTitle, { color: colors.textPrimary }]}>Route Information</Text>
            </View>

            {[
              { label: 'Source Station', val: `${activeTrain.originName} (${routeOriginCode})` },
              { label: 'Destination Station', val: `${activeTrain.destName} (${routeDestCode})` },
              { label: 'Total Halts', val: `${liveData.stationDetails.filter(s => !s.isPassing).length} Major Stops (${liveData.stationDetails.length} total stations)` },
              { label: 'Total Duration', val: routeDuration },
              { label: 'Scheduled Departure', val: routeOriginDepTime },
              { label: 'Scheduled Arrival', val: routeDestArrTime },
            ].map((row, rIdx) => (
              <View key={rIdx} style={[styles.infoDataRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoDataLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.infoDataValue, { color: colors.textPrimary }]}>{row.val}</Text>
              </View>
            ))}
          </View>

          {/* Facilities Block */}
          <View style={[styles.infoSectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoSectionHeader}>
              <Ionicons name="apps-outline" size={18} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={[styles.infoSectionTitle, { color: colors.textPrimary }]}>Train Facilities</Text>
            </View>

            <View style={styles.facilitiesGrid}>
              {['AC Chair Car', 'Executive Class', 'Onboard Catering', 'Wi-Fi Infotainment', 'Mobile Charging', 'Bio Vacuum Toilets'].map((fac) => (
                <View key={fac} style={[styles.facilityChip, { backgroundColor: isDarkMode ? '#1E293B' : '#F0FDF4', borderColor: isDarkMode ? colors.border : '#BBF7D0' }]}>
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" style={{ marginRight: 4 }} />
                  <Text style={[styles.facilityChipText, { color: isDarkMode ? '#F8FAFC' : '#166534' }]}>{fac}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Emergency Helplines Section (find.mytrain.where signature feature) */}
          <View style={[styles.infoSectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoSectionHeader}>
              <MaterialCommunityIcons name="shield-alert-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={[styles.infoSectionTitle, { color: colors.textPrimary }]}>Indian Railways Helplines</Text>
            </View>

            {[
              { num: '139', name: 'All-in-One Railway Helpline', desc: 'PNR, train enquiry, security, catering & cleanliness', color: '#0284C7', icon: 'phone-in-talk' },
              { num: '182 / 112', name: 'RPF & Women Safety Helpline', desc: 'On-board security and immediate protection assistance', color: '#DC2626', icon: 'shield-check' },
              { num: '138', name: 'Medical Emergency Helpline', desc: 'Doctors & paramedical support at next upcoming junction', color: '#16A34A', icon: 'hospital-box' },
              { num: '1072', name: 'Rail Accident Emergency', desc: 'Disaster management & emergency accident relief control', color: '#EAB308', icon: 'alert-octagon' },
              { num: 'RailMadad', name: 'IRCTC Grievance Portal', desc: 'Instant complaint registration with live tracking ID', color: '#8B5CF6', icon: 'card-text-outline' },
            ].map((hp, hIdx) => (
              <TouchableOpacity
                key={hIdx}
                style={[styles.helplineItemRow, { borderBottomColor: colors.border }]}
                onPress={() => alert(`Calling ${hp.num} - ${hp.name}`)}
                activeOpacity={0.75}
              >
                <View style={[styles.helplineIconCircle, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
                  <MaterialCommunityIcons name={hp.icon as any} size={18} color={hp.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.helplineNameText, { color: colors.textPrimary }]}>{hp.name}</Text>
                    <View style={[styles.helplineNumPill, { backgroundColor: hp.color }]}>
                      <Text style={styles.helplineNumText}>{hp.num}</Text>
                    </View>
                  </View>
                  <Text style={[styles.helplineDescText, { color: colors.textSecondary }]}>{hp.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ================= MODAL: DATE SELECTOR ================= */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDateModal(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Journey Date</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {[
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'today', label: 'Today (20 Sep)' },
              { id: 'tomorrow', label: 'Tomorrow' },
            ].map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[
                  styles.menuOptionRow,
                  { borderBottomColor: colors.border },
                  selectedDateMode === d.id && { backgroundColor: isDarkMode ? '#1E3A5F' : '#F0F9FF' },
                ]}
                onPress={() => {
                  setSelectedDateMode(d.id as any);
                  setShowDateModal(false);
                }}
              >
                <Ionicons
                  name={selectedDateMode === d.id ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color="#007AFF"
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    styles.menuOptionText,
                    { color: colors.textPrimary },
                    selectedDateMode === d.id && { fontWeight: '800', color: '#007AFF' },
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= MODAL: DESTINATION SELECTOR ================= */}
      <Modal visible={showDestModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDestModal(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Destination Station</Text>
              <TouchableOpacity onPress={() => setShowDestModal(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {liveData.stationDetails
                .filter((st) => !st.isPassing)
                .map((st, idx) => {
                  if (idx === 0) return null;
                  const isSelected = (customDestCode || activeTrain.destCode) === st.code;
                  return (
                    <TouchableOpacity
                      key={st.code}
                      style={[
                        styles.menuOptionRow,
                        { borderBottomColor: colors.border },
                        isSelected && { backgroundColor: isDarkMode ? '#1E3A5F' : '#F0F9FF' },
                      ]}
                      onPress={() => {
                        setCustomDestCode(st.code);
                        setShowDestModal(false);
                      }}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color="#007AFF"
                        style={{ marginRight: 10 }}
                      />
                      <Text
                        style={[
                          styles.menuOptionText,
                          { color: colors.textPrimary },
                          isSelected && { fontWeight: '800', color: '#007AFF' },
                        ]}
                      >
                        {st.name} ({st.code})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= MODAL: ALARM ================= */}
      <Modal visible={showAlarmModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAlarmModal(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="alarm" size={20} color="#007AFF" style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Set Station Wake-up Alarm</Text>
              <TouchableOpacity onPress={() => setShowAlarmModal(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Select when you want to be alerted before reaching the station:
            </Text>

            {/* Alarm Interval Selector Chips */}
            <View style={styles.alarmIntervalRow}>
              {[
                { id: '10m', label: '10 mins' },
                { id: '15m', label: '15 mins (Default)' },
                { id: '30m', label: '30 mins' },
                { id: '5km', label: '5 km' },
                { id: '10km', label: '10 km' },
              ].map((inv) => (
                <TouchableOpacity
                  key={inv.id}
                  style={[
                    styles.alarmIntervalChip,
                    { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: colors.border },
                    alarmInterval === inv.id && styles.alarmIntervalChipActive,
                  ]}
                  onPress={() => setAlarmInterval(inv.id as any)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.alarmIntervalText,
                      { color: colors.textPrimary },
                      alarmInterval === inv.id && styles.alarmIntervalTextActive,
                    ]}
                  >
                    {inv.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary, marginTop: 8 }]}>
              Select Target Station:
            </Text>

            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              {activeTrain.stops
                .filter((stop) => !stop.isPassing)
                .map((stop) => (
                  <TouchableOpacity
                    key={stop.code}
                    style={[
                      styles.alarmStationRow,
                      { borderBottomColor: colors.border },
                      (alarmStation === stop.name || (!alarmStation && stop.name === liveData.nextStationName)) && {
                        backgroundColor: isDarkMode ? '#1E3A5F' : '#F0F9FF',
                      },
                    ]}
                    onPress={() => setAlarmStation(stop.name)}
                  >
                    <Text
                      style={[
                        styles.alarmStationText,
                        { color: colors.textPrimary },
                        (alarmStation === stop.name || (!alarmStation && stop.name === liveData.nextStationName)) && {
                          color: '#007AFF',
                          fontWeight: '800',
                        },
                      ]}
                    >
                      {stop.name} ({stop.code})
                    </Text>
                    {(alarmStation === stop.name || (!alarmStation && stop.name === liveData.nextStationName)) && (
                      <Ionicons name="checkmark-circle" size={18} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Test Alarm Sound Trigger */}
            <TouchableOpacity
              style={[styles.alarmTestSoundBtn, { backgroundColor: isDarkMode ? '#1E293B' : '#FEF3C7', borderColor: isDarkMode ? colors.border : '#FDE68A' }]}
              onPress={() => alert('🔔 Loud Wake-Up Tone Playing: [Beep-Beep-Beep! Station approaching!]')}
              activeOpacity={0.8}
            >
              <Ionicons name="volume-high-outline" size={16} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={[styles.alarmTestSoundText, { color: isDarkMode ? '#FBBF24' : '#92400E' }]}>Test Wake-Up Sound & Vibration</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {isAlarmActive && (
                <TouchableOpacity
                  style={[styles.saveAlarmBtn, { flex: 1, backgroundColor: '#EF4444' }]}
                  onPress={() => {
                    setIsAlarmActive(false);
                    alert('Alarm cancelled successfully.');
                    setShowAlarmModal(false);
                  }}
                >
                  <Text style={styles.saveAlarmBtnText}>CANCEL ALARM</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveAlarmBtn, { flex: isAlarmActive ? 1 : 2 }]}
                onPress={() => {
                  const target = alarmStation || liveData.nextStationName;
                  setIsAlarmActive(true);
                  alert(`✅ Alarm Set! You will be alerted ${alarmInterval} before arriving at ${target}.`);
                  setShowAlarmModal(false);
                }}
              >
                <Text style={styles.saveAlarmBtnText}>{isAlarmActive ? 'UPDATE ALARM' : 'SET ALARM'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= MODAL: MENU OPTIONS ================= */}
      <Modal visible={showMenuModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Train Options</Text>
              <TouchableOpacity onPress={() => setShowMenuModal(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.menuOptionRow, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowMenuModal(false);
                handleShare();
              }}
            >
              <Ionicons name="share-social-outline" size={18} color="#007AFF" style={{ marginRight: 10 }} />
              <Text style={[styles.menuOptionText, { color: colors.textPrimary }]}>Share Train Running Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOptionRow, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowMenuModal(false);
                setShowAlarmModal(true);
              }}
            >
              <Ionicons name="alarm-outline" size={18} color="#007AFF" style={{ marginRight: 10 }} />
              <Text style={[styles.menuOptionText, { color: colors.textPrimary }]}>Set Station Alarm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOptionRow, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowMenuModal(false);
                setActiveTab('coach_position');
              }}
            >
              <MaterialCommunityIcons name="train" size={18} color="#007AFF" style={{ marginRight: 10 }} />
              <Text style={[styles.menuOptionText, { color: colors.textPrimary }]}>View Coach Position</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOptionRow, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowMenuModal(false);
                handleManualRefresh();
              }}
            >
              <Ionicons name="refresh-outline" size={18} color="#007AFF" style={{ marginRight: 10 }} />
              <Text style={[styles.menuOptionText, { color: colors.textPrimary }]}>Refresh Live GPS Location</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // 1. Top Header
  headerWrapper: {
    backgroundColor: Colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerBackBtn: {
    padding: 4,
    marginRight: 6,
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 2,
    marginRight: 6,
  },
  headerTitleText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubText: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 5,
  },
  actionPillsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 9,
  },
  todayActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 14,
    marginRight: 6,
  },
  todayActionPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primary,
  },
  outlinedActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 14,
    marginRight: 6,
  },
  outlinedActionPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dynamicStationThumbBadge: {
    width: 60,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dynamicStationThumbText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
  },

  // 2. Squeezed Route & Tracking High-Density Strip
  squeezedRouteCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 4,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  squeezedRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  squeezedStationCol: {
    minWidth: 55,
  },
  squeezedCodeBig: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  squeezedTimeSub: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },
  squeezedCenterTrackCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  squeezedDurationPill: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 1.5,
    borderRadius: 10,
    marginBottom: 2,
  },
  squeezedDurationText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  squeezedTrackLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  squeezedDotBlue: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
  },
  squeezedTrackLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#BAE6FD',
    marginHorizontal: 3,
  },
  squeezedTrackingMicroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.8,
    borderTopColor: '#F1F5F9',
    marginTop: 6,
    paddingTop: 4,
  },
  squeezedTrackingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  squeezedTrackingLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginRight: 5,
  },
  squeezedSourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 5,
  },
  squeezedSourcePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  squeezedSourcePillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  squeezedSourcePillTextActive: {
    color: '#FFFFFF',
  },
  squeezedOfflineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  squeezedGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  squeezedOfflineText: {
    fontSize: 9.5,
    fontWeight: '700',
  },

  // Terminal Summary & Station Amenities (Bottom void filler)
  terminalSummaryCard: {
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  terminalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  terminalFlagCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalStationTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  terminalRunSub: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  terminalPlatformBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  terminalPlatformText: {
    fontSize: 11,
    fontWeight: '800',
  },
  terminalDivider: {
    height: 1,
    marginVertical: 10,
  },
  terminalAmenitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  terminalSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  terminalAmenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  amenityCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  amenityTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  amenityDesc: {
    fontSize: 9.5,
    marginTop: 1,
  },
  terminalSpecsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  terminalSpecCol: {
    alignItems: 'center',
    flex: 1,
  },
  terminalSpecLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 1,
  },
  terminalSpecVal: {
    fontSize: 11,
    fontWeight: '800',
  },
  terminalSpecDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
  },
  routeQuickTools: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  routeToolBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  // 3. Sub Tabs Bar
  subTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  subTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  subTabActiveLine: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2.5,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  // 4. Journey Timeline Tab Strip
  timelineHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stripColText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stripCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  stripTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  stripRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stripSyncBtn: {
    padding: 3,
    marginLeft: 4,
  },
  timelineScroll: {
    flex: 1,
  },
  timelineContentWrapper: {
    paddingHorizontal: 12,
    paddingTop: 2,
  },
  stationTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
  },
  currentStationRowHighlight: {
    backgroundColor: '#EDF6FF',
    borderRadius: 8,
    paddingVertical: 5,
  },

  timeColLeft: {
    width: 68,
    alignItems: 'flex-start',
  },
  timeColRight: {
    width: 68,
    alignItems: 'flex-end',
  },
  schedTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  actualTimeText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  textPassedGreen: {
    color: '#16A34A',
  },
  textDelayedRed: {
    color: '#DC2626',
  },
  expectedLabelText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  expectedTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },

  trackTrackWrapper: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    position: 'relative',
  },
  verticalTrackLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    zIndex: 1,
  },
  trackLineHalfTop: {
    position: 'absolute',
    top: 0,
    bottom: '50%',
    width: 3,
  },
  trackLineHalfBottom: {
    position: 'absolute',
    top: '50%',
    bottom: 0,
    width: 3,
  },
  lineGreen: {
    backgroundColor: '#16A34A',
  },
  lineGrey: {
    backgroundColor: '#CBD5E1',
  },
  lineBluePassing: {
    backgroundColor: '#90CAF9',
  },

  originTrainBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  passedCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  currentStationBadgeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  currentPulseRing: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#BAE6FD',
  },
  currentTrainBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
    elevation: 3,
  },
  upcomingGreyDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#94A3B8',
    zIndex: 3,
  },
  destRedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DC2626',
    zIndex: 3,
  },

  stationInfoCol: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 6,
  },
  stationNameText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  stationSubText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },

  // Status Badges
  departedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  departedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  lateBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  lateBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  currentStatusBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  currentStatusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },

  // ================= IN-BETWEEN PASSING STATIONS ACCORDION & SLATE GREY STYLES =================
  passingGroupContainer: {
    marginVertical: 1,
  },
  passingAccordionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 68,
    backgroundColor: '#FFFFFF',
  },
  passingAccordionBarExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 68,
    backgroundColor: '#455A64', // Darker header above slate grey section
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  passingAccordionTrackCol: {
    width: 32,
    alignItems: 'center',
  },
  passingAccordionTrackLine: {
    width: 3,
    height: 24,
    backgroundColor: '#93C5FD',
  },
  passingAccordionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    marginLeft: 6,
  },
  passingAccordionPillExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    marginLeft: 6,
  },
  passingAccordionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#007AFF',
  },
  passingAccordionTextExpanded: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  expandedSlateGreyContainer: {
    backgroundColor: '#546E7A', // Where is My Train signature slate-grey
    paddingVertical: 4,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    marginVertical: 1,
  },
  passingStationRowSlate: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: '#546E7A',
  },
  passingTimeTextWhite: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#ECEFF1',
  },
  passingActualTimeMuted: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#B0BEC5',
    marginTop: 1,
  },
  passingStationNameWhite: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  passingDistanceMuted: {
    fontSize: 10.5,
    color: '#B0BEC5',
    marginTop: 1,
  },
  passingDotNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0F2FE',
    borderWidth: 1.5,
    borderColor: '#546E7A',
    zIndex: 4,
  },

  // Authentic Green Callout Bubble ("3 kms to Krishnarajapuram")
  greenCalloutBubble: {
    backgroundColor: '#1B8A2F',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  greenCalloutTriangle: {
    position: 'absolute',
    left: -5,
    top: 8,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderTopColor: 'transparent',
    borderBottomWidth: 5,
    borderBottomColor: 'transparent',
    borderRightWidth: 5,
    borderRightColor: '#1B8A2F',
  },
  greenCalloutText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.1,
  },

  // 6. Bottom Sticky Container & Telemetry Card
  bottomStickyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  bottomChevronHandle: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  telemetryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  telemetryCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  telemetryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  telemetryTextCol: {
    flex: 1,
  },
  telemetryLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  telemetrySpeedValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 1,
  },
  telemetryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },

  expandedInfoCard: {
    backgroundColor: '#F0F9FF',
    marginHorizontal: 12,
    marginTop: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  expandedInfoText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
    marginVertical: 1,
  },

  // 6. Journey Bottom Action Bar (Screen 1)
  journeyBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  journeyMapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  journeyMapBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#007AFF',
  },
  journeyRefreshBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },
  journeyRefreshBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Coach Tab Styles (Screen 3)
  coachTabContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  coachMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  coachMainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  coachMainCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  coachDirectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  coachDirectionSide: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  coachTrainRakeGraphic: {
    width: '100%',
    height: 72,
    marginVertical: 4,
  },
  coachSelectorBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  coachNavChevron: {
    padding: 6,
  },
  coachSelectorChipsScroll: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  coachChipWrapper: {
    alignItems: 'center',
    marginHorizontal: 5,
    minWidth: 40,
  },
  coachSelectorChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachSelectorChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  coachSelectorCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  coachSelectorCodeTextActive: {
    color: '#FFFFFF',
  },
  coachSelectorSublabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  yourCoachPointerWrapper: {
    alignItems: 'center',
    marginTop: 3,
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    borderRightWidth: 4,
    borderRightColor: 'transparent',
    borderTopWidth: 5,
    borderTopColor: '#007AFF',
  },
  yourCoachPointerText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#007AFF',
    marginTop: 2,
    width: 65,
    textAlign: 'center',
  },

  compositionSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  compositionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  compositionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  compositionRakeBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniRakeBlock: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 4,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRakeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  compositionLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  legendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  legendColorBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 5,
  },
  legendBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },

  platformPositionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  platformPositionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  platformPositionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  platformPositionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  platformPositionLeftCol: {
    flex: 1,
    paddingRight: 10,
  },
  platformIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  platformPinCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  platformNumberTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  platformDescText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 3,
  },
  platformPositionThumb: {
    width: 105,
    height: 60,
    borderRadius: 8,
  },

  tipsContainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  tipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipsCardHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  tipsItemBullet: {
    fontSize: 11.5,
    color: '#475569',
    marginVertical: 2,
    lineHeight: 16,
  },

  coachBottomMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    marginTop: 4,
  },
  coachBottomMapBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#007AFF',
  },

  // Info Tab Styles
  infoTabContainer: {
    flex: 1,
    padding: 14,
  },
  infoSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  infoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  infoDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  infoDataLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  infoDataValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  facilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  facilityChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 380,
    borderRadius: 14,
    padding: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  alarmStationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: '#F8FAFC',
  },
  alarmStationSelected: {
    backgroundColor: '#E0F2FE',
  },
  alarmStationText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  saveAlarmBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  saveAlarmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // Real-time GPS Telemetry Banner Styles
  liveGpsStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  liveGpsIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveGreenPulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveGpsStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803D',
  },
  liveAutoSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
  },
  liveAutoSyncText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    marginLeft: 3,
  },
  passingAccordionPillTrainHere: {
    backgroundColor: '#0F766E',
    borderColor: '#14B8A6',
    borderWidth: 1.5,
  },
  passingAccordionTextTrainHere: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  trainPulseMiniDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
    marginRight: 5,
  },

  // Tracking Source Bar (Cell tower / GPS & Offline)
  trackingSourceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  trackingSourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingSourceLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 6,
  },
  sourcePillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 6,
  },
  sourcePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sourcePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  sourcePillTextActive: {
    color: '#FFFFFF',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  offlineGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  offlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Hero Status Banner
  heroStatusBanner: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  heroStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatusTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    marginRight: 6,
  },
  heroDelayPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  heroDelayText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroStatusSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },

  // Intermediate Passing Stations Group
  intermediateStationsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  intermediateTrackLineCol: {
    width: 30,
    alignItems: 'center',
  },
  trackLinePassing: {
    width: 2,
    height: 20,
    borderRadius: 1,
  },
  intermediateContentCol: {
    flex: 1,
    paddingLeft: 6,
  },
  intermediateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  intermediateText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  passingStationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    opacity: 0.85,
  },
  passingTimeColLeft: {
    width: 60,
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  passingTimeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  passingTrackCol: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  passingTrackLineTop: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 13,
  },
  passingTrackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
    zIndex: 2,
  },
  passingTrackDotGreen: {
    backgroundColor: '#10B981',
  },
  passingTrackDotCurrent: {
    backgroundColor: '#0284C7',
    transform: [{ scale: 1.3 }],
  },
  passingTrackLineBottom: {
    position: 'absolute',
    bottom: 0,
    width: 2,
    height: 13,
  },
  passingInfoCol: {
    flex: 1,
    paddingLeft: 8,
  },
  passingStationName: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  passingSpeedText: {
    fontSize: 9.5,
  },
  passingTimeColRight: {
    width: 60,
    alignItems: 'flex-start',
    paddingLeft: 6,
  },

  // Floating ETA & Speed Capsule (Reference App)
  floatingEtaCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  floatingEtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  floatingEtaText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  floatingEtaRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingWhistleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hornSimulatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 14,
    marginBottom: 6,
  },
  hornSimulatedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
  },

  // ================= REAL-TIME TELEMETRY & SPEEDOMETER DECK STYLES =================
  telemetryDeckContainer: {
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  telemetryStatusSubBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
  },
  telemetryLiveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  telemetryBlinkingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  telemetryLiveStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  telemetrySyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  telemetrySyncText: {
    fontSize: 10.5,
    fontWeight: '800',
    marginLeft: 3,
  },
  speedometerMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  speedometerMetricBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRightWidth: 0.8,
  },
  speedometerIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  speedometerTextCol: {
    flex: 1,
  },
  speedometerLabelText: {
    fontSize: 9,
    fontWeight: '600',
  },
  speedometerValueText: {
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 1,
  },
  telemetryLocationStrip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 0.8,
    gap: 3,
  },
  telemetryLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  telemetryLocationEmoji: {
    fontSize: 11,
    marginRight: 5,
  },
  telemetryLocationLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginRight: 4,
  },
  telemetryLocationValue: {
    fontSize: 10.5,
    fontWeight: '700',
    flex: 1,
  },
  telemetryCollapseHandle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },

  // ================= EMERGENCY HELPLINES STYLES =================
  helplineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 0.8,
  },
  helplineIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineNameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  helplineNumPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  helplineNumText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  helplineDescText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },

  // ================= ALARM INTERVAL STYLES =================
  alarmIntervalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6,
  },
  alarmIntervalChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  alarmIntervalChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  alarmIntervalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  alarmIntervalTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  alarmTestSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  alarmTestSoundText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});

// ===== Live Map Tab Styles (Separate StyleSheet) =====
const lmStyles = StyleSheet.create({
  liveMapRoot: {
    flex: 1,
    backgroundColor: '#E2F0D9',
    justifyContent: 'space-between',
  },
  mapAreaContainer: {
    flex: 1,
    minHeight: 180,
    backgroundColor: '#E2F0D9',
    position: 'relative',
    overflow: 'hidden',
  },
  mapGridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  mapGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  compassBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    zIndex: 10,
  },
  mapTrackSegment: {
    position: 'absolute',
    height: 3.5,
    borderRadius: 2,
    zIndex: 1,
  },
  trainOnTrackBadge: {
    position: 'absolute',
    left: '42%',
    top: '42%',
    width: 30,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  mapStationWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  mapStartGreenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 2,
  },
  mapDestRedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 2,
  },
  mapInterDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#0284C7',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    marginBottom: 2,
  },
  mapInterDotActive: {
    backgroundColor: '#007AFF',
    borderColor: '#F59E0B',
    borderWidth: 2,
    transform: [{ scale: 1.3 }],
  },
  mapStationBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 85,
  },
  mapStationBubbleActive: {
    borderColor: '#007AFF',
    borderWidth: 1.5,
    backgroundColor: '#F0F9FF',
    transform: [{ scale: 1.05 }],
  },
  mapBubbleName: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapBubbleNameActive: {
    color: '#007AFF',
  },
  mapBubbleTime: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },

  // Bottom Station Detail Card (Compact & Squeezed)
  bottomDockedSection: {
    paddingBottom: 6,
    backgroundColor: '#E2F0D9',
  },
  stationDetailCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  bottomCardHandle: {
    width: 32,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 6,
  },
  bottomStationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stationIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  bottomStationTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  bottomCloseBtn: {
    padding: 2,
  },
  timingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timingCol: {
    flex: 1,
  },
  timingLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },
  timingSched: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  timingActualDelayed: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 1,
  },
  delayBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  delayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  distanceMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  distanceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceMetricsText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },
  platformAndPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  platformNumberCard: {
    width: 58,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformNumberLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  platformNumberBig: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  stationThumbImage: {
    width: 100,
    height: 48,
    borderRadius: 6,
  },
  dynamicStationBadgeContainer: {
    width: 100,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dynamicStationBadgeCode: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 1,
  },
  dynamicStationBadgeType: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#64748B',
  },
  viewStationActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewStationActionBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  showFullJourneyFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    marginTop: 6,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  showFullJourneyFullBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#007AFF',
  },
});
