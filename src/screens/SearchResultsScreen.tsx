import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
  Share,
  Modal,
  Animated,
  Easing,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { TrainBetweenStation, getTrainsBetweenStations } from '../data/trainsBetweenStations';
import { Station } from '../data/stations';
import { usePreferences } from '../context/PreferencesContext';
import { LiveTrainApi } from '../services/liveTrainApiService';

interface SearchResultsScreenProps {
  fromStation: Station;
  toStation: Station;
  selectedDate: string;
  onBack: () => void;
  onTrackTrain: (trainNumber: string, trainName: string, fromStation?: Station, toStation?: Station) => void;
}

type SortOption = 'fastest' | 'early_dep' | 'late_dep' | 'price_low';
type ClassFilter = 'All' | 'SL' | '3A' | '2A' | '1A' | 'CC' | '2S';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function durationToMinutes(durStr: string): number {
  if (!durStr) return 9999;
  let total = 0;
  const hMatch = durStr.match(/(\d+)\s*h/i);
  const mMatch = durStr.match(/(\d+)\s*m/i);
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;
  if (mMatch) total += parseInt(mMatch[1], 10);
  return total || 9999;
}



export interface DynamicDateItem {
  label: string;
  dayLabel: string; // e.g. "Yesterday" | "Today" | "Tomorrow" | "Mon"
  dateStr: string;
  dayFull: string;
  dayShort: string;
  formattedDate: string; // e.g. "Thu, 19 Sep" (No Year)
  isToday?: boolean;
  dayOfWeek: number;
}

export function getDynamicQuickDates(): DynamicDateItem[] {
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const now = new Date();
  const list: DynamicDateItem[] = [];

  // Offsets starting from 0 (Today on far left), 1 (Tomorrow), 2 (Mon), 3 (Tue), etc.
  const offsets = [0, 1, 2, 3, 4, 5, 6];

  for (const offset of offsets) {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    const dayOfWeek = d.getDay();
    const dateNum = d.getDate();
    const month = months[d.getMonth()];
    const dayS = daysShort[dayOfWeek];
    const dayF = daysFull[dayOfWeek];

    let dayLabel = '';
    let label = '';
    if (offset === 0) {
      dayLabel = 'Today';
      label = `Today, ${dateNum} ${month}`;
    } else if (offset === 1) {
      dayLabel = 'Tomorrow';
      label = `Tomorrow, ${dateNum} ${month}`;
    } else {
      dayLabel = dayS;
      label = `${dayS}, ${dateNum} ${month}`;
    }

    list.push({
      label,
      dayLabel,
      dateStr: `${dateNum} ${month}`,
      dayFull: dayF,
      dayShort: dayS,
      formattedDate: `${dayS}, ${dateNum} ${month}`,
      isToday: offset === 0,
      dayOfWeek,
    });
  }
  return list;
}

