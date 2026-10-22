import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Animated, Easing, Platform, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Station, STATIONS_DATABASE, POPULAR_STATIONS } from '../data/stations';
import { CORRIDOR_TRAINS_MASTER, findOrGenerateTrain, CorridorTrain } from '../data/trainsBetweenStations';
import { searchAndRankStations, searchAndRankTrains } from '../utils/searchRanker';
import { usePreferences, SafeStorage } from '../context/PreferencesContext';
import { LiveTrainApi } from '../services/liveTrainApiService';

interface RecentSearchItem {
  id: string;
  from: Station;
  to: Station;
  route: string;
  sub: string;
}

export interface RecentlyTrackedItem {
  id: string;
  trainNumber: string;
  trainName: string;
  fromCode: string;
  toCode: string;
}

export const DEFAULT_RECENTLY_TRACKED: RecentlyTrackedItem[] = [
  {
    id: 'track-12004',
    trainNumber: '12004',
    trainName: 'Lucknow Shatabdi Express',
    fromCode: 'NDLS',
    toCode: 'LKO',
  },
  {
    id: 'track-12424',
    trainNumber: '12424',
    trainName: 'Dibrugarh Rajdhani Express',
    fromCode: 'NDLS',
    toCode: 'CNB',
  },
  {
    id: 'track-22436',
    trainNumber: '22436',
    trainName: 'Vande Bharat Express',
    fromCode: 'NDLS',
    toCode: 'BSB',
  },
  {
    id: 'track-12229',
    trainNumber: '12229',
    trainName: 'Lucknow Mail',
    fromCode: 'LKO',
    toCode: 'NDLS',
  },
];

