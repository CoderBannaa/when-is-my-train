import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { TrainBetweenStation } from '../data/trainsBetweenStations';
import { Station } from '../data/stations';
import { usePreferences } from '../context/PreferencesContext';
import { useTrainSearch } from '../hooks/useTrainSearch';
import { TrainResultCard, deriveTrainTypeName } from '../components/search/TrainResultCard';
import { DateStrip } from '../components/search/DateStrip';
import {
  parseTimeToMinutes,
  parseDurationMinutes,
} from '../utils/trainTime';

function formatProviderLabel(provider?: string): string {
  if (!provider) return '';
  switch (provider.toLowerCase()) {
    case 'erail': return 'eRail';
    case 'railyatri': return 'RailYatri';
    case 'proxy': return 'Proxy';
    case 'railradar-api': return 'RailRadar API';
    default: return provider;
  }
}

function formatAgeText(ageSec: number | null): string {
  if (ageSec === null || ageSec === undefined || ageSec < 0) return 'just now';
  if (ageSec < 60) return `${ageSec}s ago`;
  const m = Math.floor(ageSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

interface SearchResultsScreenProps {
  fromStation: Station;
  toStation: Station;
  selectedDate: string;
  onBack: () => void;
  onTrackTrain: (trainNumber: string, trainName: string, fromStation?: Station, toStation?: Station) => void;
}

export type SortOption = 'early_dep' | 'fastest' | 'late_dep';
export type ClassFilter = 'All' | 'SL' | '3A' | '2A' | '1A' | 'CC' | '2S';
export type TrainTypeFilter = 'All' | 'Rajdhani' | 'Vande Bharat' | 'Shatabdi' | 'Superfast' | 'Express';
export type TimeOfDayFilter = 'All' | 'Morning' | 'Afternoon' | 'Evening' | 'Night';

function parseInitialDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day);
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
}

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export const SearchResultsScreen: React.FC<SearchResultsScreenProps> = ({
  fromStation,
  toStation,
  selectedDate,
  onBack,
  onTrackTrain,
}) => {
  const { isDarkMode, colors, t } = usePreferences();

  // Core State
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(() => parseInitialDate(selectedDate));
  const [sortBy, setSortBy] = useState<SortOption>('early_dep'); // Default Departure earliest first
  const [selectedClassFilter, setSelectedClassFilter] = useState<ClassFilter>('All');
  const [selectedTrainType, setSelectedTrainType] = useState<TrainTypeFilter>('All');
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDayFilter>('All');
  const [onlyRunningToday, setOnlyRunningToday] = useState<boolean>(false);

  // Modals
  const [showSortModal, setShowSortModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Honest Real-time Data Hook: Zero fabricated data, stale-while-revalidate caching
  const {
    data: searchData,
    status: searchStatus,
    source,
    ageSeconds,
    provider,
    error: searchError,
    refresh,
    isRefreshing,
  } = useTrainSearch(fromStation.code, toStation.code);

  const trains: TrainBetweenStation[] = useMemo(() => searchData || [], [searchData]);
  const isLoading = searchStatus === 'loading' && trains.length === 0;
  const isUnavailable = (searchStatus === 'error' || source === 'unavailable') && trains.length === 0;
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Calendar Picker 35 Days
  const calendarDays = useMemo(() => {
    const list: { label: string; date: Date; formatted: string }[] = [];
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 35; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const isTod = i === 0;
      const isTom = i === 1;
      const dayLabel = isTod ? (t('today') || 'Today') : isTom ? (t('tomorrow') || 'Tomorrow') : days[d.getDay()];
      list.push({
        label: `${dayLabel}, ${d.getDate()} ${months[d.getMonth()]}`,
        date: d,
        formatted: `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`,
      });
    }
    return list;
  }, [t]);

  // Filter trains
  const filteredTrains = useMemo(() => {
    const selectedDayIdx = selectedDateObj.getDay();

    return trains.filter((item) => {
      // 1. Class filter
      if (selectedClassFilter !== 'All') {
        const hasClass =
          item.classes &&
          item.classes.some((c) =>
            c.type.toUpperCase().includes(selectedClassFilter.toUpperCase())
          );
        if (!hasClass) return false;
      }

      // 2. Train type filter
      if (selectedTrainType !== 'All') {
        const derivedType = deriveTrainTypeName(item.name, item.type);
        if (!derivedType.toLowerCase().includes(selectedTrainType.toLowerCase())) {
          return false;
        }
      }

      // 3. Time of day filter
      if (selectedTimeOfDay !== 'All') {
        const depMins = parseTimeToMinutes(item.depTime);
        if (selectedTimeOfDay === 'Morning' && (depMins < 300 || depMins >= 720)) return false;
        if (selectedTimeOfDay === 'Afternoon' && (depMins < 720 || depMins >= 1020)) return false;
        if (selectedTimeOfDay === 'Evening' && (depMins < 1020 || depMins >= 1260)) return false;
        if (selectedTimeOfDay === 'Night' && depMins >= 300 && depMins < 1260) return false;
      }

      // 4. Running on this date filter
      if (onlyRunningToday) {
        const runsOn = item.runsOn || [true, true, true, true, true, true, true];
        if (!runsOn[selectedDayIdx]) return false;
      }

      return true;
    });
  }, [
    trains,
    selectedClassFilter,
    selectedTrainType,
    selectedTimeOfDay,
    onlyRunningToday,
    selectedDateObj,
  ]);

  // Sort trains
  const sortedTrains = useMemo(() => {
    const list = [...filteredTrains];
    const now = new Date();
    const isSelectedDateToday = isSameCalendarDay(selectedDateObj, now);
    const nowMins = now.getHours() * 60 + now.getMinutes();

    return list.sort((a, b) => {
      const depA = parseTimeToMinutes(a.depTime);
      const depB = parseTimeToMinutes(b.depTime);
      const isDepartedA = isSelectedDateToday && depA < nowMins;
      const isDepartedB = isSelectedDateToday && depB < nowMins;

      // When sorting by departure, departed trains always come after upcoming trains
      if (sortBy === 'early_dep' || sortBy === 'late_dep') {
        if (isDepartedA !== isDepartedB) {
          return isDepartedA ? 1 : -1;
        }
        return sortBy === 'early_dep' ? depA - depB : depB - depA;
      }

      if (sortBy === 'fastest') {
        const durA = parseDurationMinutes(a.duration);
        const durB = parseDurationMinutes(b.duration);
        return durA - durB;
      }

      return 0;
    });
  }, [filteredTrains, selectedDateObj, sortBy]);

  // Shortest duration train in current list
  const fastestTrainNumber = useMemo(() => {
    if (sortedTrains.length === 0) return null;
    let minDur = Infinity;
    let fastestNum = '';
    for (const t of sortedTrains) {
      const d = parseDurationMinutes(t.duration);
      if (d < minDur) {
        minDur = d;
        fastestNum = t.number;
      }
    }
    return fastestNum;
  }, [sortedTrains]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedClassFilter !== 'All') count++;
    if (selectedTrainType !== 'All') count++;
    if (selectedTimeOfDay !== 'All') count++;
    if (onlyRunningToday) count++;
    return count;
  }, [selectedClassFilter, selectedTrainType, selectedTimeOfDay, onlyRunningToday]);

  const clearAllFilters = useCallback(() => {
    setSelectedClassFilter('All');
    setSelectedTrainType('All');
    setSelectedTimeOfDay('All');
    setOnlyRunningToday(false);
  }, []);

  // Top Date Pill Label
  const topDatePillLabel = useMemo(() => {
    const now = new Date();
    if (isSameCalendarDay(selectedDateObj, now)) return t('today') || 'Today';
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (isSameCalendarDay(selectedDateObj, tomorrow)) return t('tomorrow') || 'Tomorrow';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[selectedDateObj.getDay()]}, ${selectedDateObj.getDate()} ${months[selectedDateObj.getMonth()]}`;
  }, [selectedDateObj, t]);

  // Top Sort Pill Label
  const topSortPillLabel = useMemo(() => {
    switch (sortBy) {
      case 'fastest':
        return t('sortFastestLabel') || 'Sort: Fastest';
      case 'late_dep':
        return t('sortLatest') || 'Sort: Latest';
      case 'early_dep':
      default:
        return t('sortDeparture') || 'Sort: Departure';
    }
  }, [sortBy, t]);

  // Share results
  const handleShareResults = useCallback(async () => {
    const summary = sortedTrains
      .slice(0, 6)
      .map(
        (t) =>
          `• ${t.number} ${t.name}: Dep ${t.depTime} (${fromStation.code}) ➔ Arr ${t.arrTime} (${toStation.code})`
      )
      .join('\n');

    const shareText = `🚆 Trains: ${fromStation.name} (${fromStation.code}) ➔ ${toStation.name} (${toStation.code})
📅 Date: ${topDatePillLabel}
Total: ${sortedTrains.length} trains

${summary}

Found on When is my train`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          setCopiedNotification(true);
          setTimeout(() => setCopiedNotification(false), 2200);
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
  }, [sortedTrains, fromStation, toStation, topDatePillLabel]);

  // Card click callback
  const handleCardPress = useCallback(
    (trainNumber: string, trainName: string) => {
      onTrackTrain(trainNumber, trainName, fromStation, toStation);
    },
    [onTrackTrain, fromStation, toStation]
  );

  // Memoized renderItem for FlatList
  const renderItem = useCallback(
    ({ item }: { item: TrainBetweenStation }) => {
      return (
        <TrainResultCard
          train={item}
          selectedDate={selectedDateObj}
          isFastest={item.number === fastestTrainNumber}
          isDarkMode={isDarkMode}
          onPress={handleCardPress}
          t={t}
        />
      );
    },
    [selectedDateObj, fastestTrainNumber, isDarkMode, handleCardPress, t]
  );

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? colors.background : '#F0F7FD' }]}>
      {/* ================= 1. HEADER (BLUE WITH SEARCH RESULTS TITLE) ================= */}
      <View style={[styles.headerBar, { backgroundColor: Colors.primary }]}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('searchResults') || 'Search results'}</Text>

        <TouchableOpacity style={styles.headerShareBtn} onPress={handleShareResults} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ================= 2. FILTER PILLS ROW (3 PILLS) ================= */}
      <View
        style={[
          styles.filterPillsRow,
          {
            backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
            borderBottomColor: isDarkMode ? colors.border : '#E2E8F0',
          },
        ]}
      >
        {/* Pill 1: Date */}
        <TouchableOpacity
          style={[
            styles.filterPill,
            {
              backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
              borderColor: isDarkMode ? colors.border : '#CBD5E1',
            },
          ]}
          onPress={() => setShowCalendarModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPillText, { color: isDarkMode ? '#F8FAFC' : '#334155' }]}>
            {topDatePillLabel}
          </Text>
          <Ionicons name="caret-down" size={11} color={isDarkMode ? '#94A3B8' : '#475569'} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Pill 2: Class */}
        <TouchableOpacity
          style={[
            styles.filterPill,
            {
              backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
              borderColor: isDarkMode ? colors.border : '#CBD5E1',
            },
          ]}
          onPress={() => setShowClassModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPillText, { color: isDarkMode ? '#F8FAFC' : '#334155' }]}>
            {selectedClassFilter === 'All' ? (t('allClasses') || 'All Classes') : `${selectedClassFilter} Class`}
          </Text>
          <Ionicons name="caret-down" size={11} color={isDarkMode ? '#94A3B8' : '#475569'} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Pill 3: Sort */}
        <TouchableOpacity
          style={[
            styles.filterPill,
            {
              backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
              borderColor: isDarkMode ? colors.border : '#CBD5E1',
            },
          ]}
          onPress={() => setShowSortModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPillText, { color: isDarkMode ? '#F8FAFC' : '#334155' }]}>
            {topSortPillLabel}
          </Text>
          <Ionicons name="caret-down" size={11} color={isDarkMode ? '#94A3B8' : '#475569'} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* ================= 3. BLUE ROUTE BAR ================= */}
      <View style={[styles.blueRouteBar, { backgroundColor: Colors.primary }]}>
        <View style={styles.blueRouteRow}>
          <Text style={styles.blueRouteText} numberOfLines={1}>
            {fromStation.code} - {fromStation.name}  →  {toStation.code} - {toStation.name}
          </Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={refresh}
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

        <Text style={styles.blueRouteSubText}>
          {isLoading
            ? 'Fetching live trains from Indian Railways...'
            : source === 'live'
            ? `${sortedTrains.length} ${t('trainsFound') || 'trains available'} • Live${provider ? ` • Source: ${formatProviderLabel(provider)}` : ''}`
            : source === 'cache'
            ? `${sortedTrains.length} ${t('trainsFound') || 'trains available'} • Updated ${formatAgeText(ageSeconds)}${provider ? ` • Source: ${formatProviderLabel(provider)}` : ''}`
            : source === 'stale'
            ? `${sortedTrains.length} ${t('trainsFound') || 'trains available'} • Offline (${formatAgeText(ageSeconds)})${provider ? ` • Source: ${formatProviderLabel(provider)}` : ''}`
            : `${sortedTrains.length} ${t('trainsFound') || 'trains available'}`}
        </Text>
      </View>

      {/* ================= 4. AMBER STALE BANNER (FOR OFFLINE / STALE ONLY) ================= */}
      {source === 'stale' && (
        <View style={styles.fallbackAmberBanner}>
          <Ionicons name="warning-outline" size={16} color="#B45309" style={{ marginRight: 8 }} />
          <Text style={styles.fallbackAmberText}>
            {`Offline • showing data from ${formatAgeText(ageSeconds)}${provider ? ` • Source: ${formatProviderLabel(provider)}` : ''}`}
          </Text>
          <TouchableOpacity onPress={refresh} style={styles.retryPill} activeOpacity={0.7} disabled={isRefreshing}>
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#92400E" />
            ) : (
              <Text style={styles.retryPillText}>Retry</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ================= 5. DATE STRIP (NEXT 7 DAYS + CALENDAR BUTTON) ================= */}
      <DateStrip
        selectedDate={selectedDateObj}
        onSelectDate={setSelectedDateObj}
        onOpenCalendar={() => setShowCalendarModal(true)}
        isDarkMode={isDarkMode}
        colors={colors}
        t={t}
      />

      {/* ================= 6. EXTRA FILTER CHIPS ROW ================= */}
      <View
        style={[
          styles.extraFiltersRow,
          {
            backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
            borderBottomColor: isDarkMode ? colors.border : '#E2E8F0',
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.extraFiltersScrollContent}
        >
          {/* Running on this date Toggle Chip */}
          <TouchableOpacity
            style={[
              styles.filterChipItem,
              onlyRunningToday && styles.filterChipItemActive,
              {
                backgroundColor: onlyRunningToday
                  ? (isDarkMode ? '#064E3B' : '#ECFDF5')
                  : (isDarkMode ? '#1E293B' : '#F8FAFC'),
                borderColor: onlyRunningToday
                  ? '#10B981'
                  : (isDarkMode ? colors.border : '#CBD5E1'),
              },
            ]}
            onPress={() => setOnlyRunningToday(!onlyRunningToday)}
            activeOpacity={0.7}
          >
            <View style={[styles.filterChipDot, { backgroundColor: onlyRunningToday ? '#10B981' : '#94A3B8' }]} />
            <Text
              style={[
                styles.filterChipText,
                onlyRunningToday && { color: isDarkMode ? '#34D399' : '#059669', fontWeight: '800' },
              ]}
            >
              {t('runningOnThisDate') || 'Running on this date'}
            </Text>
          </TouchableOpacity>

          {/* Time of Day Chips */}
          {(['Morning', 'Afternoon', 'Evening', 'Night'] as TimeOfDayFilter[]).map((timeSlot) => {
            const isSelected = selectedTimeOfDay === timeSlot;
            return (
              <TouchableOpacity
                key={timeSlot}
                style={[
                  styles.filterChipItem,
                  isSelected && styles.filterChipItemActive,
                  {
                    backgroundColor: isSelected
                      ? (isDarkMode ? '#1E3A5F' : '#EFF6FF')
                      : (isDarkMode ? '#1E293B' : '#F8FAFC'),
                    borderColor: isSelected
                      ? Colors.primary
                      : (isDarkMode ? colors.border : '#CBD5E1'),
                  },
                ]}
                onPress={() => setSelectedTimeOfDay(isSelected ? 'All' : timeSlot)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && { color: isDarkMode ? '#38BDF8' : Colors.primary, fontWeight: '800' },
                  ]}
                >
                  {timeSlot === 'Morning'
                    ? (t('morning') || 'Morning (5-12)')
                    : timeSlot === 'Afternoon'
                    ? (t('afternoon') || 'Afternoon (12-17)')
                    : timeSlot === 'Evening'
                    ? (t('evening') || 'Evening (17-21)')
                    : (t('night') || 'Night (21-5)')}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Train Type Chips */}
          {(['Vande Bharat', 'Rajdhani', 'Shatabdi', 'Superfast', 'Express'] as TrainTypeFilter[]).map(
            (typeOption) => {
              const isSelected = selectedTrainType === typeOption;
              return (
                <TouchableOpacity
                  key={typeOption}
                  style={[
                    styles.filterChipItem,
                    isSelected && styles.filterChipItemActive,
                    {
                      backgroundColor: isSelected
                        ? (isDarkMode ? '#1E3A5F' : '#EFF6FF')
                        : (isDarkMode ? '#1E293B' : '#F8FAFC'),
                      borderColor: isSelected
                        ? Colors.primary
                        : (isDarkMode ? colors.border : '#CBD5E1'),
                    },
                  ]}
                  onPress={() => setSelectedTrainType(isSelected ? 'All' : typeOption)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && { color: isDarkMode ? '#38BDF8' : Colors.primary, fontWeight: '800' },
                    ]}
                  >
                    {typeOption}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}

          {/* Clear All Filters Button */}
          {activeFiltersCount > 0 && (
            <TouchableOpacity
              style={styles.clearAllFiltersBtn}
              onPress={clearAllFilters}
              activeOpacity={0.7}
            >
              <Text style={styles.clearAllFiltersText}>
                {t('clearAll') || 'Clear all'} ({activeFiltersCount})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Copied Toast Notification */}
      {copiedNotification && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.toastText}>Train list copied to clipboard!</Text>
        </View>
      )}

      {/* ================= 7. FLATLIST / SKELETON ================= */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: 12 }} />
          <Text style={[styles.loadingText, { color: isDarkMode ? colors.textSecondary : '#64748B' }]}>
            Searching trains between {fromStation.name} & {toStation.name}...
          </Text>
          <View style={styles.skeletonContainer}>
            {[1, 2, 3, 4, 5].map((n) => (
              <View
                key={n}
                style={[
                  styles.skeletonCard,
                  {
                    backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
                    borderColor: isDarkMode ? colors.border : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.skeletonRow}>
                  <View style={[styles.skeletonBoxSmall, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]} />
                  <View style={[styles.skeletonBoxMedium, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]} />
                </View>
                <View style={[styles.skeletonBoxWide, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]} />
              </View>
            ))}
          </View>
        </View>
      ) : isUnavailable ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name={
              searchError?.kind === 'network' || searchError?.kind === 'timeout'
                ? 'wifi-off'
                : searchError?.kind === 'parse'
                ? 'alert-circle-outline'
                : 'cloud-alert'
            }
            size={56}
            color={isDarkMode ? '#F87171' : '#DC2626'}
          />
          <Text style={[styles.errorTitle, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
            {searchError?.kind === 'network'
              ? 'No Internet Connection'
              : searchError?.kind === 'timeout'
              ? 'Railway Servers Not Responding'
              : searchError?.kind === 'parse'
              ? 'Railway Timetable Format Changed'
              : searchError?.kind === 'blocked'
              ? 'Access Temporarily Restricted'
              : 'No Real Trains Found'}
          </Text>
          <Text style={[styles.errorSubtitle, { color: isDarkMode ? colors.textSecondary : '#64748B' }]}>
            {searchError?.message || 'Unable to fetch real-time train data right now. Zero fabricated trains are shown.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={refresh}
            disabled={isRefreshing}
            activeOpacity={0.8}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="reload" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Retry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedTrains}
          keyExtractor={(item) => item.number}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContainer,
            sortedTrains.length === 0 && { flexGrow: 1, justifyContent: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={9}
          removeClippedSubviews={Platform.OS !== 'web'}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="train" size={48} color={isDarkMode ? '#64748B' : '#94A3B8'} />
              <Text style={[styles.emptyTitle, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                {activeFiltersCount > 0
                  ? t('noTrainsFound') || 'No trains match the selected filters'
                  : t('noTrainsFound') || 'No trains found'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: isDarkMode ? colors.textSecondary : '#64748B' }]}>
                {activeFiltersCount > 0
                  ? 'Try clearing active filters or choosing another date.'
                  : t('tryAnotherDate') || 'Try selecting another date or check nearby stations.'}
              </Text>
              {activeFiltersCount > 0 ? (
                <TouchableOpacity
                  style={styles.clearFiltersActionBtn}
                  onPress={clearAllFilters}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearFiltersActionBtnText}>
                    {t('clearFilters') || 'Clear filters'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.retryBtn} onPress={refresh} activeOpacity={0.8}>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ================= MODAL: 1. SORT BY ================= */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={[styles.sortModalCard, { backgroundColor: isDarkMode ? colors.surface : '#FFFFFF' }]}>
            <View style={[styles.sortModalHeader, { borderBottomColor: isDarkMode ? colors.border : '#F1F5F9' }]}>
              <Text style={[styles.sortModalTitle, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                Sort Trains By
              </Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#0F172A'} />
              </TouchableOpacity>
            </View>

            {[
              { key: 'early_dep' as SortOption, label: 'Departure: Earliest First', icon: 'time-outline' },
              { key: 'fastest' as SortOption, label: 'Fastest (Shortest Travel Time)', icon: 'flash-outline' },
              { key: 'late_dep' as SortOption, label: 'Departure: Latest First', icon: 'moon-outline' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOptionRow,
                  sortBy === option.key && [
                    styles.sortOptionSelected,
                    { backgroundColor: isDarkMode ? '#1E3A5F' : '#EFF6FF' },
                  ],
                ]}
                onPress={() => {
                  setSortBy(option.key);
                  setShowSortModal(false);
                }}
              >
                <Ionicons
                  name={option.icon as any}
                  size={17}
                  color={sortBy === option.key ? Colors.primary : isDarkMode ? '#94A3B8' : '#64748B'}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    { color: isDarkMode ? colors.textPrimary : '#334155' },
                    sortBy === option.key && styles.sortOptionTextActive,
                  ]}
                >
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

      {/* ================= MODAL: 2. CLASS FILTER ================= */}
      <Modal visible={showClassModal} transparent animationType="fade" onRequestClose={() => setShowClassModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowClassModal(false)}
        >
          <View style={[styles.sortModalCard, { backgroundColor: isDarkMode ? colors.surface : '#FFFFFF' }]}>
            <View style={[styles.sortModalHeader, { borderBottomColor: isDarkMode ? colors.border : '#F1F5F9' }]}>
              <Text style={[styles.sortModalTitle, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                Select Travel Class
              </Text>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#0F172A'} />
              </TouchableOpacity>
            </View>

            {(['All', 'SL', '3A', '2A', '1A', 'CC', '2S'] as ClassFilter[]).map((cls) => (
              <TouchableOpacity
                key={cls}
                style={[
                  styles.sortOptionRow,
                  selectedClassFilter === cls && [
                    styles.sortOptionSelected,
                    { backgroundColor: isDarkMode ? '#1E3A5F' : '#EFF6FF' },
                  ],
                ]}
                onPress={() => {
                  setSelectedClassFilter(cls);
                  setShowClassModal(false);
                }}
              >
                <MaterialCommunityIcons
                  name="train"
                  size={18}
                  color={selectedClassFilter === cls ? Colors.primary : isDarkMode ? '#94A3B8' : '#64748B'}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    { color: isDarkMode ? colors.textPrimary : '#334155' },
                    selectedClassFilter === cls && styles.sortOptionTextActive,
                  ]}
                >
                  {cls === 'All' ? (t('allClasses') || 'All Classes') : `${cls} Class`}
                </Text>
                {selectedClassFilter === cls && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= MODAL: 3. CALENDAR PICKER ================= */}
      <Modal visible={showCalendarModal} transparent animationType="fade" onRequestClose={() => setShowCalendarModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}
        >
          <View
            style={[
              styles.sortModalCard,
              { maxHeight: 460, backgroundColor: isDarkMode ? colors.surface : '#FFFFFF' },
            ]}
          >
            <View style={[styles.sortModalHeader, { borderBottomColor: isDarkMode ? colors.border : '#F1F5F9' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar" size={19} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.sortModalTitle, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
                  Select Travel Date
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#0F172A'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 370 }}>
              {calendarDays.map((item) => {
                const isSelected = isSameCalendarDay(item.date, selectedDateObj);
                return (
                  <TouchableOpacity
                    key={item.date.toISOString()}
                    style={[
                      styles.sortOptionRow,
                      isSelected && [
                        styles.sortOptionSelected,
                        { backgroundColor: isDarkMode ? '#1E3A5F' : '#EFF6FF' },
                      ],
                    ]}
                    onPress={() => {
                      setSelectedDateObj(item.date);
                      setShowCalendarModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.sortOptionText,
                          { color: isDarkMode ? colors.textPrimary : '#334155' },
                          isSelected && styles.sortOptionTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: isSelected ? Colors.primary : isDarkMode ? '#64748B' : '#94A3B8',
                          marginTop: 1,
                        }}
                      >
                        {item.formatted}
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
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 14,
  },
  headerBackBtn: {
    marginRight: 16,
    padding: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: -0.2,
  },
  headerShareBtn: {
    padding: 4,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  blueRouteBar: {
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  blueRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  blueRouteText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    flex: 1,
  },
  blueRouteSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
  },
  refreshBtn: {
    padding: 4,
    marginLeft: 8,
  },
  fallbackAmberBanner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fallbackAmberText: {
    color: '#92400E',
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
  retryPill: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginLeft: 8,
  },
  retryPillText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  extraFiltersRow: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  extraFiltersScrollContent: {
    alignItems: 'center',
    gap: 6,
  },
  filterChipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  filterChipItemActive: {},
  filterChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  clearAllFiltersBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },
  clearAllFiltersText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  listContainer: {
    paddingBottom: 24,
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
  loadingContainer: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  skeletonContainer: {
    width: '100%',
    gap: 10,
  },
  skeletonCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    gap: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonBoxSmall: {
    width: 55,
    height: 14,
    borderRadius: 4,
  },
  skeletonBoxMedium: {
    width: 140,
    height: 14,
    borderRadius: 4,
  },
  skeletonBoxWide: {
    width: '70%',
    height: 12,
    borderRadius: 4,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  clearFiltersActionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 14,
  },
  clearFiltersActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 14,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sortModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  sortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  sortOptionSelected: {},
  sortOptionText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  sortOptionTextActive: {
    fontWeight: '800',
    color: Colors.primary,
  },
});
