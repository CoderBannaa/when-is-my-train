import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Animated, Easing, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Station, STATIONS_DATABASE, POPULAR_STATIONS } from '../data/stations';
import { CORRIDOR_TRAINS_MASTER } from '../data/trainsBetweenStations';
import { searchAndRankStations, searchAndRankTrains } from '../utils/searchRanker';

interface HomeScreenProps {
  onNavigateToTab: (tab: 'live' | 'pnr' | 'schedule') => void;
  onSearchTrains: (from: Station, to: Station, date: string) => void;
  onTrackTrain?: (trainNumber: string, trainName: string) => void;
  fromStation: Station | null;
  toStation: Station | null;
  onSetFromStation: (station: Station | null) => void;
  onSetToStation: (station: Station | null) => void;
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sourceHasError, setSourceHasError] = useState(false);
  const [destHasError, setDestHasError] = useState(false);

  // Free text typing states (User has complete freedom to type any text, never blocked or cleared)
  const [fromText, setFromText] = useState(
    fromStation ? `${fromStation.name}${fromStation.code ? ` (${fromStation.code})` : ''}` : ''
  );
  const [toText, setToText] = useState(
    toStation ? `${toStation.name}${toStation.code ? ` (${toStation.code})` : ''}` : ''
  );

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
  }, [fromText, toText, sourceConfirmed, destConfirmed, fromStation, toStation, onSetFromStation, onSetToStation]);

  // Validation performed STRICTLY on "FIND TRAINS" click covering all edge cases
  const handleFindTrains = useCallback((overrideFrom?: any, overrideTo?: any) => {
    setActiveInlineSearch(null);

    let validSource: Station | null = null;
    let validDest: Station | null = null;

    if (overrideFrom && typeof overrideFrom === 'object' && overrideFrom.code && overrideFrom.name) {
      validSource = overrideFrom;
    } else if (sourceConfirmed && fromStation) {
      validSource = fromStation;
    }

    if (overrideTo && typeof overrideTo === 'object' && overrideTo.code && overrideTo.name) {
      validDest = overrideTo;
    } else if (destConfirmed && toStation) {
      validDest = toStation;
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
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const todayStr = `Today, ${now.getDate()} ${months[now.getMonth()]}`;
        onSearchTrains(validSource, validDest, todayStr);
      }
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
    <View style={styles.screenRoot}>
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
        <View style={styles.searchCard}>
        <View style={styles.unifiedStationBox}>
          {/* Animated Dotted Track Column on Left Extreme */}
          <View style={[styles.leftTrackColumn, { pointerEvents: 'none' as const }]}>
            <View style={styles.stationDotSource} />
            <View style={styles.dottedTrackLine}>
              <View style={styles.trackDot} />
              <View style={styles.trackDot} />
              <View style={styles.trackDot} />
              <View style={styles.trackDot} />
              <View style={styles.trackDot} />
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

          {/* 1. FROM STATION ROW (Freely editable input) */}
          <View style={[styles.stationInputRow, sourceHasError && styles.stationInputRowError]}>
            <View style={styles.stationInputContent}>
              <TextInput
                style={styles.stationTextInput}
                value={fromText}
                onChangeText={handleFromChangeText}
                onFocus={() => {
                  setActiveInlineSearch('from');
                  setValidationError(null);
                  setSourceHasError(false);
                }}
                placeholder="Source Station"
                placeholderTextColor="#94A3B8"
              />
              {fromText.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearFrom}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.clearStationBtn}
                >
                  <Ionicons name="close-circle" size={19} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* DROPDOWN JUST BELOW SOURCE ROW - only visible if matches exist */}
          {activeInlineSearch === 'from' && fromText.trim().length > 0 && fromRankedResults.length > 0 && (
            <View style={styles.inlineDropdownCard}>
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
                    style={styles.stationDropdownItem}
                    activeOpacity={0.7}
                    onPress={() => handleSelectFrom(st)}
                  >
                    <View style={styles.stationDropdownCodeBadge}>
                      <Text style={styles.stationDropdownCodeText}>{st.code}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stationDropdownName}>{st.name}</Text>
                      <Text style={styles.stationDropdownLocation}>
                        {st.city === st.state ? st.city : `${st.city}, ${st.state}`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Divider line with Swap button */}
          <View style={styles.dividerWrapper}>
            <View style={styles.dividerLine} />
            <TouchableOpacity
              style={styles.swapBtnOnLine}
              activeOpacity={0.7}
              onPress={swapStations}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="swap-vertical" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* 2. TO STATION ROW (Freely editable input) */}
          <View style={[styles.stationInputRow, destHasError && styles.stationInputRowError]}>
            <View style={styles.stationInputContent}>
              <TextInput
                style={styles.stationTextInput}
                value={toText}
                onChangeText={handleToChangeText}
                onFocus={() => {
                  setActiveInlineSearch('to');
                  setValidationError(null);
                  setDestHasError(false);
                }}
                placeholder="Destination"
                placeholderTextColor="#94A3B8"
              />
              {toText.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearTo}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.clearStationBtn}
                >
                  <Ionicons name="close-circle" size={19} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* DROPDOWN JUST BELOW DESTINATION ROW - only visible if matches exist */}
          {activeInlineSearch === 'to' && toText.trim().length > 0 && toRankedResults.length > 0 && (
            <View style={styles.inlineDropdownCard}>
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
                    style={styles.stationDropdownItem}
                    activeOpacity={0.7}
                    onPress={() => handleSelectTo(st)}
                  >
                    <View style={styles.stationDropdownCodeBadge}>
                      <Text style={styles.stationDropdownCodeText}>{st.code}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stationDropdownName}>{st.name}</Text>
                      <Text style={styles.stationDropdownLocation}>
                        {st.city === st.state ? st.city : `${st.city}, ${st.state}`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Search Action Button */}
        <TouchableOpacity style={styles.searchButton} activeOpacity={0.85} onPress={() => handleFindTrains()}>
          <Ionicons name="search" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.searchButtonText}>FIND TRAINS</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Spot Your Train Card */}
      <View style={styles.spotTrainCard}>
        <View style={styles.spotCardHeader}>
          <Text style={styles.spotCardTitle}>Spot Your Train</Text>
          <View style={styles.liveSideBadge}>
            <Animated.View style={[styles.liveBlinkDot, { opacity: liveBlinkAnim }]} />
            <Text style={styles.liveSideText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.spotInputContainer}>
          <MaterialCommunityIcons name="train" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.spotTextInput}
            value={spotTrainQuery}
            onChangeText={setSpotTrainQuery}
            placeholder="Train No./ Train Name"
            placeholderTextColor="#94A3B8"
            onSubmitEditing={() => {
              const num = spotTrainQuery.trim() || '05379';
              handleSpotTrain(num, `Train ${num}`);
            }}
          />
          {spotTrainQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSpotTrainQuery('')} style={{ padding: 4, marginRight: 6 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.greenSearchBox}
            activeOpacity={0.8}
            onPress={() => {
              const num = spotTrainQuery.trim() || '05379';
              handleSpotTrain(num, `Train ${num}`);
            }}
          >
            <Ionicons name="search" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Dynamic ranked dropdown */}
        {spotRankedResults.length > 0 && (
          <View style={styles.spotDropdown}>
            {spotRankedResults.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSpotTrainQuery('');
                  handleSpotTrain(t.number, t.name);
                }}
              >
                <View style={[styles.dropdownBadge, t.isLocalEmu && { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.dropdownBadgeText, t.isLocalEmu && { color: '#0284C7' }]}>{t.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownItemName}>{t.name}</Text>
                  <Text style={styles.dropdownItemLocation}>{t.originCode} ➔ {t.destCode} • {t.type}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Services Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Railway Services</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => onNavigateToTab('live')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: Colors.primarySoft }]}>
              <Ionicons name="navigate" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.gridItemTitle}>Live Status</Text>
            <Text style={styles.gridItemSubtitle}>Spot your train</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => onNavigateToTab('pnr')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: Colors.secondaryLight }]}>
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={24} color={Colors.secondary} />
            </View>
            <Text style={styles.gridItemTitle}>PNR Status</Text>
            <Text style={styles.gridItemSubtitle}>Seat & berth info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => onNavigateToTab('schedule')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: Colors.primarySoft }]}>
              <Ionicons name="time-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.gridItemTitle}>Timetable</Text>
            <Text style={styles.gridItemSubtitle}>Offline schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <View style={[styles.gridIconCircle, { backgroundColor: Colors.accentLight }]}>
              <Ionicons name="alarm-outline" size={24} color={Colors.accent} />
            </View>
            <Text style={styles.gridItemTitle}>Station Alarm</Text>
            <Text style={styles.gridItemSubtitle}>Wake-up alert</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Searches */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <TouchableOpacity>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.recentItem}
          activeOpacity={0.7}
          onPress={() => {
            const f = { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' };
            const t = { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh' };
            onSetFromStation(f);
            onSetToStation(t);
            setFromText(`${f.name} (${f.code})`);
            setToText(`${t.name} (${t.code})`);
            setSourceConfirmed(true);
            setDestConfirmed(true);
            handleFindTrains(f, t);
          }}
        >
          <View style={styles.recentLeft}>
            <View style={styles.recentIconBox}>
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.recentRoute}>NDLS ➔ CNB</Text>
              <Text style={styles.recentSub}>New Delhi to Kanpur Central</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.recentItem}
          activeOpacity={0.7}
          onPress={() => {
            const f = { code: 'BSB', name: 'Varanasi Junction', city: 'Varanasi', state: 'Uttar Pradesh' };
            const t = { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' };
            onSetFromStation(f);
            onSetToStation(t);
            setFromText(`${f.name} (${f.code})`);
            setToText(`${t.name} (${t.code})`);
            setSourceConfirmed(true);
            setDestConfirmed(true);
            handleFindTrains(f, t);
          }}
        >
          <View style={styles.recentLeft}>
            <View style={styles.recentIconBox}>
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.recentRoute}>BSB ➔ NDLS</Text>
              <Text style={styles.recentSub}>Varanasi Jn to New Delhi</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>



      <View style={{ height: 30 }} />
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  spotTrainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  spotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveSideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  liveBlinkDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
    marginRight: 5,
  },
  liveSideText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  spotCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  spotInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  spotTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
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
    marginBottom: 16,
  },
  dateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
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
});
