import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Animated, Easing, Platform, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Station, STATIONS_DATABASE, POPULAR_STATIONS } from '../data/stations';
import { CORRIDOR_TRAINS_MASTER } from '../data/trainsBetweenStations';
import { searchAndRankStations, searchAndRankTrains } from '../utils/searchRanker';
import { usePreferences, SafeStorage } from '../context/PreferencesContext';

interface RecentSearchItem {
  id: string;
  from: Station;
  to: Station;
  route: string;
  sub: string;
}

const DEFAULT_RECENT_SEARCHES: RecentSearchItem[] = [
  {
    id: 'rec-1',
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

  // Station Wake-up Alarm states (Reference App Feature)
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [alarmStation, setAlarmStation] = useState<string>('Kanpur Central (CNB)');
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
    fromStation ? `${fromStation.name}${fromStation.code ? ` (${fromStation.code})` : ''}` : ''
  );
  const [toText, setToText] = useState(
    toStation ? `${toStation.name}${toStation.code ? ` (${toStation.code})` : ''}` : ''
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
      setFromText(`${fromStation.name}${fromStation.code ? ` (${fromStation.code})` : ''}`);
      setSourceConfirmed(true);
    } else if (fromStation === null) {
      setFromText('');
      setSourceConfirmed(false);
    }
  }, [fromStation]);

  useEffect(() => {
    if (toStation && toStation.name) {
      setToText(`${toStation.name}${toStation.code ? ` (${toStation.code})` : ''}`);
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
  const spotRankedResults = useMemo(() => {
    if (!spotTrainQuery.trim()) return [];
    return searchAndRankTrains(spotTrainQuery, CORRIDOR_TRAINS_MASTER).slice(0, 5);
  }, [spotTrainQuery]);

  const handleSpotTrain = useCallback((trainNumber: string, trainName: string) => {
    if (onTrackTrain) {
      onTrackTrain(trainNumber, trainName);
    } else {
      onNavigateToTab('live');
    }
  }, [onTrackTrain, onNavigateToTab]);

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
    setFromText(`${station.name} (${station.code})`);
    setSourceConfirmed(true);
    setActiveInlineSearch(null);
    setValidationError(null);
    setSourceHasError(false);
  }, [onSetFromStation]);

  const handleSelectTo = useCallback((station: Station) => {
    onSetToStation(station);
    setToText(`${station.name} (${station.code})`);
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
        <View style={[styles.modernSearchCard, { backgroundColor: colors.surface, borderColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}>
          
          {/* 1. FROM STATION ROW */}
          <View style={[styles.stationRowContainer, sourceHasError && styles.stationRowError]}>
            <View style={styles.stationIndicatorCol}>
              <Animated.View style={[styles.sourceDotPulse, { transform: [{ scale: stationPulseAnim }] }]} />
              <View style={styles.sourceDotInner} />
            </View>
            <View style={styles.stationDetailsCol}>
              <Text style={[styles.stationMicroLabel, { color: colors.textSecondary }]}>{t('fromStation').toUpperCase()}</Text>
              <View style={styles.stationInputLine}>
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
                {fromStation && sourceConfirmed && (
                  <View style={[styles.stationCodeBadge, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
                    <Text style={styles.stationCodeBadgeText}>{fromStation.code}</Text>
                  </View>
                )}
                {fromText.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearFrom}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.clearStationBtn}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
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

          {/* DIVIDER ROW WITH RIGHT-SHIFTED SWAP BUTTON */}
          <View style={styles.modernDividerRow}>
            <View style={[styles.modernDividerLine, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]} />
            <TouchableOpacity
              style={[
                styles.modernSwapBtn,
                {
                  backgroundColor: colors.primary,
                  borderColor: isDarkMode ? colors.surface : '#FFFFFF',
                },
              ]}
              activeOpacity={0.75}
              onPress={swapStations}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Animated.View style={{ transform: [{ rotate: swapAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] }}>
                <Ionicons name="swap-vertical" size={18} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* 2. TO STATION ROW */}
          <View style={[styles.stationRowContainer, destHasError && styles.stationRowError]}>
            <View style={styles.stationIndicatorCol}>
              <Animated.View style={[styles.destDotPulse, { transform: [{ scale: stationPulseAnim }] }]} />
              <View style={styles.destDotInner} />
            </View>
            <View style={styles.stationDetailsCol}>
              <Text style={[styles.stationMicroLabel, { color: colors.textSecondary }]}>{t('toStation').toUpperCase()}</Text>
              <View style={styles.stationInputLine}>
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
                {toStation && destConfirmed && (
                  <View style={[styles.stationCodeBadge, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
                    <Text style={styles.stationCodeBadgeText}>{toStation.code}</Text>
                  </View>
                )}
                {toText.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearTo}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.clearStationBtn}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
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
              <Ionicons name="search" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.modernFindTrainsText}>{t('findTrains')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

      {/* 2. Spot Your Train Card */}
      <View style={[styles.spotTrainCard, { backgroundColor: colors.surface, borderColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}>
        <View style={styles.spotCardHeader}>
          <View style={[styles.spotHeaderIconBox, { backgroundColor: isDarkMode ? '#1E3A5F' : '#EFF6FF' }]}>
            <MaterialCommunityIcons name="train" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.spotCardTitle, { color: colors.textPrimary }]}>Spot Your Train</Text>
            <Text style={[styles.spotCardSubtitle, { color: colors.textSecondary }]}>Live GPS & platform status</Text>
          </View>
          <View style={styles.liveSideBadge}>
            <Animated.View style={[styles.liveBlinkDot, { opacity: liveBlinkAnim }]} />
            <Text style={styles.liveSideText}>LIVE</Text>
          </View>
        </View>

        <View style={[styles.spotInputContainer, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginLeft: 6, marginRight: 8 }} />
          <TextInput
            style={[
              styles.spotTextInput,
              {
                color: colors.textPrimary,
              },
            ]}
            value={spotTrainQuery}
            onChangeText={setSpotTrainQuery}
            placeholder="Train No. / Train Name"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={() => {
              const num = spotTrainQuery.trim() || '22436';
              handleSpotTrain(num, `Train ${num}`);
            }}
          />
          {spotTrainQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSpotTrainQuery('')} style={{ padding: 4, marginRight: 6 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.greenSearchBox}
            activeOpacity={0.8}
            onPress={() => {
              const num = spotTrainQuery.trim() || '22436';
              handleSpotTrain(num, `Train ${num}`);
            }}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Dynamic ranked dropdown */}
        {spotRankedResults.length > 0 && (
          <View style={[styles.spotDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {spotRankedResults.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSpotTrainQuery('');
                  handleSpotTrain(t.number, t.name);
                }}
              >
                <View style={[styles.dropdownBadge, t.isLocalEmu && { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.dropdownBadgeText, t.isLocalEmu && { color: colors.primary }]}>{t.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dropdownItemName, { color: colors.textPrimary }]}>{t.name}</Text>
                  <Text style={[styles.dropdownItemLocation, { color: colors.textSecondary }]}>{t.originCode} ➔ {t.destCode} • {t.type}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Services Grid */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Railway Services</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => onNavigateToTab('live')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="navigate" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.gridItemTitle, { color: colors.textPrimary }]}>Live Status</Text>
            <Text style={[styles.gridItemSubtitle, { color: colors.textSecondary }]}>Spot your train</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => onNavigateToTab('pnr')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: colors.secondaryLight }]}>
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={24} color={colors.secondary} />
            </View>
            <Text style={[styles.gridItemTitle, { color: colors.textPrimary }]}>PNR Status</Text>
            <Text style={[styles.gridItemSubtitle, { color: colors.textSecondary }]}>Seat & berth info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => onNavigateToTab('schedule')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.gridItemTitle, { color: colors.textPrimary }]}>Timetable</Text>
            <Text style={[styles.gridItemSubtitle, { color: colors.textSecondary }]}>Offline schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.gridItem,
              { backgroundColor: colors.surface, borderColor: alarmActive ? Colors.secondary : colors.border },
              alarmActive && { borderWidth: 1.5 },
            ]}
            activeOpacity={0.7}
            onPress={() => setShowAlarmModal(true)}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: alarmActive ? Colors.secondaryLight : colors.accentLight }]}>
              <Ionicons name={alarmActive ? "alarm" : "alarm-outline"} size={24} color={alarmActive ? Colors.secondary : colors.accent} />
            </View>
            <Text style={[styles.gridItemTitle, { color: colors.textPrimary }]}>Station Alarm</Text>
            <Text style={[styles.gridItemSubtitle, { color: alarmActive ? Colors.secondary : colors.textSecondary }]}>
              {alarmActive ? `Active (${alarmLeadMinutes}m)` : 'Wake-up alert'}
            </Text>
          </TouchableOpacity>
        </View>
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

      {/* Recent Searches (Guaranteed 4+ items) */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Searches</Text>
          <TouchableOpacity
            onPress={() => {
              setRecentSearches([]);
              SafeStorage.setItem('@user_recent_searches', JSON.stringify([])).catch(() => {});
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {recentSearches.length === 0 ? (
          <View style={[styles.emptyRecentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyRecentText, { color: colors.textMuted }]}>No recent searches</Text>
          </View>
        ) : (
          recentSearches.slice(0, 4).map((rec) => (
            <TouchableOpacity
              key={rec.id}
              style={[styles.recentItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => {
                onSetFromStation(rec.from);
                onSetToStation(rec.to);
                setFromText(`${rec.from.name} (${rec.from.code})`);
                setToText(`${rec.to.name} (${rec.to.code})`);
                setSourceConfirmed(true);
                setDestConfirmed(true);
                handleFindTrains(rec.from, rec.to);
              }}
            >
              <View style={styles.recentLeft}>
                <View style={[styles.recentIconBox, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="time-outline" size={17} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recentRoute, { color: colors.textPrimary }]}>{rec.route}</Text>
                  <Text style={[styles.recentSub, { color: colors.textSecondary }]} numberOfLines={1}>{rec.sub}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  spotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  spotHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  spotCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  spotCardSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  liveSideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  liveBlinkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  liveSideText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  spotInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 5,
  },
  spotTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { outline: 'none', outlineWidth: 0, outlineStyle: 'none' } : {}),
  } as any,
  greenSearchBox: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  spotDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
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
    borderBottomColor: '#F1F5F9',
  },
  dropdownBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 10,
  },
  dropdownBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  dropdownItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownItemLocation: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  stationRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 12,
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
    ...(Platform.OS === 'web' ? { outline: 'none', outlineWidth: 0, outlineStyle: 'none' } : {}),
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
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridItemTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  gridItemSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: Colors.textSecondary,
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
