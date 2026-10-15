import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Animated, Easing, Platform } from 'react-native';
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

    // Edge Case 8: Source aur Destination same station select kare
    if (validSource && validDest && validSource.code === validDest.code) {
      setSourceHasError(true);
      setDestHasError(true);
      showErrorPopup('Source and Destination cannot be the same.');
      return;
    }

    // Edge Case 9: Dono valid stations hain! Search proceed
    if (validSource && validDest) {
      setValidationError(null);
      setSourceHasError(false);
      setDestHasError(false);
      onSetFromStation(validSource);
      onSetToStation(validDest);

      if (onSearchTrains) {
        const selectedOpt = dateOptions.find((d) => d.key === selectedDateOption) || dateOptions[0];
        const travelDateStr = `${selectedOpt.label}, ${selectedOpt.dateStr}`;
        
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
    }
  }, [
    fromStation,
    toStation,
    fromText,
    toText,
    sourceConfirmed,
    destConfirmed,
    selectedDateOption,
    dateOptions,
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
        {/* Search Card */}
        <View style={[styles.searchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.unifiedStationBox, { backgroundColor: isDarkMode ? colors.cardSecondary : '#F8FAFC', borderColor: colors.border }]}>
            {/* Animated Dotted Track Column on Left Extreme */}
            <View style={[styles.leftTrackColumn, { pointerEvents: 'none' as const }]}>
              <View style={styles.stationDotSource} />
              <View style={styles.dottedTrackLine}>
                <View style={[styles.trackDot, { backgroundColor: isDarkMode ? '#475569' : '#94A3B8' }]} />
                <View style={[styles.trackDot, { backgroundColor: isDarkMode ? '#475569' : '#94A3B8' }]} />
                <View style={[styles.trackDot, { backgroundColor: isDarkMode ? '#475569' : '#94A3B8' }]} />
                <View style={[styles.trackDot, { backgroundColor: isDarkMode ? '#475569' : '#94A3B8' }]} />
                <View style={[styles.trackDot, { backgroundColor: isDarkMode ? '#475569' : '#94A3B8' }]} />
                <Animated.View
                  style={[
                    styles.movingTrainBadge,
                    {
                      transform: [{ translateY: trainTranslateY }],
                      opacity: trainOpacity,
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="train" size={13} color={Colors.primary} />
                </Animated.View>
              </View>
              <View style={styles.stationDotDest} />
            </View>

            {/* 1. FROM STATION ROW */}
            <View
              style={[
                styles.stationInputRow,
                sourceHasError && styles.stationInputRowError,
                activeInlineSearch === 'from' && [
                  styles.stationInputRowActive,
                  { backgroundColor: isDarkMode ? '#1E293B' : '#F0F9FF' },
                ],
              ]}
            >
              <View style={styles.stationInputContent}>
                <TextInput
                  style={[
                    styles.stationTextInput,
                    {
                      color: colors.textPrimary,
                      outline: 'none',
                      outlineWidth: 0,
                      outlineStyle: 'none',
                      borderWidth: 0,
                    } as any,
                  ]}
                  value={fromText}
                  onChangeText={handleFromChangeText}
                  onFocus={() => {
                    setActiveInlineSearch('from');
                    setValidationError(null);
                    setSourceHasError(false);
                  }}
                  placeholder={t('fromStation')}
                  placeholderTextColor={colors.textMuted}
                />
                {fromStation && sourceConfirmed && (
                  <View style={[styles.confirmedCodePill, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
                    <Text style={styles.confirmedCodePillText}>{fromStation.code}</Text>
                  </View>
                )}
                {fromText.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearFrom}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.clearStationBtn}
                  >
                    <Ionicons name="close-circle" size={19} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* DROPDOWN / POPULAR HUBS FOR FROM STATION */}
            {activeInlineSearch === 'from' && (
              fromText.trim().length === 0 ? (
                /* Popular Hubs Fast Tap Chips */
                <View style={[styles.inlineDropdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.popularHubsHeader}>
                    <Ionicons name="flash-outline" size={14} color="#007AFF" style={{ marginRight: 5 }} />
                    <Text style={[styles.popularHubsTitle, { color: colors.textSecondary }]}>Popular Stations (Tap to select)</Text>
                  </View>
                  <View style={styles.popularHubsChipsContainer}>
                    {POPULAR_STATIONS.slice(0, 8).map((st) => (
                      <TouchableOpacity
                        key={`from-pop-${st.code}`}
                        style={[styles.popularHubChip, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
                        activeOpacity={0.7}
                        onPress={() => handleSelectFrom(st)}
                      >
                        <Text style={styles.popularHubCode}>{st.code}</Text>
                        <Text style={[styles.popularHubName, { color: colors.textPrimary }]}>{st.city || st.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : fromRankedResults.length > 0 ? (
                /* Filtered Dropdown list */
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
              ) : null
            )}

            {/* Divider line with Animated Swap button */}
            <View style={styles.dividerWrapper}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={[
                  styles.swapBtnOnLine,
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
            <View
              style={[
                styles.stationInputRow,
                destHasError && styles.stationInputRowError,
                activeInlineSearch === 'to' && [
                  styles.stationInputRowActive,
                  { backgroundColor: isDarkMode ? '#1E293B' : '#F0F9FF' },
                ],
              ]}
            >
              <View style={styles.stationInputContent}>
                <TextInput
                  style={[
                    styles.stationTextInput,
                    {
                      color: colors.textPrimary,
                      outline: 'none',
                      outlineWidth: 0,
                      outlineStyle: 'none',
                      borderWidth: 0,
                    } as any,
                  ]}
                  value={toText}
                  onChangeText={handleToChangeText}
                  onFocus={() => {
                    setActiveInlineSearch('to');
                    setValidationError(null);
                    setDestHasError(false);
                  }}
                  placeholder={t('toStation')}
                  placeholderTextColor={colors.textMuted}
                />
                {toStation && destConfirmed && (
                  <View style={[styles.confirmedCodePill, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
                    <Text style={styles.confirmedCodePillText}>{toStation.code}</Text>
                  </View>
                )}
                {toText.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearTo}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.clearStationBtn}
                  >
                    <Ionicons name="close-circle" size={19} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* DROPDOWN / POPULAR HUBS FOR TO STATION */}
            {activeInlineSearch === 'to' && (
              toText.trim().length === 0 ? (
                /* Popular Hubs Fast Tap Chips */
                <View style={[styles.inlineDropdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.popularHubsHeader}>
                    <Ionicons name="flash-outline" size={14} color="#007AFF" style={{ marginRight: 5 }} />
                    <Text style={[styles.popularHubsTitle, { color: colors.textSecondary }]}>Popular Stations (Tap to select)</Text>
                  </View>
                  <View style={styles.popularHubsChipsContainer}>
                    {POPULAR_STATIONS.filter((s) => s.code !== fromStation?.code).slice(0, 8).map((st) => (
                      <TouchableOpacity
                        key={`to-pop-${st.code}`}
                        style={[styles.popularHubChip, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
                        activeOpacity={0.7}
                        onPress={() => handleSelectTo(st)}
                      >
                        <Text style={styles.popularHubCode}>{st.code}</Text>
                        <Text style={[styles.popularHubName, { color: colors.textPrimary }]}>{st.city || st.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : toRankedResults.length > 0 ? (
                /* Filtered Dropdown list */
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
              ) : null
            )}
          </View>

          {/* Quick Travel Date Selector (Today / Tomorrow / Day After) */}
          <View style={styles.dateRow}>
            {dateOptions.map((opt) => {
              const isSelected = selectedDateOption === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: isSelected
                        ? (isDarkMode ? 'rgba(2, 132, 199, 0.25)' : '#EFF6FF')
                        : (isDarkMode ? '#0F172A' : '#F8FAFC'),
                      borderColor: isSelected
                        ? (isDarkMode ? '#38BDF8' : '#007AFF')
                        : (isDarkMode ? '#334155' : '#E2E8F0'),
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setSelectedDateOption(opt.key as any)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={isSelected ? (isDarkMode ? '#38BDF8' : '#007AFF') : (isDarkMode ? '#94A3B8' : '#64748B')}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.dateChipText,
                      {
                        color: isSelected
                          ? (isDarkMode ? '#38BDF8' : '#007AFF')
                          : (isDarkMode ? '#CBD5E1' : '#475569'),
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {opt.label} • {opt.dateStr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Search Action Button */}
          <TouchableOpacity
            style={[
              styles.searchButton,
              {
                backgroundColor: isDarkMode ? '#059669' : colors.searchBtnGreen,
                borderWidth: isDarkMode ? 1.5 : 0,
                borderColor: isDarkMode ? '#34D399' : 'transparent',
                shadowColor: isDarkMode ? '#10B981' : colors.searchBtnGreen,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => handleFindTrains()}
          >
            <Ionicons name="search" size={19} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.searchButtonText}>{t('findTrains')}</Text>
          </TouchableOpacity>
        </View>

      {/* 2. Spot Your Train Card */}
      <View style={[styles.spotTrainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.spotCardHeader}>
          <Text style={[styles.spotCardTitle, { color: colors.textPrimary }]}>Spot Your Train</Text>
          <View style={styles.liveSideBadge}>
            <Animated.View style={[styles.liveBlinkDot, { opacity: liveBlinkAnim }]} />
            <Text style={styles.liveSideText}>LIVE</Text>
          </View>
        </View>

        <View style={[styles.spotInputContainer, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="train" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <TextInput
            style={[
              styles.spotTextInput,
              {
                color: colors.textPrimary,
                outline: 'none',
                outlineWidth: 0,
                outlineStyle: 'none',
                borderWidth: 0,
              } as any,
            ]}
            value={spotTrainQuery}
            onChangeText={setSpotTrainQuery}
            placeholder="Train No./ Train Name"
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
            <Ionicons name="search" size={18} color="#FFFFFF" />
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

          <TouchableOpacity style={[styles.gridItem, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
            <View style={[styles.gridIconCircle, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="alarm-outline" size={24} color={colors.accent} />
            </View>
            <Text style={[styles.gridItemTitle, { color: colors.textPrimary }]}>Station Alarm</Text>
            <Text style={[styles.gridItemSubtitle, { color: colors.textSecondary }]}>Wake-up alert</Text>
          </TouchableOpacity>
        </View>
      </View>

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
    </ScrollView>
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
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  spotTrainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 14,
  },
  spotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  liveSideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
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
  spotCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  spotInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 4,
  },
  spotTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { outline: 'none', outlineWidth: 0, outlineStyle: 'none' } : {}),
  } as any,
  greenSearchBox: {
    backgroundColor: '#16A34A',
    borderRadius: 9,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
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
  unifiedStationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    marginBottom: 16,
    overflow: 'visible',
  },
  leftTrackColumn: {
    position: 'absolute',
    left: 14,
    top: 18,
    bottom: 18,
    width: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  dottedTrackLine: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 3,
    width: 18,
    position: 'relative',
  },
  trackDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: '#94A3B8',
  },
  movingTrainBadge: {
    position: 'absolute',
    top: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#93C5FD',
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    zIndex: 10,
  },
  stationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 38,
    paddingRight: 10,
    minHeight: 52,
    borderRadius: 12,
  },
  stationInputRowActive: {
    borderRadius: 12,
  },
  stationInputRowError: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  stationFilledContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  stationFilledText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  stationFilledCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  stationInputContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { outline: 'none', outlineWidth: 0, outlineStyle: 'none' } : {}),
  } as any,
  confirmedCodePill: {
    backgroundColor: '#E0F2FE',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 6,
  },
  confirmedCodePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  clearStationBtn: {
    padding: 6,
    marginLeft: 6,
  },
  stationDotSource: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary,
  },
  stationDotDest: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
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
  dividerWrapper: {
    position: 'relative',
    justifyContent: 'center',
    height: 1,
    zIndex: 10,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 36,
    marginRight: 10,
  },
  swapBtnOnLine: {
    position: 'absolute',
    right: 46,
    top: -17,
    width: 34,
    height: 34,
    borderRadius: 17,
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
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 6,
  },
  dateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1,
  },
  dateChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  dateChipTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  searchButton: {
    flexDirection: 'row',
    backgroundColor: Colors.searchBtnGreen,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.searchBtnGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonText: {
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
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  clearText: {
    fontSize: 12,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  gridItemSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentRoute: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  recentSub: {
    fontSize: 11,
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
});