const DEFAULT_RECENT_SEARCHES: RecentSearchItem[] = [
  {
    id: 'rec-1',
    from: { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' },
    to: { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', state: 'Uttar Pradesh' },
    route: 'NDLS ➔ LKO',
    sub: 'New Delhi to Lucknow Charbagh',
  },
  {
    id: 'rec-2',
    from: { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' },
    to: { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh' },
    route: 'NDLS ➔ CNB',
    sub: 'New Delhi to Kanpur Central',
  },
  {
    id: 'rec-2',
    from: { code: 'BSB', name: 'Varanasi Junction', city: 'Varanasi', state: 'Uttar Pradesh' },
    to: { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' },
    route: 'BSB ➔ NDLS',
    sub: 'Varanasi Jn to New Delhi',
  },
  {
    id: 'rec-3',
    from: { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra' },
    to: { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' },
    route: 'MMCT ➔ NDLS',
    sub: 'Mumbai Central to New Delhi',
  },
  {
    id: 'rec-4',
    from: { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal' },
    to: { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' },
    route: 'HWH ➔ NDLS',
    sub: 'Howrah Jn to New Delhi',
  },
];


interface HomeScreenProps {
  onNavigateToTab: (tab: 'live' | 'pnr' | 'schedule') => void;
  onSearchTrains: (from: Station, to: Station, date: string) => void;
  onTrackTrain?: (trainNumber: string, trainName: string) => void;
  fromStation: Station | null;
  toStation: Station | null;
  onSetFromStation: (station: Station | null) => void;
  onSetToStation: (station: Station | null) => void;
}

// Intelligent helper to auto-resolve typed text into a valid station object
function findMatchingStation(query: string): Station | null {
  const clean = query.trim().toLowerCase();
  if (!clean) return null;
  // 1. Exact code match (e.g. NDLS)
  const byCode = STATIONS_DATABASE.find((s) => s.code.toLowerCase() === clean);
  if (byCode) return byCode;
  // 2. Extracted code from string like "New Delhi (NDLS)"
  const codeInParen = clean.match(/\(([a-z0-9]+)\)/i);
  if (codeInParen && codeInParen[1]) {
    const byParen = STATIONS_DATABASE.find((s) => s.code.toLowerCase() === codeInParen[1].toLowerCase());
    if (byParen) return byParen;
  }
  // 3. Exact name match
  const byName = STATIONS_DATABASE.find((s) => s.name.toLowerCase() === clean);
  if (byName) return byName;
  // 4. Prefix match on name, city or code
  const byPrefix = STATIONS_DATABASE.find(
    (s) => s.name.toLowerCase().startsWith(clean) || s.city.toLowerCase().startsWith(clean) || s.code.toLowerCase().startsWith(clean)
  );
  if (byPrefix) return byPrefix;
  return null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToTab,
  onSearchTrains,
  onTrackTrain,
  fromStation,
  toStation,
  onSetFromStation,
  onSetToStation,
}) => {
  const { colors, language, isDarkMode, t } = usePreferences();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sourceHasError, setSourceHasError] = useState(false);
  const [destHasError, setDestHasError] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(DEFAULT_RECENT_SEARCHES);
  const [recentlyTracked, setRecentlyTracked] = useState<RecentlyTrackedItem[]>(DEFAULT_RECENTLY_TRACKED);

  // Quick Action Modal States (matching 8-item grid in Screenshot 1)
  const [showSpotTrainModal, setShowSpotTrainModal] = useState(false);
  const [showDeparturesModal, setShowDeparturesModal] = useState(false);
  const [showSeatAvailModal, setShowSeatAvailModal] = useState(false);
  const [showSeatGapsModal, setShowSeatGapsModal] = useState(false);
  const [showResChartModal, setShowResChartModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [departuresStation, setDeparturesStation] = useState<Station>(() => {
    return fromStation || STATIONS_DATABASE.find((s) => s.code === 'NDLS') || STATIONS_DATABASE[0];
  });
  const [spotModalQuery, setSpotModalQuery] = useState('');
  const [selectedSeatQuota, setSelectedSeatQuota] = useState<'GN' | 'TQ' | 'LD'>('GN');
  const [selectedSeatClass, setSelectedSeatClass] = useState<'2S' | 'CC' | 'SL' | '3A' | '2A'>('2S');

  // Station Wake-up Alarm states (Reference App Feature)
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [alarmStation, setAlarmStation] = useState<string>('Lucknow Charbagh (LKO)');
  const [alarmLeadMinutes, setAlarmLeadMinutes] = useState<number>(30);
  const [alarmActive, setAlarmActive] = useState<boolean>(false);
  const [alarmVibrate, setAlarmVibrate] = useState<boolean>(true);

  // Sync alarm target with selected destination
  useEffect(() => {
    if (toStation && toStation.name) {
      setAlarmStation(`${toStation.name} (${toStation.code})`);
    }
  }, [toStation]);

  // Animated 180deg rotation for Swap button
  const swapAnim = useRef(new Animated.Value(0)).current;
  const swapDeg = useRef(0);

  useEffect(() => {
    SafeStorage.getItem('@user_recent_searches')
      .then((saved) => {
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= 4) {
            setRecentSearches(parsed);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Free text typing states (User has complete freedom to type any text, never blocked or cleared)
  const [fromText, setFromText] = useState(
    fromStation ? fromStation.name : 'New Delhi'
  );
  const [toText, setToText] = useState(
    toStation ? toStation.name : 'Lucknow Charbagh'
  );

  // Selected Travel Date Option (Today, Tomorrow, Day After)
  const [selectedDateOption, setSelectedDateOption] = useState<'today' | 'tomorrow' | 'day_after'>('today');

  const dateOptions = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d0 = new Date();
    const d1 = new Date(Date.now() + 86400000);
    const d2 = new Date(Date.now() + 86400000 * 2);
    return [
      { key: 'today', label: language === 'hi' ? 'आज' : 'Today', dateStr: `${d0.getDate()} ${months[d0.getMonth()]}` },
      { key: 'tomorrow', label: language === 'hi' ? 'कल' : 'Tomorrow', dateStr: `${d1.getDate()} ${months[d1.getMonth()]}` },
      { key: 'day_after', label: language === 'hi' ? 'परसों' : 'Day After', dateStr: `${d2.getDate()} ${months[d2.getMonth()]}` },
    ];
  }, [language]);

  // Active inline dropdown state
  const [activeInlineSearch, setActiveInlineSearch] = useState<'from' | 'to' | null>(null);

  // Confirmed station states (Valid ONLY when selected from actual suggestions or loaded from valid state)
  const [sourceConfirmed, setSourceConfirmed] = useState(!!(fromStation && fromStation.name));
  const [destConfirmed, setDestConfirmed] = useState(!!(toStation && toStation.name));

  // Keep in sync with props (e.g. when user navigates back from search results or swaps)
  useEffect(() => {
    if (fromStation && fromStation.name) {
      setFromText(fromStation.name);
      setSourceConfirmed(true);
    } else if (fromStation === null) {
      setFromText('');
      setSourceConfirmed(false);
    }
  }, [fromStation]);

  useEffect(() => {
    if (toStation && toStation.name) {
      setToText(toStation.name);
      setDestConfirmed(true);
    } else if (toStation === null) {
      setToText('');
      setDestConfirmed(false);
    }
  }, [toStation]);

  // Animated moving train from Source to Destination on the left track
  const trainProgress = useRef(new Animated.Value(0)).current;

  // Animated blinking dot for "LIVE" badge beside Spot Your Train
  const liveBlinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(trainProgress, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(350),
        Animated.timing(trainProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(150),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [trainProgress]);

  useEffect(() => {
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(liveBlinkAnim, {
          toValue: 0.2,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(liveBlinkAnim, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    blinkLoop.start();
    return () => blinkLoop.stop();
  }, [liveBlinkAnim]);

  // Page Entrance Animation (Fade + Slide-Up)
  const screenFadeAnim = useRef(new Animated.Value(0)).current;
  const screenSlideAnim = useRef(new Animated.Value(16)).current;
  const stationPulseAnim = useRef(new Animated.Value(1)).current;
  const findBtnScale = useRef(new Animated.Value(1)).current;
  const spotBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(screenSlideAnim, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(stationPulseAnim, {
          toValue: 1.35,
          duration: 1100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(stationPulseAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [screenFadeAnim, screenSlideAnim, stationPulseAnim]);

  const trainTranslateY = trainProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  const trainOpacity = trainProgress.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0.3, 1, 1, 0.3],
  });

  // Animated top-center toast error notification
  const errorPopupAnim = useRef(new Animated.Value(0)).current;
  const errorTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const popupTranslateY = errorPopupAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-45, 0],
  });

  const popupOpacity = errorPopupAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const showErrorPopup = useCallback((message: string) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }

    setValidationError(message);
    errorPopupAnim.setValue(0);

    // Fast & smooth entry: slide-down + fade-in (240ms)
    Animated.timing(errorPopupAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Stay for ~1.7s, then exit with fade-out + slight slide-up (total ~2.5s)
    errorTimeoutRef.current = setTimeout(() => {
      Animated.timing(errorPopupAnim, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setValidationError(null);
        setSourceHasError(false);
        setDestHasError(false);
      });
    }, 1800);
  }, [errorPopupAnim]);

  const [spotTrainQuery, setSpotTrainQuery] = useState('');
  const [isSpotFocused, setIsSpotFocused] = useState(false);
  const [onlineSearchResults, setOnlineSearchResults] = useState<CorridorTrain[]>([]);

  // Real-time Internet / RailRadar search for queried train numbers
  useEffect(() => {
    const cleanNo = spotTrainQuery.trim().replace(/\D/g, '');
    if (cleanNo.length >= 4) {
      let isCurrent = true;
      const abortCtrl = new AbortController();
      const timer = setTimeout(async () => {
        try {
          // 1. Fetch live train status via LiveTrainApi (works directly on mobile via RailRadar SSR)
          const liveData = await LiveTrainApi.getLiveTrainStatus(cleanNo);
          if (liveData && liveData.stations && liveData.stations.length > 0 && isCurrent) {
            const origin = liveData.stations[0];
            const dest = liveData.stations[liveData.stations.length - 1];
            const trainObj: CorridorTrain = {
              id: `rr-${cleanNo}`,
              number: cleanNo,
              name: liveData.trainName,
              type: 'Superfast',
              isLocalEmu: false,
              originCode: origin.stationCode,
              originName: origin.stationName,
              destCode: dest.stationCode,
              destName: dest.stationName,
              depTime: origin.scheduledDeparture !== '--:--' ? origin.scheduledDeparture : origin.scheduledArrival,
              arrTime: dest.scheduledArrival !== '--:--' ? dest.scheduledArrival : dest.scheduledDeparture,
              duration: `${Math.round((dest.distanceKm || 400) / 60)}h`,
              totalHaults: liveData.stations.filter((s) => !s.isPassing).length,
              totalDistanceKm: dest.distanceKm || 500,
              runsOn: [true, true, true, true, true, true, true],
              classes: [
                { type: 'SL', price: 350, status: 'AVAILABLE', statusType: 'available', updatedText: 'Live' },
                { type: '3A', price: 950, status: 'AVAILABLE', statusType: 'available', updatedText: 'Live' },
              ],
              stops: liveData.stations.map((s) => ({
                code: s.stationCode,
                name: s.stationName,
                arr: s.scheduledArrival,
                dep: s.scheduledDeparture,
                distanceKm: s.distanceKm,
                platform: s.platform,
                isPassing: !!s.isPassing,
                day: s.day || 1,
              })),
            };
            setOnlineSearchResults([trainObj]);
            return;
          }
        } catch {}

        try {
          const res = await fetch(`http://localhost:5001/api/train-search?query=${cleanNo}`, { signal: abortCtrl.signal });
          if (res.ok && isCurrent) {
            const data = await res.json();
            if (data.success && Array.isArray(data.trains) && data.trains.length > 0) {
              setOnlineSearchResults(data.trains);
            }
          }
        } catch {}
      }, 300);
      return () => {
        isCurrent = false;
        clearTimeout(timer);
        abortCtrl.abort();
      };
    } else {
      setOnlineSearchResults([]);
    }
  }, [spotTrainQuery]);

  const spotRankedResults = useMemo(() => {
    const query = spotTrainQuery.trim();
    if (!query) return [];

    // 1. Search in Corridor Trains Master
    const ranked = searchAndRankTrains(query, CORRIDOR_TRAINS_MASTER);

    // 2. Check if query is an exact match in results
    const isExactMatch = ranked.some((t) => t.number.toLowerCase() === query.toLowerCase());

    // 3. Merge online RailRadar results
    const onlineMatched = onlineSearchResults.filter(
      (ot) => ot.number.includes(query) || ot.name.toLowerCase().includes(query.toLowerCase())
    );

    const merged: CorridorTrain[] = [...onlineMatched];
    for (const r of ranked) {
      if (!merged.some((t) => t.number === r.number)) {
        merged.push(r);
      }
    }

    // 4. If user typed a train number/name with no match, dynamically resolve via findOrGenerateTrain
    if (!isExactMatch && merged.length === 0 && (query.length >= 2 || !isNaN(Number(query)))) {
      const direct = findOrGenerateTrain(query);
      if (direct && !merged.some((t) => t.number === direct.number)) {
        merged.unshift(direct);
      }
    }

    return merged.slice(0, 8);
  }, [spotTrainQuery, onlineSearchResults]);

  const handleSpotTrain = useCallback((trainNumber: string, trainName: string) => {
    if (onTrackTrain) {
      onTrackTrain(trainNumber, trainName);
    } else {
      onNavigateToTab('live');
    }
  }, [onTrackTrain, onNavigateToTab]);

  const handleSpotSubmit = useCallback(() => {
    const query = spotTrainQuery.trim();
    if (spotRankedResults.length > 0) {
      const top = spotRankedResults[0];
      handleSpotTrain(top.number, top.name);
      setSpotTrainQuery('');
      return;
    }
    if (query) {
      const found = findOrGenerateTrain(query);
      handleSpotTrain(found.number, found.name);
      setSpotTrainQuery('');
      return;
    }
    // Default fallback to popular Vande Bharat train
    handleSpotTrain('22436', 'Vande Bharat Express');
  }, [spotTrainQuery, spotRankedResults, handleSpotTrain]);

  // Matching suggestions generated ONLY when user has typed at least 1 character
  const fromRankedResults = useMemo(() => {
    if (!fromText.trim()) return [];
    return searchAndRankStations(fromText, STATIONS_DATABASE).slice(0, 40);
  }, [fromText]);

  const toRankedResults = useMemo(() => {
    if (!toText.trim()) return [];
    return searchAndRankStations(toText, STATIONS_DATABASE).slice(0, 40);
  }, [toText]);

  // When user selects a suggestion from dropdown
  const handleSelectFrom = useCallback((station: Station) => {
    onSetFromStation(station);
    setFromText(station.name);
    setSourceConfirmed(true);
    setActiveInlineSearch(null);
    setValidationError(null);
    setSourceHasError(false);
  }, [onSetFromStation]);

  const handleSelectTo = useCallback((station: Station) => {
    onSetToStation(station);
    setToText(station.name);
    setDestConfirmed(true);
    setActiveInlineSearch(null);
    setValidationError(null);
    setDestHasError(false);
  }, [onSetToStation]);

  const handleFromChangeText = (text: string) => {
    setFromText(text);
    setSourceConfirmed(false); // Typing requires picking from suggestions to confirm
    setActiveInlineSearch('from');
    setValidationError(null);
    setSourceHasError(false);
  };

  const handleToChangeText = (text: string) => {
    setToText(text);
    setDestConfirmed(false); // Typing requires picking from suggestions to confirm
    setActiveInlineSearch('to');
    setValidationError(null);
    setDestHasError(false);
  };

  const handleClearFrom = () => {
    setFromText('');
    setSourceConfirmed(false);
    onSetFromStation(null);
    setActiveInlineSearch('from');
    setValidationError(null);
    setSourceHasError(false);
  };

  const handleClearTo = () => {
    setToText('');
    setDestConfirmed(false);
    onSetToStation(null);
    setActiveInlineSearch('to');
    setValidationError(null);
    setDestHasError(false);
  };

  const swapStations = useCallback(() => {
    swapDeg.current += 180;
    Animated.spring(swapAnim, {
      toValue: swapDeg.current,
      tension: 65,
      friction: 7,
      useNativeDriver: true,
    }).start();

    const prevFromText = fromText;
    const prevToText = toText;
    setFromText(prevToText);
    setToText(prevFromText);

    const prevSourceConfirmed = sourceConfirmed;
    const prevDestConfirmed = destConfirmed;
    setSourceConfirmed(prevDestConfirmed);
    setDestConfirmed(prevSourceConfirmed);

    const prevFromStation = fromStation;
    const prevToStation = toStation;
    onSetFromStation(prevToStation);
    onSetToStation(prevFromStation);

    setActiveInlineSearch(null);
    setValidationError(null);
    setSourceHasError(false);
    setDestHasError(false);
  }, [fromText, toText, sourceConfirmed, destConfirmed, fromStation, toStation, onSetFromStation, onSetToStation, swapAnim]);

  // Validation performed STRICTLY on "FIND TRAINS" click covering all edge cases
  const handleFindTrains = useCallback((overrideFrom?: any, overrideTo?: any) => {
    setActiveInlineSearch(null);

    let validSource: Station | null = null;
    let validDest: Station | null = null;

    if (overrideFrom && typeof overrideFrom === 'object' && overrideFrom.code && overrideFrom.name) {
      validSource = overrideFrom;
    } else if (sourceConfirmed && fromStation) {
      validSource = fromStation;
    } else if (fromText.trim()) {
      // Auto-match typed text with database
      const matched = findMatchingStation(fromText);
      if (matched) {
        validSource = matched;
        setSourceConfirmed(true);
      }
    }

    if (overrideTo && typeof overrideTo === 'object' && overrideTo.code && overrideTo.name) {
      validDest = overrideTo;
    } else if (destConfirmed && toStation) {
      validDest = toStation;
    } else if (toText.trim()) {
      // Auto-match typed text with database
      const matched = findMatchingStation(toText);
      if (matched) {
        validDest = matched;
        setDestConfirmed(true);
      }
    }

    // Edge Case: Source aur Destination same station select kare
    if (validSource && validDest && validSource.code === validDest.code) {
      setSourceHasError(true);
      setDestHasError(true);
      showErrorPopup('Source and Destination cannot be the same.');
      return;
    }

    // Both valid stations! Immediately proceed with search (works smoothly for Recent Searches & Normal Searches)
    if (validSource && validDest) {
      setValidationError(null);
      setSourceHasError(false);
      setDestHasError(false);
      onSetFromStation(validSource);
      onSetToStation(validDest);
      setFromText(`${validSource.name}${validSource.code ? ` (${validSource.code})` : ''}`);
      setToText(`${validDest.name}${validDest.code ? ` (${validDest.code})` : ''}`);
      setSourceConfirmed(true);
      setDestConfirmed(true);

      if (onSearchTrains) {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const travelDateStr = `Today, ${now.getDate()} ${months[now.getMonth()]}`;
        
        // Save to dynamic recent searches list
        const newRec: RecentSearchItem = {
          id: `rec-${validSource.code}-${validDest.code}-${Date.now()}`,
          from: validSource,
          to: validDest,
          route: `${validSource.code} ➔ ${validDest.code}`,
          sub: `${validSource.name} to ${validDest.name}`,
        };
        setRecentSearches((prev) => {
          const filtered = prev.filter(
            (r) => !(r.from.code === validSource!.code && r.to.code === validDest!.code)
          );
          const updated = [newRec, ...filtered].slice(0, 8);
          SafeStorage.setItem('@user_recent_searches', JSON.stringify(updated)).catch(() => {});
          return updated;
        });

        onSearchTrains(validSource, validDest, travelDateStr);
      }
      return;
    }

    // If not both valid, check remaining edge cases and show appropriate error message
    const fromBlank = !fromText.trim();
    const toBlank = !toText.trim();

    const fromInvalid = !fromBlank && !validSource;
    const toInvalid = !toBlank && !validDest;

    // Edge Case 1: Dono blank hon
    if (fromBlank && toBlank) {
      setSourceHasError(true);
      setDestHasError(true);
      showErrorPopup('Please select Source and Destination Stations.');
      return;
    }

    // Edge Case 2: Dono mein random / invalid text ho
    if (fromInvalid && toInvalid) {
      setSourceHasError(true);
      setDestHasError(true);
      showErrorPopup('Please select a proper Source and Destination Station.');
      return;
    }

    // Edge Case 3: Ek blank ho aur ek mein invalid text ho
    if (fromBlank && toInvalid) {
      setSourceHasError(true);
      setDestHasError(true);
      showErrorPopup('Please select Source and a proper Destination Station.');
      return;
    }
    if (fromInvalid && toBlank) {
      setSourceHasError(true);
      setDestHasError(true);
      showErrorPopup('Please select a proper Source Station and Destination Station.');
      return;
    }

    // Edge Case 4: Source blank ho aur Destination valid ho
    if (fromBlank && validDest) {
      setSourceHasError(true);
      setDestHasError(false);
      showErrorPopup('Please select a Source Station.');
      return;
    }

    // Edge Case 5: Destination blank ho aur Source valid ho
    if (toBlank && validSource) {
      setSourceHasError(false);
      setDestHasError(true);
      showErrorPopup('Please select a Destination Station.');
      return;
    }

    // Edge Case 6: Source mein random/invalid text ho aur Destination valid ho
    if (fromInvalid && validDest) {
      setSourceHasError(true);
      setDestHasError(false);
      showErrorPopup('Please select a proper Source Station.');
      return;
    }

    // Edge Case 7: Destination mein random/invalid text ho aur Source valid ho
    if (toInvalid && validSource) {
      setSourceHasError(false);
      setDestHasError(true);
      showErrorPopup('Please select a proper Destination Station.');
      return;
    }
  }, [
    fromStation,
    toStation,
    fromText,
    toText,
    sourceConfirmed,
    destConfirmed,
    showErrorPopup,
    onSetFromStation,
    onSetToStation,
    onSearchTrains,
  ]);

  return (
    <View style={[styles.screenRoot, { backgroundColor: colors.background }]}>
      {/* ================= TOP-CENTER TOAST ERROR NOTIFICATION ================= */}
      {validationError && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.topCenterToastBox,
            {
              opacity: popupOpacity,
              transform: [{ translateY: popupTranslateY }],
            },
          ]}
        >
          <View style={styles.topToastIconContainer}>
            <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.topToastText} numberOfLines={2}>
            {validationError}
          </Text>
        </Animated.View>
      )}

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: screenFadeAnim, transform: [{ translateY: screenSlideAnim }] }}>
        {/* Modern Clean Search Card - Single card, no nested boxes */}
        {/* Modern Clean Search Card - Exact Layout Matching Screenshot 1 */}
        <View style={[styles.modernSearchCard, { backgroundColor: colors.surface, borderColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}>
          
          {/* Animated Dotted Track Column on Left Extreme */}
          {!activeInlineSearch && (
            <View style={[styles.leftTrackColumn, { pointerEvents: 'none' as const }]}>
              {/* Source Station Dot (Green) */}
              <View style={styles.stationDotSource} />

              {/* Dotted Track with Moving Train */}
              <View style={styles.dottedTrackLine}>
                <View style={[styles.trackDot, { backgroundColor: isDarkMode ? '#475569' : '#94A3B8' }]} />
                <View style={[styles.trackDot, { backgroundColor: isDarkMode ? '#475569' : '#94A3B8' }]} />
                <View style={[styles.trackDot, { backgroundColor: isDarkMode ? '#475569' : '#94A3B8' }]} />
                <View style={[styles.trackDot, { backgroundColor: isDarkMode ? '#475569' : '#94A3B8' }]} />
                <View style={[styles.trackDot, { backgroundColor: isDarkMode ? '#475569' : '#94A3B8' }]} />

                {/* Animated Moving Train Badge */}
                <Animated.View
                  style={[
                    styles.movingTrainBadge,
                    {
                      transform: [{ translateY: trainTranslateY }],
                      opacity: trainOpacity,
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="train" size={12} color={Colors.primary} />
                </Animated.View>
              </View>

              {/* Destination Station Dot (Red) */}
              <View style={styles.stationDotDest} />
            </View>
          )}

          {/* 1. FROM STATION ROW */}
          <View style={[styles.stationRowContainer, sourceHasError && styles.stationRowError]}>
            <View style={styles.stationCodeBadgeSolid}>
              <Text style={styles.stationCodeBadgeSolidText}>
                {fromStation ? fromStation.code : 'NDLS'}
              </Text>
            </View>

            <TextInput
              style={[
                styles.stationModernInput,
                {
                  color: colors.textPrimary,
                },
              ]}
              value={fromText}
              onChangeText={handleFromChangeText}
              onFocus={() => {
                setActiveInlineSearch('from');
                setValidationError(null);
                setSourceHasError(false);
              }}
              placeholder="Enter source station"
              placeholderTextColor={colors.textMuted}
            />

            {fromText.length > 0 && (
              <TouchableOpacity
                onPress={handleClearFrom}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.clearStationBtn}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* DROPDOWN FOR FROM STATION (Shows only when typing & matching) */}
          {activeInlineSearch === 'from' && fromText.trim().length > 0 && fromRankedResults.length > 0 && (
            <View style={[styles.inlineDropdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ScrollView
                style={styles.inlineDropdownScroll}
                contentContainerStyle={styles.inlineDropdownContent}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {fromRankedResults.map((st) => (
                  <TouchableOpacity
                    key={st.code}
                    style={[styles.stationDropdownItem, { borderBottomColor: colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectFrom(st)}
                  >
                    <View style={[styles.stationDropdownCodeBadge, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
                      <Text style={styles.stationDropdownCodeText}>{st.code}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stationDropdownName, { color: colors.textPrimary }]}>{st.name}</Text>
                      <Text style={[styles.stationDropdownLocation, { color: colors.textSecondary }]}>
                        {st.city === st.state ? st.city : `${st.city}, ${st.state}`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* DIVIDER ROW WITH SWAP BUTTON */}
          <View style={styles.modernDividerRow}>
            <View style={[styles.modernDividerLine, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]} />
            <TouchableOpacity
              style={[
                styles.modernSwapBtn,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: isDarkMode ? '#334155' : '#CBD5E1',
                },
              ]}
              activeOpacity={0.75}
              onPress={swapStations}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Animated.View style={{ transform: [{ rotate: swapAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] }}>
                <Ionicons name="swap-vertical" size={19} color={Colors.primary} />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* 2. TO STATION ROW */}
          <View style={[styles.stationRowContainer, destHasError && styles.stationRowError]}>
            <View style={styles.stationCodeBadgeSolid}>
              <Text style={styles.stationCodeBadgeSolidText}>
                {toStation ? toStation.code : 'LKO'}
              </Text>
            </View>

            <TextInput
              style={[
                styles.stationModernInput,
                {
                  color: colors.textPrimary,
                },
              ]}
              value={toText}
              onChangeText={handleToChangeText}
              onFocus={() => {
                setActiveInlineSearch('to');
                setValidationError(null);
                setDestHasError(false);
              }}
              placeholder="Enter destination station"
              placeholderTextColor={colors.textMuted}
            />

            {toText.length > 0 && (
              <TouchableOpacity
                onPress={handleClearTo}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.clearStationBtn}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* DROPDOWN FOR TO STATION (Shows only when typing & matching) */}
          {activeInlineSearch === 'to' && toText.trim().length > 0 && toRankedResults.length > 0 && (
            <View style={[styles.inlineDropdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ScrollView
                style={styles.inlineDropdownScroll}
                contentContainerStyle={styles.inlineDropdownContent}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {toRankedResults.map((st) => (
                  <TouchableOpacity
                    key={st.code}
                    style={[styles.stationDropdownItem, { borderBottomColor: colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectTo(st)}
                  >
                    <View style={[styles.stationDropdownCodeBadge, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
                      <Text style={styles.stationDropdownCodeText}>{st.code}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stationDropdownName, { color: colors.textPrimary }]}>{st.name}</Text>
                      <Text style={[styles.stationDropdownLocation, { color: colors.textSecondary }]}>
                        {st.city === st.state ? st.city : `${st.city}, ${st.state}`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 3. FIND TRAINS ACTION BUTTON (WITH SPRING PRESS MICRO-ANIMATION) */}
          <Animated.View style={{ transform: [{ scale: findBtnScale }] }}>
            <TouchableOpacity
              style={[
                styles.modernFindTrainsBtn,
                {
                  backgroundColor: isDarkMode ? '#059669' : colors.searchBtnGreen,
                  shadowColor: isDarkMode ? '#10B981' : colors.searchBtnGreen,
                },
              ]}
              activeOpacity={0.9}
              onPressIn={() => Animated.spring(findBtnScale, { toValue: 0.96, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(findBtnScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
              onPress={() => handleFindTrains()}
            >
              <Text style={styles.modernFindTrainsText}>{t('findTrains')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* SPOT YOUR TRAIN CARD (Clean, Optimized & Direct) */}
        <View
          style={[
            styles.spotTrainCard,
            {
              backgroundColor: colors.surface,
              borderColor: isSpotFocused ? colors.primary : (isDarkMode ? '#334155' : '#E2E8F0'),
              shadowColor: isSpotFocused ? colors.primary : '#0F172A',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.spotCardHeader}>
            <Text style={[styles.spotCardTitle, { color: colors.textPrimary }]}>
              {t('spotYourTrain') || 'Spot Your Train'}
            </Text>
          </View>

          {/* Search Input Row with Train Name/No. and Green Search Icon */}
          <View
            style={[
              styles.spotInputContainer,
              {
                backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                borderColor: isSpotFocused ? colors.primary : (isDarkMode ? '#334155' : '#CBD5E1'),
              },
            ]}
          >
            <View style={styles.spotInputTrainIcon}>
              <MaterialCommunityIcons name="train" size={20} color={colors.primary} />
            </View>

            <TextInput
              style={[
                styles.spotTextInput,
                {
                  color: colors.textPrimary,
                },
              ]}
              value={spotTrainQuery}
              onChangeText={setSpotTrainQuery}
              onFocus={() => setIsSpotFocused(true)}
              onBlur={() => setIsSpotFocused(false)}
              placeholder={t('trainNameOrNo') || 'Train name / no.'}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              onSubmitEditing={handleSpotSubmit}
            />

            {spotTrainQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSpotTrainQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.spotClearBtn}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            <Animated.View style={{ transform: [{ scale: spotBtnScale }] }}>
              <TouchableOpacity
                style={[
                  styles.greenSearchBox,
                  {
                    backgroundColor: isDarkMode ? '#059669' : colors.searchBtnGreen,
                    shadowColor: isDarkMode ? '#10B981' : colors.searchBtnGreen,
                  },
                ]}
                activeOpacity={0.85}
                onPressIn={() => Animated.spring(spotBtnScale, { toValue: 0.9, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(spotBtnScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                onPress={handleSpotSubmit}
              >
                <Ionicons name="search" size={19} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Dynamic Ranked Dropdown Suggestions with Smooth Scroll */}
          {spotRankedResults.length > 0 && (
            <View style={[styles.spotDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ScrollView
                style={{ maxHeight: 240 }}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {spotRankedResults.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSpotTrainQuery('');
                      handleSpotTrain(t.number, t.name);
                    }}
                  >
                    <View
                      style={[
                        styles.dropdownBadge,
                        {
                          backgroundColor: t.isLocalEmu
                            ? (isDarkMode ? '#0C4A6E' : '#E0F2FE')
                            : (isDarkMode ? '#312E81' : '#EDE9FE'),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownBadgeText,
                          {
                            color: t.isLocalEmu
                              ? (isDarkMode ? '#38BDF8' : '#0284C7')
                              : (isDarkMode ? '#A78BFA' : '#7C3AED'),
                          },
                        ]}
                      >
                        {t.number}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dropdownItemName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text style={[styles.dropdownItemLocation, { color: colors.textSecondary }]}>
                        {t.originCode} ➔ {t.destCode} • {t.type}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 4 LARGE QUICK RAILWAY CARDS (2x2 GRID IN SIGNATURE BLUE) */}
        <View style={styles.grid}>
          {/* 1. Live Status Card */}
          <TouchableOpacity
            style={[
              styles.gridItem,
              {
                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                borderColor: isDarkMode ? '#334155' : '#BAE6FD',
              },
            ]}
            activeOpacity={0.7}
            onPress={() => setShowSpotTrainModal(true)}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.gridIconCircle, { backgroundColor: isDarkMode ? '#0C4A6E' : Colors.primarySoft }]}>
                <Ionicons name="navigate" size={24} color={Colors.primary} />
              </View>
              <View style={styles.liveIndicatorPill}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveIndicatorText}>LIVE</Text>
              </View>
            </View>
            <Text style={[styles.gridItemTitle, { color: colors.textPrimary }]}>Live Status</Text>
            <Text style={[styles.gridItemSubtitle, { color: colors.textSecondary }]}>Spot train location</Text>
          </TouchableOpacity>

          {/* 2. PNR Status Card */}
          <TouchableOpacity
            style={[
              styles.gridItem,
              {
                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                borderColor: isDarkMode ? '#334155' : '#BAE6FD',
              },
            ]}
            activeOpacity={0.7}
            onPress={() => onNavigateToTab('pnr')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.gridIconCircle, { backgroundColor: isDarkMode ? '#0C4A6E' : Colors.primarySoft }]}>
                <Ionicons name="ticket" size={24} color={Colors.primary} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#64748B' : '#94A3B8'} />
            </View>
            <Text style={[styles.gridItemTitle, { color: colors.textPrimary }]}>PNR Status</Text>
            <Text style={[styles.gridItemSubtitle, { color: colors.textSecondary }]}>Check confirmation & chart</Text>
          </TouchableOpacity>

          {/* 3. Time Table Card */}
          <TouchableOpacity
            style={[
              styles.gridItem,
              {
                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                borderColor: isDarkMode ? '#334155' : '#BAE6FD',
              },
            ]}
            activeOpacity={0.7}
            onPress={() => onNavigateToTab('schedule')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.gridIconCircle, { backgroundColor: isDarkMode ? '#0C4A6E' : Colors.primarySoft }]}>
                <Ionicons name="calendar" size={24} color={Colors.primary} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#64748B' : '#94A3B8'} />
            </View>
            <Text style={[styles.gridItemTitle, { color: colors.textPrimary }]}>Time Table</Text>
            <Text style={[styles.gridItemSubtitle, { color: colors.textSecondary }]}>Offline train schedule</Text>
          </TouchableOpacity>

          {/* 4. Station Alarm Card (side me station alarm) */}
          <TouchableOpacity
            style={[
              styles.gridItem,
              {
                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                borderColor: alarmActive ? '#16A34A' : (isDarkMode ? '#334155' : '#BAE6FD'),
              },
            ]}
            activeOpacity={0.7}
            onPress={() => setShowAlarmModal(true)}
          >
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.gridIconCircle,
                  {
                    backgroundColor: alarmActive
                      ? '#DCFCE7'
                      : (isDarkMode ? '#0C4A6E' : Colors.primarySoft),
                  },
                ]}
              >
                <Ionicons
                  name="alarm"
                  size={24}
                  color={alarmActive ? '#16A34A' : Colors.primary}
                />
              </View>
              {alarmActive ? (
                <View style={styles.alarmActivePill}>
                  <Text style={styles.alarmActivePillText}>ARMED</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#64748B' : '#94A3B8'} />
              )}
            </View>
            <Text style={[styles.gridItemTitle, { color: colors.textPrimary }]}>Station Alarm</Text>
            <Text
              style={[
                styles.gridItemSubtitle,
                { color: alarmActive ? '#16A34A' : colors.textSecondary, fontWeight: alarmActive ? '700' : '500' },
              ]}
              numberOfLines={1}
            >
              {alarmActive ? `Active (${alarmLeadMinutes}m before)` : 'Wake-up alert'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Station Alarm Banner */}
        {alarmActive && (
          <View style={styles.alarmActiveBanner}>
            <View style={styles.alarmBannerIcon}>
              <Ionicons name="alarm" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.alarmBannerTitle}>Station Alarm Active</Text>
                <View style={styles.alarmLivePill}>
                  <Text style={styles.alarmLivePillText}>GPS ARMED</Text>
                </View>
              </View>
              <Text style={styles.alarmBannerSub} numberOfLines={1}>
                Wake up {alarmLeadMinutes}m before reaching {alarmStation}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setAlarmActive(false)} style={styles.alarmDismissBtn}>
              <Text style={styles.alarmDismissText}>Turn Off</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RECENTLY TRACKED SECTION (Matching Screenshot 1) */}
        <View style={styles.recentlyTrackedSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.recentlyTrackedTitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
              RECENTLY TRACKED
            </Text>
            <TouchableOpacity
              onPress={() => setRecentlyTracked([])}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.clearText, { color: Colors.primary }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          {recentlyTracked.length === 0 ? (
            <View style={[styles.emptyRecentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyRecentText, { color: colors.textMuted }]}>No recently tracked trains</Text>
            </View>
          ) : (
            recentlyTracked.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.trackedRowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => handleSpotTrain(item.trainNumber, item.trainName)}
              >
                <View style={styles.trackedRowLeft}>
                  <Text style={[styles.trackedTrainTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    <Text style={styles.trackedTrainBoldNum}>{item.trainNumber} </Text>
                    {item.trainName}
                  </Text>
                </View>

                <View style={styles.trackedRowRight}>
                  <Text style={[styles.trackedRouteBadgeText, { color: colors.textSecondary }]}>
                    {item.fromCode} - {item.toCode}
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color="#94A3B8" style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* BOTTOM PROMO CARD (Matching Screenshot 1) */}
        <View style={[styles.promoCard, { backgroundColor: colors.surface, borderColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}>
          <View style={styles.promoContentRow}>
            <View style={[styles.promoIconContainer, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
              <Ionicons name="car-sport" size={24} color={Colors.primary} />
            </View>
            <View style={styles.promoTextCol}>
              <Text style={[styles.promoTitle, { color: colors.textPrimary }]}>Compare & book the cheapest ride</Text>
              <View style={styles.promoStatsRow}>
                <View style={styles.promoStatBadge}>
                  <Text style={styles.promoStatText}>1M+ Users</Text>
                </View>
                <Text style={styles.promoDotSeparator}>•</Text>
                <View style={styles.promoRatingBadge}>
                  <Text style={styles.promoRatingText}>4.6 ★</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.promoActionBtn}
              activeOpacity={0.8}
              onPress={() => {
                showErrorPopup('Cab comparison loaded for your destination station.');
              }}
            >
              <Text style={styles.promoActionBtnText}>Check Rides</Text>
              <Ionicons name="arrow-forward" size={13} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 24 }} />
        </Animated.View>
      </ScrollView>

    {/* Station Wake-up Alarm Modal (Competitor Killer Feature) */}
    <Modal
      visible={showAlarmModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAlarmModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalSheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.alarmIconCircle, { backgroundColor: Colors.accentLight }]}>
                <Ionicons name="alarm" size={20} color={Colors.accent} />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>Station Wake-Up Alarm</Text>
                <Text style={[styles.modalSheetSub, { color: colors.textSecondary }]}>Rings before arrival so you never miss your stop</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowAlarmModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Target Station Input */}
            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>WAKE-UP STATION</Text>
            <TextInput
              style={[
                styles.modalTextInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                },
              ]}
              value={alarmStation}
              onChangeText={setAlarmStation}
              placeholder="Enter destination station name or code"
              placeholderTextColor={colors.textMuted}
            />

            {/* Quick Station Selectors */}
            <View style={styles.quickAlarmStationsRow}>
              {['Kanpur (CNB)', 'New Delhi (NDLS)', 'Agra Cantt (AGC)', 'Varanasi (BSB)'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.quickAlarmChip, alarmStation.includes(st.slice(0, 3)) && styles.quickAlarmChipActive]}
                  onPress={() => setAlarmStation(st)}
                >
                  <Text style={[styles.quickAlarmChipText, alarmStation.includes(st.slice(0, 3)) && styles.quickAlarmChipTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Lead Time Selection */}
            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>WAKE ME UP BEFORE ARRIVAL:</Text>
            <View style={styles.leadTimeGrid}>
              {[15, 30, 45, 60].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.leadTimeItem,
                    { borderColor: colors.border, backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC' },
                    alarmLeadMinutes === mins && styles.leadTimeItemActive,
                  ]}
                  onPress={() => setAlarmLeadMinutes(mins)}
                >
                  <Text style={[styles.leadTimeMins, alarmLeadMinutes === mins && styles.leadTimeMinsActive]}>{mins}</Text>
                  <Text style={[styles.leadTimeLabel, alarmLeadMinutes === mins && styles.leadTimeLabelActive]}>Mins</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Vibrate Toggle Option */}
            <TouchableOpacity
              style={[styles.vibrateToggleRow, { borderColor: colors.border }]}
              onPress={() => setAlarmVibrate(!alarmVibrate)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="vibrate" size={22} color={colors.primary} />
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[styles.vibrateTitle, { color: colors.textPrimary }]}>Loud Alarm & Vibration</Text>
                <Text style={[styles.vibrateSub, { color: colors.textSecondary }]}>Rings even if phone is on silent mode</Text>
              </View>
              <Ionicons name={alarmVibrate ? "checkbox" : "square-outline"} size={22} color={colors.primary} />
            </TouchableOpacity>

            {/* GPS Battery Saver Note */}
            <View style={styles.gpsInfoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#0284C7" style={{ marginRight: 6, marginTop: 1 }} />
              <Text style={styles.gpsInfoText}>
                Uses battery-efficient GPS geo-fencing. Runs seamlessly in background without draining your battery.
              </Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.activateAlarmBtn}
              activeOpacity={0.85}
              onPress={() => {
                setAlarmActive(true);
                setShowAlarmModal(false);
              }}
            >
              <Ionicons name="alarm" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.activateAlarmText}>{alarmActive ? 'UPDATE ALARM' : 'SET STATION ALARM'}</Text>
            </TouchableOpacity>

            {alarmActive && (
              <TouchableOpacity
                style={styles.cancelAlarmBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setAlarmActive(false);
                  setShowAlarmModal(false);
                }}
              >
                <Text style={styles.cancelAlarmText}>Turn Off Alarm</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* 1. SPOT TRAIN MODAL */}
    <Modal
      visible={showSpotTrainModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSpotTrainModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalSheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.alarmIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="train" size={20} color={Colors.primary} />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>Spot Train by Number / Name</Text>
                <Text style={[styles.modalSheetSub, { color: colors.textSecondary }]}>Enter train number to track live GPS position</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowSpotTrainModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>ENTER TRAIN NO. OR NAME</Text>
            <TextInput
              style={[
                styles.modalTextInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                },
              ]}
              value={spotModalQuery}
              onChangeText={setSpotModalQuery}
              placeholder="e.g. 64076 or New Delhi EMU"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary, marginTop: 8 }]}>POPULAR ROUTE TRAINS</Text>
            <View style={{ gap: 8 }}>
              {[
                { number: '64076', name: 'New Delhi - Palwal EMU' },
                { number: '64074', name: 'New Delhi - Kosi Kalan EMU' },
                { number: '64082', name: 'New Delhi - Palwal EMU' },
                { number: '64904', name: 'Ghaziabad - Mathura EMU' },
                { number: '12002', name: 'New Delhi - Bhopal Shatabdi' },
                { number: '22436', name: 'Vande Bharat Express' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.number}
                  style={[styles.trackedRowCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}
                  onPress={() => {
                    setShowSpotTrainModal(false);
                    handleSpotTrain(t.number, t.name);
                  }}
                >
                  <Text style={[styles.trackedTrainTitle, { color: colors.textPrimary }]}>
                    <Text style={styles.trackedTrainBoldNum}>{t.number} </Text>
                    {t.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.activateAlarmBtn, { backgroundColor: Colors.primary, marginTop: 16 }]}
              onPress={() => {
                const q = spotModalQuery.trim() || '64076';
                setShowSpotTrainModal(false);
                handleSpotTrain(q, `Train ${q}`);
              }}
            >
              <Ionicons name="navigate" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.activateAlarmText}>TRACK TRAIN NOW</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* 2. STATION DEPARTURES MODAL */}
    <Modal
      visible={showDeparturesModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDeparturesModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalSheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.alarmIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="time" size={20} color={Colors.primary} />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>Live Station Departures</Text>
                <Text style={[styles.modalSheetSub, { color: colors.textSecondary }]}>Platform numbers and live train status</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowDeparturesModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>SELECT STATION</Text>
            <View style={styles.quickAlarmStationsRow}>
              {[
                { code: 'NDLS', name: 'New Delhi' },
                { code: 'LKO', name: 'Lucknow' },
                { code: 'CNB', name: 'Kanpur' },
                { code: 'BSB', name: 'Varanasi' },
              ].map((st) => (
                <TouchableOpacity
                  key={st.code}
                  style={[styles.quickAlarmChip, departuresStation.code === st.code && styles.quickAlarmChipActive]}
                  onPress={() => {
                    const found = STATIONS_DATABASE.find((s) => s.code === st.code);
                    if (found) setDeparturesStation(found);
                  }}
                >
                  <Text style={[styles.quickAlarmChipText, departuresStation.code === st.code && styles.quickAlarmChipTextActive]}>
                    {st.name} ({st.code})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>UPCOMING DEPARTURES</Text>
            <View style={{ gap: 8 }}>
              {[
                { num: '64076', name: 'NDLS - PWL EMU', expTime: '01:06 AM', plat: 'PF 4', status: 'On Time', isDelay: false },
                { num: '64074', name: 'NDLS - KSV EMU', expTime: '05:32 AM', plat: 'PF 2', status: '+12m Late', isDelay: true },
                { num: '64062', name: 'Delhi - Palwal EMU', expTime: '06:15 AM', plat: 'PF 3', status: 'On Time', isDelay: false },
                { num: '64078', name: 'NDLS - PWL EMU', expTime: '08:45 AM', plat: 'PF 4', status: '+5m Late', isDelay: true },
                { num: '12002', name: 'Bhopal Shatabdi', expTime: '06:40 AM', plat: 'PF 1', status: 'On Time', isDelay: false },
              ].map((item) => (
                <TouchableOpacity
                  key={item.num}
                  style={[styles.trackedRowCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}
                  onPress={() => {
                    setShowDeparturesModal(false);
                    handleSpotTrain(item.num, item.name);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.trackedTrainTitle, { color: colors.textPrimary }]}>
                      <Text style={styles.trackedTrainBoldNum}>{item.num} </Text>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      Departure: <Text style={{ fontWeight: '700' }}>{item.expTime}</Text> • Platform: <Text style={{ fontWeight: '700', color: Colors.primary }}>{item.plat}</Text>
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: item.isDelay ? '#FEE2E2' : '#DCFCE7' }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: item.isDelay ? '#DC2626' : '#15803D' }}>{item.status}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* 3. SEAT AVAILABILITY MODAL */}
    <Modal
      visible={showSeatAvailModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSeatAvailModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalSheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.alarmIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="grid" size={20} color={Colors.primary} />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>Seat Availability</Text>
                <Text style={[styles.modalSheetSub, { color: colors.textSecondary }]}>
                  {fromStation ? fromStation.code : 'NDLS'} ➔ {toStation ? toStation.code : 'LKO'} • Real-time quotas
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowSeatAvailModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>QUOTA</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {(['GN', 'TQ', 'LD'] as const).map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quickAlarmChip, selectedSeatQuota === q && styles.quickAlarmChipActive, { flex: 1, alignItems: 'center' }]}
                  onPress={() => setSelectedSeatQuota(q)}
                >
                  <Text style={[styles.quickAlarmChipText, selectedSeatQuota === q && styles.quickAlarmChipTextActive]}>
                    {q === 'GN' ? 'General' : q === 'TQ' ? 'Tatkal' : 'Ladies'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>TRAVEL CLASS</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {(['2S', 'CC', 'SL', '3A', '2A'] as const).map((cls) => (
                <TouchableOpacity
                  key={cls}
                  style={[styles.quickAlarmChip, selectedSeatClass === cls && styles.quickAlarmChipActive, { flex: 1, alignItems: 'center' }]}
                  onPress={() => setSelectedSeatClass(cls)}
                >
                  <Text style={[styles.quickAlarmChipText, selectedSeatClass === cls && styles.quickAlarmChipTextActive]}>{cls}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>CONFIRMATION STATUS</Text>
            <View style={{ gap: 8 }}>
              {[
                { num: '64076', name: 'New Delhi - Palwal EMU', status: 'AVAILABLE-0248', fare: '₹30', color: '#16A34A', bg: '#DCFCE7' },
                { num: '64074', name: 'New Delhi - Kosi Kalan EMU', status: 'AVAILABLE-0185', fare: '₹30', color: '#16A34A', bg: '#DCFCE7' },
                { num: '64082', name: 'New Delhi - Palwal EMU', status: 'AVAILABLE-0312', fare: '₹30', color: '#16A34A', bg: '#DCFCE7' },
                { num: '12002', name: 'Bhopal Shatabdi Express', status: 'AVAILABLE-0042', fare: '₹385', color: '#16A34A', bg: '#DCFCE7' },
              ].map((item) => (
                <View
                  key={item.num}
                  style={[styles.trackedRowCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.trackedTrainTitle, { color: colors.textPrimary }]}>
                      <Text style={styles.trackedTrainBoldNum}>{item.num} </Text>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      Class: <Text style={{ fontWeight: '700' }}>{selectedSeatClass}</Text> • Fare: <Text style={{ fontWeight: '700', color: Colors.primary }}>{item.fare}</Text>
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: item.bg }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: item.color }}>{item.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* 4. SEAT GAPS / SPLIT JOURNEY MODAL */}
    <Modal
      visible={showSeatGapsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSeatGapsModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalSheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.alarmIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="swap-horizontal" size={20} color={Colors.primary} />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>Seat Gaps & Split Journey</Text>
                <Text style={[styles.modalSheetSub, { color: colors.textSecondary }]}>Find confirmed seats by split-booking vacant legs</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowSeatGapsModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={[styles.gpsInfoBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={[styles.gpsInfoText, { color: '#15803D' }]}>
                Direct tickets showing Waiting List? Our smart algorithm combines vacant legs on the same train so you get 100% confirmed berths!
              </Text>
            </View>

            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>OPTIMIZED ROUTE SPLIT</Text>
            <View style={[styles.trackedRowCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.trackedTrainBoldNum, { color: colors.textPrimary }]}>Leg 1: New Delhi ➔ Kanpur Central</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>CONFIRMED (C1-32)</Text>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={[styles.trackedTrainBoldNum, { color: colors.textPrimary }]}>Leg 2: Kanpur Central ➔ Lucknow Charbagh</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>CONFIRMED (C1-32)</Text>
              </View>
            </View>

            <View style={{ marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>Benefit of Seat Gaps:</Text>
              <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 4 }}>• Same coach and same berth across both legs</Text>
              <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }}>• No need to shift luggage or change trains</Text>
              <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }}>• 100% compliant with IRCTC multi-ticket rules</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* 5. RESERVATION CHART STATUS MODAL */}
    <Modal
      visible={showResChartModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowResChartModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalSheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.alarmIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="reader" size={20} color={Colors.primary} />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>IRCTC Reservation Chart Status</Text>
                <Text style={[styles.modalSheetSub, { color: colors.textSecondary }]}>Vacant berths and charting timetable</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowResChartModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={[styles.gpsInfoBox, { backgroundColor: '#EFF6FF', borderColor: '#BAE6FD' }]}>
              <Ionicons name="information-circle" size={18} color="#0284C7" style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={[styles.gpsInfoText, { color: '#0369A1' }]}>
                First chart is prepared 4 hours prior to origin departure. Second chart is finalized 30 minutes before departure for current booking.
              </Text>
            </View>

            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>CURRENT CHARTING STATUS</Text>
            <View style={{ gap: 8 }}>
              {[
                { num: '64076', name: 'New Delhi - Palwal EMU', chartStatus: 'CHART PREPARED', berths: '92 Vacant Berths' },
                { num: '64074', name: 'New Delhi - Kosi Kalan EMU', chartStatus: 'CHART NOT PREPARED', berths: 'Chart in 2h 45m' },
                { num: '12002', name: 'Bhopal Shatabdi', chartStatus: 'CHART PREPARED', berths: '14 Vacant Berths (CC)' },
              ].map((item) => (
                <View
                  key={item.num}
                  style={[styles.trackedRowCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.trackedTrainTitle, { color: colors.textPrimary }]}>
                      <Text style={styles.trackedTrainBoldNum}>{item.num} </Text>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '700', marginTop: 2 }}>
                      {item.berths}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: item.chartStatus.includes('NOT') ? '#FEF3C7' : '#DCFCE7' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: item.chartStatus.includes('NOT') ? '#D97706' : '#15803D' }}>
                      {item.chartStatus}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* 6. FAVORITES MODAL */}
    <Modal
      visible={showFavoritesModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFavoritesModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalSheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.alarmIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="star" size={20} color="#EAB308" />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>Saved Trains & Routes</Text>
                <Text style={[styles.modalSheetSub, { color: colors.textSecondary }]}>One-tap live tracking for your daily commute</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowFavoritesModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ gap: 8 }}>
              {DEFAULT_RECENTLY_TRACKED.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.trackedRowCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}
                  onPress={() => {
                    setShowFavoritesModal(false);
                    handleSpotTrain(t.trainNumber, t.trainName);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.trackedTrainTitle, { color: colors.textPrimary }]}>
                      <Text style={styles.trackedTrainBoldNum}>{t.trainNumber} </Text>
                      {t.trainName}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{t.fromCode} ➔ {t.toCode} • Daily Commute</Text>
                  </View>
                  <Ionicons name="navigate-circle" size={24} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>
);
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#F0F7FD',
    position: 'relative',
  },
  topCenterToastBox: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 12 : 16,
    left: 16,
    right: 16,
    zIndex: 999999,
    elevation: 25,
    backgroundColor: '#DC2626', // Vibrant modern red
    borderRadius: 12, // Rounded rectangle
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  topToastIconContainer: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topToastText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  modernSearchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 14,
  },
  spotTrainCard: {
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
  },
  spotCardHeader: {
    marginBottom: 8,
  },
  spotCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  spotInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 3,
  },
  spotInputTrainIcon: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotTextInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    paddingVertical: 6,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { outlineWidth: 0, outlineStyle: 'none' } : {}),
  } as any,
  spotClearBtn: {
    padding: 6,
    marginRight: 4,
  },
  greenSearchBox: {
    borderRadius: 9,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
  },
  spotDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginTop: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  dropdownBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 10,
    minWidth: 48,
    alignItems: 'center',
  },
  dropdownBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dropdownItemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownItemLocation: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  stationRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 30,
    borderRadius: 12,
  },
  leftTrackColumn: {
    position: 'absolute',
    left: 14,
    top: 26,
    height: 78,
    width: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  stationDotSource: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#DCFCE7',
  },
  stationDotDest: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  dottedTrackLine: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 3,
    width: 20,
    position: 'relative',
  },
  trackDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#94A3B8',
  },
  movingTrainBadge: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    zIndex: 10,
  },
  stationIndicatorCircleBlue: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stationIndicatorCircleBlack: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stationCodeBadgeSolid: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    marginRight: 10,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationCodeBadgeSolidText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  stationRowError: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
    paddingLeft: 6,
  },
  stationIndicatorCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sourceDotPulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceDotInner: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  destDotPulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destDotInner: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  stationDetailsCol: {
    flex: 1,
  },
  stationMicroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stationInputLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationModernInput: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { outlineWidth: 0, outlineStyle: 'none' } : {}),
  } as any,
  stationCodeBadge: {
    backgroundColor: '#E0F2FE',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    marginRight: 6,
  },
  stationCodeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  clearStationBtn: {
    padding: 6,
    marginLeft: 4,
  },
  singleDotColumn: {
    position: 'absolute',
    left: 14,
    top: 21,
    width: 14,
    alignItems: 'center',
    zIndex: 5,
  },
  popularHubsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  popularHubsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  popularHubsChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 6,
  },
  popularHubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  popularHubCode: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#007AFF',
    marginRight: 4,
  },
  popularHubName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  inlineDropdownCard: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    maxHeight: 230,
    overflow: 'hidden',
  },
  inlineDropdownScroll: {
    maxHeight: 230,
  },
  inlineDropdownContent: {
    paddingVertical: 2,
  },
  stationDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stationDropdownCodeBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  stationDropdownCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  stationDropdownName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  stationDropdownLocation: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  noResultsBox: {
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  redErrorBoxPopup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#B91C1C',
    borderRadius: 8, // Crisp square-like box
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  redErrorIconContainer: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redErrorBoxText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  validationErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  validationErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 6,
  },
  modernDividerRow: {
    position: 'relative',
    justifyContent: 'center',
    height: 18,
    marginVertical: 4,
    zIndex: 10,
  },
  modernDividerLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 34,
    marginRight: 56,
  },
  modernSwapBtn: {
    position: 'absolute',
    right: 12,
    top: -9,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    zIndex: 20,
  },
  modernFindTrainsBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.searchBtnGreen,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: Colors.searchBtnGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  modernFindTrainsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quickServicesMasterContainer: {
    marginVertical: 14,
  },
  quickRowFour: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  quickTile: {
    width: '23%',
    alignItems: 'center',
  },
  quickTileIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickTileLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  recentlyTrackedSection: {
    marginBottom: 16,
  },
  recentlyTrackedTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  trackedRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  trackedRowLeft: {
    flex: 1,
    paddingRight: 8,
  },
  trackedTrainTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  trackedTrainBoldNum: {
    fontWeight: '800',
  },
  trackedRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackedRouteBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  promoCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  promoContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  promoTextCol: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  promoStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoStatBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  promoStatText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  promoDotSeparator: {
    marginHorizontal: 4,
    color: '#94A3B8',
    fontSize: 10,
  },
  promoRatingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  promoRatingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  promoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 8,
  },
  promoActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  clearText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  gridItem: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  gridItemSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  liveIndicatorText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.3,
  },
  alarmActivePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  alarmActivePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#16A34A',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentRoute: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  recentSub: {
    fontSize: 11.5,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyRecentBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyRecentText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  alarmActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E', // Modern teal for destination safety
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 14,
    marginBottom: 16,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  alarmBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alarmBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 6,
  },
  alarmLivePill: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  alarmLivePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  alarmBannerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  alarmDismissBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  alarmDismissText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    maxHeight: '85%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 14,
  },
  alarmIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSheetTitle: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  modalSheetSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputFieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  modalTextInput: {
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  quickAlarmStationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  quickAlarmChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickAlarmChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  quickAlarmChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  quickAlarmChipTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  leadTimeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  leadTimeItem: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadTimeItemActive: {
    borderColor: '#0284C7',
    backgroundColor: '#EFF6FF',
  },
  leadTimeMins: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  leadTimeMinsActive: {
    color: '#0284C7',
  },
  leadTimeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  leadTimeLabelActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  vibrateToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  vibrateTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  vibrateSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  gpsInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  gpsInfoText: {
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 16,
    flex: 1,
  },
  activateAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  activateAlarmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cancelAlarmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelAlarmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
});