export const SearchResultsScreen: React.FC<SearchResultsScreenProps> = ({
  fromStation,
  toStation,
  selectedDate,
  onBack,
  onTrackTrain,
}) => {
  const { isDarkMode, colors, t } = usePreferences();
  const dynamicDates = useMemo(() => getDynamicQuickDates(), []);
  const [currentDate, setCurrentDate] = useState(
    selectedDate || dynamicDates.find((d) => d.isToday)?.label || dynamicDates[1]?.label || 'Today'
  );
  const [selectedClassFilter, setSelectedClassFilter] = useState<ClassFilter>('All');
  const [sortBy, setSortBy] = useState<SortOption>('fastest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedClassesMap, setSelectedClassesMap] = useState<{ [trainId: string]: number }>({});
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('Train list copied to clipboard!');

  // Live real-time trains data state
  const [trains, setTrains] = useState<TrainBetweenStation[]>(() =>
    getTrainsBetweenStations(fromStation.code, toStation.code)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveApiData, setIsLiveApiData] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    LiveTrainApi.getTrainsBetweenStations(fromStation.code, toStation.code)
      .then((data) => {
        if (isMounted) {
          setTrains(data);
          setIsLiveApiData(data.length > 0);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTrains(getTrainsBetweenStations(fromStation.code, toStation.code));
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fromStation.code, toStation.code]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await LiveTrainApi.getTrainsBetweenStations(fromStation.code, toStation.code, true);
      setTrains(data);
      setIsLiveApiData(true);
    } catch {
      setTrains(getTrainsBetweenStations(fromStation.code, toStation.code));
    } finally {
      setIsRefreshing(false);
    }
  }, [fromStation.code, toStation.code]);

  const calendarDates = useMemo(() => {
    const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const list: DynamicDateItem[] = [];

    for (let offset = -1; offset < 35; offset++) {
      const d = new Date(now);
      d.setDate(now.getDate() + offset);
      const dayOfWeek = d.getDay();
      const dateNum = d.getDate();
      const month = months[d.getMonth()];
      const dayS = daysShort[dayOfWeek];
      const dayF = daysFull[dayOfWeek];

      let dayLabel = '';
      let label = '';
      if (offset === -1) {
        dayLabel = 'Yesterday';
        label = `Yesterday, ${dateNum} ${month}`;
      } else if (offset === 0) {
        dayLabel = 'Today';
        label = `Today, ${dateNum} ${month}`;
      } else if (offset === 1) {
        dayLabel = 'Tomorrow';
        label = `Tomorrow, ${dateNum} ${month}`;
      } else {
        dayLabel = dayS;
        label = `${dayS}, ${dateNum} ${month}`;
      }

      list.push({
        label,
        dayLabel,
        dateStr: `${dateNum} ${month}`,
        dayFull: dayF,
        dayShort: dayS,
        formattedDate: `${dayS}, ${dateNum} ${month}`,
        isToday: offset === 0,
        dayOfWeek,
      });
    }
    return list;
  }, []);

  const activeDateInfo = useMemo(() => {
    const matched =
      dynamicDates.find((d) => d.label === currentDate || d.dateStr === currentDate || currentDate.includes(d.dateStr)) ||
      calendarDates.find((d) => d.label === currentDate || d.dateStr === currentDate || currentDate.includes(d.dateStr));
    const now = new Date();
    const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (matched) {
      return {
        formattedDate: matched.formattedDate,
        dayName: matched.dayFull,
        dayShort: matched.dayShort,
        date: matched.dateStr,
        dayOfWeek: matched.dayOfWeek,
        isToday: Boolean(matched.isToday),
      };
    }
    return {
      formattedDate: `${daysShort[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`,
      dayName: daysFull[now.getDay()],
      dayShort: daysShort[now.getDay()],
      date: currentDate,
      dayOfWeek: now.getDay(),
      isToday: true,
    };
  }, [currentDate, dynamicDates, calendarDates]);

  const classFilteredTrains = useMemo(() => {
    if (selectedClassFilter === 'All') return trains;
    return trains.filter((t) =>
      t.classes && t.classes.some((c) => c.type.toUpperCase().includes(selectedClassFilter.toUpperCase()))
    );
  }, [trains, selectedClassFilter]);

  const sortedTrains = useMemo(() => {
    const list = [...classFilteredTrains];
    switch (sortBy) {
      case 'fastest':
        return list.sort((a, b) => durationToMinutes(a.duration) - durationToMinutes(b.duration));
      case 'early_dep':
        return list.sort((a, b) => timeToMinutes(a.depTime) - timeToMinutes(b.depTime));
      case 'late_dep':
        return list.sort((a, b) => timeToMinutes(b.depTime) - timeToMinutes(a.depTime));
      case 'price_low':
        return list.sort((a, b) => {
          const minPriceA = Math.min(...a.classes.map((c) => c.price));
          const minPriceB = Math.min(...b.classes.map((c) => c.price));
          return minPriceA - minPriceB;
        });
      default:
        return list;
    }
  }, [classFilteredTrains, sortBy]);

  const handleShareResults = useCallback(async () => {
    const summary = sortedTrains
      .slice(0, 5)
      .map(
        (t) =>
          `• ${t.number} ${t.name}: Dep ${t.depTime} (${fromStation.code}) ➔ Arr ${t.arrTime} (${toStation.code}) • Fare: ₹${t.classes[0]?.price || 120}`
      )
      .join('\n');

    const shareText = `🚆 Trains: ${fromStation.name} (${fromStation.code}) ➔ ${toStation.name} (${toStation.code})
📅 Date: ${currentDate}
Total: ${sortedTrains.length} trains

${summary}

Found on When is my train`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          setCopiedNotification(true);
          setTimeout(() => setCopiedNotification(false), 2500);
        }
      } else {
        await Share.share({
          message: shareText,
          title: `Trains: ${fromStation.code} to ${toStation.code}`,
        });
      }
    } catch {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }
  }, [sortedTrains, fromStation, toStation, currentDate]);

  const handleSelectClass = useCallback((trainId: string, classIndex: number) => {
    setSelectedClassesMap((prev) => ({ ...prev, [trainId]: classIndex }));
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
  }, [screenFadeAnim, screenSlideAnim, currentDate]);

  const getSortLabel = () => {
    switch (sortBy) {
      case 'fastest':
        return 'Fastest';
      case 'early_dep':
        return 'Early Dep.';
      case 'late_dep':
        return 'Late Dep.';
      case 'price_low':
        return 'Lowest Fare';
      default:
        return 'Sort By';
    }
  };

  // Helper for running days: "runs" hata diya gaya hai, sirf days/Daily bachega
  const getRunningDaysInfo = (runsOn: boolean[]) => {
    const runsDaily = runsOn.every(Boolean);
    if (runsDaily) {
      return { isDaily: true, text: 'Daily' };
    }
    const days = runsOn
      .map((runs, idx) => (runs ? DAY_LABELS[idx] : null))
      .filter(Boolean)
      .join(', ');
    return { isDaily: false, text: days };
  };

  // Render Clean High-Density Train Card Matching Screenshot 3 + Enhanced Route Info
  const renderTrainCard = useCallback(
    ({ item }: { item: TrainBetweenStation }) => {
      const isDaily = item.runsOn && item.runsOn.every(Boolean);
      const runsOnActiveDay = activeDateInfo?.dayOfWeek !== undefined && item.runsOn ? item.runsOn[activeDateInfo.dayOfWeek] : true;
      const runningText = isDaily
        ? 'Runs Daily'
        : `Runs ${(item.runsOn || []).map((r, i) => (r ? DAY_LABELS[i] : null)).filter(Boolean).join(', ')}`;
      const cleanDuration = (item.duration || '').replace(/\s+/g, '');

      return (
        <TouchableOpacity
          style={[
            styles.screenshotTrainCard,
            isDarkMode && { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          activeOpacity={0.82}
          onPress={() => onTrackTrain(item.number, item.name, fromStation, toStation)}
        >
          {/* Top Line: [ TrainNo ]  TypeBadge  DepTime — Duration — ArrTime */}
          <View style={styles.screenshotTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.screenshotNumBadge}>
                <Text style={styles.screenshotNumBadgeText}>{item.number}</Text>
              </View>
              {item.type && (
                <View style={[styles.typeBadge, item.type.includes('Vande') ? styles.typeBadgeVande : item.type.includes('Rajdhani') ? styles.typeBadgeRajdhani : styles.typeBadgeDefault]}>
                  <Text style={[styles.typeBadgeText, item.type.includes('Vande') ? styles.typeBadgeTextVande : item.type.includes('Rajdhani') ? styles.typeBadgeTextRajdhani : styles.typeBadgeTextDefault]}>
                    {item.type}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.screenshotTimingText, isDarkMode && { color: colors.textPrimary }]}>
              {item.depTime} — {cleanDuration} — {item.arrTime}
            </Text>
          </View>

          {/* Bottom Line: TrainName   Runs Daily / Not Today */}
          <View style={styles.screenshotBottomRow}>
            <Text style={[styles.screenshotTrainName, isDarkMode && { color: colors.textSecondary }]} numberOfLines={1}>
              {item.name}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {!runsOnActiveDay ? (
                <Text style={styles.runsNotTodayText}>
                  ⚠️ No run on {activeDateInfo.dayShort}
                </Text>
              ) : (
                <Text style={styles.screenshotRunsDailyText}>
                  {runningText}
                </Text>
              )}
            </View>
          </View>

          {/* Coach Classes & Dynamic Fares Row */}
          {item.classes && item.classes.length > 0 && (
            <View style={styles.cardClassesRow}>
              {item.classes.slice(0, 5).map((cls, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.classChip,
                    isDarkMode && { backgroundColor: '#1E293B', borderColor: colors.border },
                    cls.statusType === 'available' && styles.classChipAvailable,
                  ]}
                >
                  <Text style={[styles.classChipTypeText, isDarkMode && { color: colors.textPrimary }]}>
                    {cls.type}
                  </Text>
                  <Text style={styles.classChipPriceText}>
                    ₹{cls.price}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [onTrackTrain, isDarkMode, colors, fromStation, toStation, activeDateInfo]
  );

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: colors.background }]}>
      {/* ================= 1. HEADER (MATCHING SCREENSHOT 3) ================= */}
      <View style={[styles.headerScreenshot3, { backgroundColor: Colors.primary }]}>
        <TouchableOpacity style={styles.headerBackBtnScreenshot3} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitleScreenshot3}>Search results</Text>

        <View style={styles.headerRightActionsScreenshot3}>
          <TouchableOpacity
            style={styles.headerIconBtnScreenshot3}
            onPress={handleShareResults}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= 2. FILTER PILLS ROW (MATCHING SCREENSHOT 3) ================= */}
      <View style={[styles.filterPillsRowScreenshot3, isDarkMode && { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.filterPillScreenshot3, isDarkMode && { backgroundColor: '#1E293B', borderColor: colors.border }]}
          onPress={() => setShowCalendarModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPillTextScreenshot3, isDarkMode && { color: colors.textPrimary }]}>
            {activeDateInfo.formattedDate || 'All Dates'}
          </Text>
          <Ionicons name="caret-down" size={11} color={isDarkMode ? '#94A3B8' : '#475569'} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPillScreenshot3, isDarkMode && { backgroundColor: '#1E293B', borderColor: colors.border }]}
          onPress={() => setShowClassModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPillTextScreenshot3, isDarkMode && { color: colors.textPrimary }]}>
            {selectedClassFilter === 'All' ? 'All Classes' : `${selectedClassFilter} Class`}
          </Text>
          <Ionicons name="caret-down" size={11} color={isDarkMode ? '#94A3B8' : '#475569'} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPillScreenshot3, isDarkMode && { backgroundColor: '#1E293B', borderColor: colors.border }]}
          onPress={() => setShowSortModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPillTextScreenshot3, isDarkMode && { color: colors.textPrimary }]}>
            Sort: {sortBy === 'fastest' ? 'Fastest' : sortBy === 'late_dep' ? 'Late Dep' : sortBy === 'price_low' ? 'Lowest Fare' : 'Departure'}
          </Text>
          <Ionicons name="caret-down" size={11} color={isDarkMode ? '#94A3B8' : '#475569'} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* ================= 3. BLUE ROUTE SUBHEADER BAR ================= */}
      <View style={styles.blueRouteSubheaderBar}>
        <View style={styles.blueRouteSubheaderRow}>
          <Text style={styles.blueRouteSubheaderText} numberOfLines={1}>
            {fromStation.code} - {fromStation.name} → {toStation.code} - {toStation.name}
          </Text>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={handleRefresh}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.blueRouteSubheaderCountText}>
          {isLoading
            ? 'Fetching live trains from Indian Railways...'
            : `${sortedTrains.length} trains available • ${isLiveApiData ? 'Live Railway Scraper Sync' : 'Verified Timetable'}`}
        </Text>
      </View>

      {/* Copied Toast Notification */}
      {copiedNotification && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.toastText}>{notificationMsg}</Text>
        </View>
      )}

      {/* ================= 4. COMPACT TRAIN CARDS LIST / LOADING SKELETON ================= */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: 12 }} />
          <Text style={[styles.loadingText, isDarkMode && { color: colors.textSecondary }]}>
            Searching trains between {fromStation.name} & {toStation.name}...
          </Text>
          <View style={styles.skeletonContainer}>
            {[1, 2, 3, 4].map((n) => (
              <View
                key={n}
                style={[
                  styles.skeletonCard,
                  isDarkMode && { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.skeletonRow}>
                  <View style={styles.skeletonBoxSmall} />
                  <View style={styles.skeletonBoxMedium} />
                </View>
                <View style={styles.skeletonBoxWide} />
              </View>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={sortedTrains}
          keyExtractor={(item) => item.id || item.number}
          renderItem={renderTrainCard}
          contentContainerStyle={[
            styles.listContainer,
            sortedTrains.length === 0 && { flexGrow: 1, justifyContent: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS !== 'web'}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="train" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No trains found</Text>
              <Text style={styles.emptySub}>
                {selectedClassFilter !== 'All'
                  ? `No trains available for class '${selectedClassFilter}'. Try selecting 'All Classes'.`
                  : `No direct trains found between ${fromStation.name} (${fromStation.code}) and ${toStation.name} (${toStation.code}).`}
              </Text>
              <TouchableOpacity style={styles.emptyRetryBtn} onPress={handleRefresh} activeOpacity={0.8}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyRetryBtnText}>Retry Search</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ================= 4. SORT BY MODAL ================= */}
      <Modal visible={showSortModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalCard}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Sort Trains By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {[
              { key: 'fastest', label: 'Fastest (Shortest Travel Time)', icon: 'flash-outline' },
              { key: 'early_dep', label: 'Departure: Earliest First', icon: 'time-outline' },
              { key: 'late_dep', label: 'Departure: Latest First', icon: 'moon-outline' },
              { key: 'price_low', label: 'Fare: Lowest Price First', icon: 'cash-outline' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.sortOptionRow, sortBy === option.key && styles.sortOptionSelected]}
                onPress={() => {
                  setSortBy(option.key as SortOption);
                  setShowSortModal(false);
                }}
              >
                <Ionicons
                  name={option.icon as any}
                  size={16}
                  color={sortBy === option.key ? Colors.primary : '#64748B'}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.sortOptionText, sortBy === option.key && styles.sortOptionTextActive]}>
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= 5. CLASS SELECTION MODAL ================= */}
      <Modal visible={showClassModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowClassModal(false)}
        >
          <View style={styles.sortModalCard}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Select Travel Class</Text>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {(['All', 'SL', '3A', '2A', '1A', 'CC', '2S'] as ClassFilter[]).map((cls) => (
              <TouchableOpacity
                key={cls}
                style={[styles.sortOptionRow, selectedClassFilter === cls && styles.sortOptionSelected]}
                onPress={() => {
                  setSelectedClassFilter(cls);
                  setShowClassModal(false);
                }}
              >
                <MaterialCommunityIcons
                  name="train"
                  size={18}
                  color={selectedClassFilter === cls ? Colors.primary : '#64748B'}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.sortOptionText, selectedClassFilter === cls && styles.sortOptionTextActive]}>
                  {cls === 'All' ? 'All Classes' : `${cls} Class`}
                </Text>
                {selectedClassFilter === cls && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= 6. CALENDAR DATE PICKER MODAL ================= */}
      <Modal visible={showCalendarModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}
        >
          <View style={[styles.sortModalCard, { maxHeight: 440 }]}>
            <View style={styles.sortModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.sortModalTitle}>Select Travel Date</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
              {calendarDates.map((item) => {
                const isSelected =
                  currentDate === item.label ||
                  activeDateInfo.formattedDate === item.formattedDate ||
                  currentDate.includes(item.dateStr);
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.sortOptionRow, isSelected && styles.sortOptionSelected]}
                    onPress={() => {
                      setCurrentDate(item.label);
                      setShowCalendarModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sortOptionText, isSelected && styles.sortOptionTextActive]}>
                        {item.dayLabel === 'Today' || item.dayLabel === 'Tomorrow' || item.dayLabel === 'Yesterday'
                          ? `${item.dayLabel}, ${item.dateStr}`
                          : `${item.dayFull}, ${item.dateStr}`}
                      </Text>
                      <Text style={{ fontSize: 11, color: isSelected ? Colors.primary : '#94A3B8', marginTop: 1 }}>
                        {item.formattedDate}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7FD',
  },

  // 1. Header Styles (Compact)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  // Screenshot 3 Style Header
  headerScreenshot3: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBackBtnScreenshot3: {
    marginRight: 16,
  },
  headerTitleScreenshot3: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: -0.2,
  },
  headerRightActionsScreenshot3: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtnScreenshot3: {
    padding: 6,
  },

  // Screenshot 3 Filter Pills Row
  filterPillsRowScreenshot3: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  filterPillScreenshot3: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterPillTextScreenshot3: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  // Screenshot 3 Blue Route Subheader Bar
  blueRouteSubheaderBar: {
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueRouteSubheaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  blueRouteSubheaderText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    flex: 1,
  },
  blueRouteSubheaderCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  refreshIconBtn: {
    padding: 4,
    marginLeft: 8,
  },

  // Screenshot 3 Train Card
  screenshotTrainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  screenshotTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  screenshotNumBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  screenshotNumBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  typeBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  typeBadgeVande: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  typeBadgeTextVande: {
    color: '#1D4ED8',
  },
  typeBadgeRajdhani: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  typeBadgeTextRajdhani: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  typeBadgeDefault: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  typeBadgeTextDefault: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  screenshotTimingText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  screenshotBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenshotTrainName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
    marginRight: 10,
  },
  screenshotRunsDailyText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  runsNotTodayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },

  // Class & Fare Chips
  cardClassesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  classChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  classChipAvailable: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  classChipTypeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  classChipPriceText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Loading & Skeletons
  loadingContainer: {
    paddingVertical: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
  },
  skeletonContainer: {
    width: '100%',
    gap: 10,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 84,
    justifyContent: 'center',
    gap: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonBoxSmall: {
    width: 65,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonBoxMedium: {
    width: 150,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonBoxWide: {
    width: '75%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  emptyRetryBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyRetryBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  headerCenterCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  routeHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  routeHeaderSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    marginTop: 1.5,
  },
  routeHeaderDateRow: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.82)',
    fontWeight: '400',
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // 2. Where Is My Train Style Filter Bar
  filterMasterBar: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  dateRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateFilterScroll: {
    flex: 1,
    marginRight: 8,
  },
  dateFilterScrollContent: {
    alignItems: 'center',
  },
  datePillCard: {
    minWidth: 68,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    paddingHorizontal: 10,
  },
  datePillCardActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  datePillDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  datePillDayTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  datePillDateText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  datePillDateTextActive: {
    color: '#FFFFFF',
    opacity: 0.95,
  },
  calendarCircleBtn: {
    width: 48,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    borderRadius: 22,
    marginRight: 8,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  actionFilterChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },

  // 3. Compact Train Card Styles (High Density: 4-5 trains per screen)
  listContainer: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 20,
  },
  compactTrainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  emuCardHighlight: {
    borderColor: '#BBF7D0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  compactNumBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginRight: 8,
  },
  emuNumBadge: {
    backgroundColor: '#DCFCE7',
  },
  compactNumText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primary,
  },
  compactTrainName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.2,
  },

  // Line 2: Route Visual
  routeJourneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 10,
  },
  stationTimeCol: {
    minWidth: 64,
  },
  timeMainText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  stationCodeSubText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },
  routeVisualCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  durationCenterText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 3,
  },
  routeTrackLine: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  trackEndpointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  trackDottedLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#E2E8F0',
  },
  trainCenterIcon: {
    marginHorizontal: 4,
  },
  stopsCenterText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 3,
  },

  // Line 3: Footer
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  daysLetterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dayLetterPill: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayPillActiveLight: {
    backgroundColor: '#EFF6FF',
  },
  dayPillActiveDark: {
    backgroundColor: '#1E3A5F',
  },
  dayLetterChar: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  dayActiveText: {
    color: Colors.primary,
  },
  dayInactiveText: {
    color: '#CBD5E1',
  },
  statusTagGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: '55%',
  },
  livePulseDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  statusDepartedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803D',
  },
  statusTagRed: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusNotRunningText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DC2626',
  },

  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 3,
  },

  // Sort Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sortModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  sortModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  sortOptionSelected: {
    backgroundColor: Colors.primarySoft,
  },
  sortOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  sortOptionTextActive: {
    fontWeight: '800',
    color: Colors.primary,
  },
});
