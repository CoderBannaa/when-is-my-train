import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Share,
  Platform,
  Modal,
  Animated,
  Easing,
  ScrollView,
  AccessibilityInfo,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { usePreferences } from '../context/PreferencesContext';
import { useLiveStatus } from '../hooks/useLiveStatus';
import {
  buildTrackerViewModel,
  TimelineStation,
  TrackerViewModel,
  deriveTrainType,
} from './tracker/buildTrackerViewModel';
import { AlarmStore } from '../utils/alarmStore';
import { SavedTrainsStore } from '../utils/savedTrainsStore';
import { CORRIDOR_TRAINS_MASTER } from '../data/trainsBetweenStations';

// ==========================================
// DUPLICATE SWITCHES (Rule configuration)
// ==========================================
const REMOVE_HEADER_SHARE_ICON = true; // share stays in the pills row only
const REMOVE_COACH_PILL = false; // pill and tab both stay when false
const REMOVE_ROW_LATE_CHIP = false; // when true keep red actual time only

interface LiveTrainTrackerScreenProps {
  trainNumber: string;
  trainName?: string;
  fromStationCode?: string;
  toStationCode?: string;
  fromStationName?: string;
  toStationName?: string;
  onBack: () => void;
}

// ==========================================
// TIMELINE LIST ITEM UNION TYPES
// ==========================================
interface CommercialTimelineItem {
  type: 'commercial';
  key: string;
  station: TimelineStation;
  originalIndex: number;
  isFirst: boolean;
  isLast: boolean;
}

interface PassingGroupTimelineItem {
  type: 'passingGroup';
  key: string;
  stations: { station: TimelineStation; originalIndex: number }[];
}

interface DayHeaderTimelineItem {
  type: 'dayHeader';
  key: string;
  dayNumber: number;
  dayText: string;
}

type TimelineItem = CommercialTimelineItem | PassingGroupTimelineItem | DayHeaderTimelineItem;

// ==========================================
// DATE & TIME HELPERS (24h strict & real math)
// ==========================================
function formatTo24h(timeStr?: string): string {
  if (!timeStr || timeStr === '--' || timeStr === '--:--') return '--';
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return timeStr;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const mer = match[3];
  if (mer) {
    if (mer === 'PM' && h !== 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
  }
  return `${h.toString().padStart(2, '0')}:${m}`;
}

function getStartDateForMode(mode: 'today' | 'yesterday' | 'tomorrow' | 'custom', customDate?: Date): Date {
  const d = new Date();
  if (mode === 'yesterday') {
    d.setDate(d.getDate() - 1);
  } else if (mode === 'tomorrow') {
    d.setDate(d.getDate() + 1);
  } else if (mode === 'custom' && customDate) {
    return new Date(customDate);
  }
  return d;
}

function formatDayBandText(baseDate: Date, dayNumber: number = 1): string {
  const targetDate = new Date(baseDate);
  targetDate.setDate(targetDate.getDate() + (dayNumber - 1));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Day ${dayNumber} - ${months[targetDate.getMonth()]} ${targetDate.getDate()}, ${days[targetDate.getDay()]}`;
}

function buildBottomBarMetaText(
  fetchedAt: number | null,
  isStale: boolean,
  speedKmH: number | undefined,
  provider: string | undefined
): string {
  let timePart: string;
  if (isStale && fetchedAt) {
    const d = new Date(fetchedAt);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    timePart = `Last known ${hh}:${mm}`;
  } else if (fetchedAt) {
    const diffSec = Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000));
    if (diffSec < 60) {
      timePart = `Updated ${diffSec}s ago`;
    } else {
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) {
        timePart = `Updated ${diffMin} min ago`;
      } else {
        const diffHr = Math.floor(diffMin / 60);
        timePart = `Updated ${diffHr} h ago`;
      }
    }
  } else {
    timePart = 'Updated just now';
  }

  const parts = [timePart];
  // Rule A.1: numeric speed ONLY, no placeholder default
  if (typeof speedKmH === 'number' && speedKmH > 0) {
    parts.push(`${speedKmH} km/h`);
  }
  if (provider) {
    parts.push(provider);
  }
  return parts.join(' - ');
}

// ==========================================
// MEMOIZED ROW COMPONENTS (Smooth 60fps)
// ==========================================

// 1. Commercial Station Row
const StationRowComponent = React.memo<{
  item: CommercialTimelineItem;
  currentStationIndex: number;
  pulseAnim: Animated.Value;
  colors: any;
  isDarkMode: boolean;
  t: any;
}>(({ item, currentStationIndex, pulseAnim, colors, isDarkMode, t }) => {
  const st = item.station;
  const isCurrent = item.originalIndex === currentStationIndex;
  const isPassed = !isCurrent && item.originalIndex < currentStationIndex;
  const isUpcoming = !isCurrent && item.originalIndex > currentStationIndex;

  const schedArr = formatTo24h(st.scheduledArrival);
  const schedDep = formatTo24h(st.scheduledDeparture);
  const actualArr = st.actualArrival ? formatTo24h(st.actualArrival) : (st.expectedArrival ? formatTo24h(st.expectedArrival) : schedArr);
  const actualDep = st.actualDeparture ? formatTo24h(st.actualDeparture) : (st.expectedDeparture ? formatTo24h(st.expectedDeparture) : schedDep);

  // Consistent station delay
  const delay = typeof st.delayMinutes === 'number' ? st.delayMinutes : 0;
  const isDelayed = delay > 0;

  // Clean uppercase station name
  const displayName = (st.stationName || st.stationCode || '')
    .replace(/\s*\([A-Z0-9]+\)/i, '')
    .trim()
    .toUpperCase();

  // Clean platform box
  const pfClean = st.platform ? st.platform.replace(/Platform\s*/i, '').trim() : '';

  const a11yLabel = `${displayName}, ${isCurrent ? 'current station' : isPassed ? 'passed' : 'upcoming'}, arrival ${schedArr}, departure ${schedDep}${pfClean ? `, platform ${pfClean}` : ''}${isDelayed ? `, ${delay} minutes late` : ''}`;

  return (
    <View
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={[
        styles.stationTimelineRow,
        { backgroundColor: colors.surface },
        isCurrent && { backgroundColor: isDarkMode ? '#1E3A5F' : '#EDF6FF' },
      ]}
    >
      {/* 1. Left Arrival Column */}
      <View style={styles.timeColLeft}>
        {item.isFirst ? (
          <Text style={[styles.schedTimeText, { color: colors.textSecondary }]}>--</Text>
        ) : isUpcoming ? (
          <>
            <Text style={[styles.schedTimeText, { color: colors.textPrimary }]}>{schedArr}</Text>
            {isDelayed && actualArr !== '--' && actualArr !== schedArr ? (
              <Text style={[styles.actualTimeText, styles.textDelayedRed]}>{actualArr}</Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={[styles.schedTimeText, { color: colors.textPrimary }]}>{schedArr}</Text>
            <Text
              style={[
                styles.actualTimeText,
                isDelayed ? styles.textDelayedRed : styles.textPassedGreen,
              ]}
            >
              {actualArr !== '--' ? actualArr : schedArr}
            </Text>
          </>
        )}
      </View>

      {/* 2. Track & Node Column (Exact continuous green line) */}
      <View style={styles.trackTrackWrapper}>
        {!item.isFirst && (
          <View
            style={[
              styles.trackLineContinuousTop,
              { backgroundColor: item.originalIndex <= currentStationIndex ? '#16A34A' : '#94A3B8' },
            ]}
          />
        )}

        {!item.isLast && (
          <View
            style={[
              styles.trackLineContinuousBottom,
              { backgroundColor: item.originalIndex < currentStationIndex ? '#16A34A' : '#94A3B8' },
            ]}
          />
        )}

        {isCurrent ? (
          <View style={styles.reachingStationBadgeWrapper}>
            <Animated.View
              style={[
                styles.currentStationPulseHalo,
                { transform: [{ scale: pulseAnim }], opacity: 0.35 },
              ]}
            />
            <View style={styles.currentTrainBadge}>
              <MaterialCommunityIcons name="train" size={16} color="#FFFFFF" />
            </View>
          </View>
        ) : isPassed ? (
          <View style={styles.passedCheckCircle}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        ) : item.isLast ? (
          <View style={styles.destRedCircle} />
        ) : (
          <View style={styles.upcomingGrayCircle} />
        )}
      </View>

      {/* 3. Center Station Details Column */}
      <View style={styles.stationInfoCol}>
        <Text style={[styles.stationNameText, { color: colors.textPrimary }]} numberOfLines={1}>
          {displayName}
        </Text>

        <View style={styles.screenshotStationMetaRow}>
          {typeof st.distanceKm === 'number' && st.distanceKm >= 0 ? (
            <Text style={[styles.screenshotDistanceText, { color: colors.textSecondary }]}>
              {st.distanceKm} km
            </Text>
          ) : null}
          {pfClean ? (
            <View style={styles.screenshotPlatformBox}>
              <Text style={styles.screenshotPlatformBoxText}>{pfClean}</Text>
            </View>
          ) : null}
        </View>

        {/* Delay Status Badges */}
        {isCurrent ? (
          <View style={styles.currentBlueStatusBadge}>
            <Text style={styles.currentBlueStatusBadgeText}>
              Current Station • {isDelayed ? `${delay} min late` : (t('on_time') || 'On Time')}
            </Text>
          </View>
        ) : isDelayed ? (
          <View
            style={[
              styles.screenshotDelayPill,
              delay <= 15 ? { backgroundColor: '#FEF3C7' } : { backgroundColor: '#FEE2E2' },
            ]}
          >
            <Text
              style={[
                styles.screenshotDelayPillText,
                delay <= 15 ? { color: '#D97706' } : { color: '#DC2626' },
              ]}
            >
              {delay} min late
            </Text>
          </View>
        ) : isPassed ? (
          <View style={[styles.screenshotDelayPill, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.screenshotDelayPillText, { color: '#16A34A' }]}>
              {t('on_time') || 'On time'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* 4. Right Departure Column */}
      <View style={styles.timeColRight}>
        {item.isLast ? (
          <Text style={[styles.schedTimeText, { color: colors.textSecondary }]}>--</Text>
        ) : isUpcoming ? (
          <>
            <Text style={[styles.schedTimeText, { color: colors.textPrimary }]}>{schedDep}</Text>
            {isDelayed && actualDep !== '--' && actualDep !== schedDep ? (
              <Text style={[styles.actualTimeText, styles.textDelayedRed]}>{actualDep}</Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={[styles.schedTimeText, { color: colors.textPrimary }]}>{schedDep}</Text>
            <Text
              style={[
                styles.actualTimeText,
                isDelayed ? styles.textDelayedRed : styles.textPassedGreen,
              ]}
            >
              {actualDep !== '--' ? actualDep : schedDep}
            </Text>
          </>
        )}
      </View>
    </View>
  );
});

// 2. Intermediate Stations Group Component
const PassingGroupComponent = React.memo<{
  item: PassingGroupTimelineItem;
  currentStationIndex: number;
  isExpanded: boolean;
  onToggle: (key: string) => void;
  pulseAnim: Animated.Value;
  colors: any;
  isDarkMode: boolean;
  t: any;
}>(({ item, currentStationIndex, isExpanded, onToggle, pulseAnim, colors, isDarkMode, t }) => {
  const lastStationIdx = item.stations[item.stations.length - 1]?.originalIndex || 0;
  const isGroupPassed = lastStationIdx < currentStationIndex;
  const currentPassing = item.stations.find((s) => s.originalIndex === currentStationIndex);

  return (
    <View key={item.key}>
      {/* If train is currently at one of the intermediate stations, render it prominently! */}
      {currentPassing && !isExpanded && (
        <View
          style={[
            styles.stationTimelineRow,
            { backgroundColor: isDarkMode ? '#1E3A5F' : '#EDF6FF' },
          ]}
        >
          <View style={styles.timeColLeft}>
            {currentPassing.station.scheduledArrival && currentPassing.station.scheduledArrival !== '--' ? (
              <Text style={[styles.schedTimeText, { color: colors.textPrimary }]}>
                {formatTo24h(currentPassing.station.scheduledArrival)}
              </Text>
            ) : null}
          </View>
          <View style={styles.trackTrackWrapper}>
            <View style={[styles.trackLineContinuousTop, { backgroundColor: '#16A34A' }]} />
            <View style={[styles.trackLineContinuousBottom, { backgroundColor: '#94A3B8' }]} />
            <View style={styles.reachingStationBadgeWrapper}>
              <Animated.View
                style={[
                  styles.currentStationPulseHalo,
                  { transform: [{ scale: pulseAnim }], opacity: 0.35 },
                ]}
              />
              <View style={styles.currentTrainBadge}>
                <MaterialCommunityIcons name="train" size={16} color="#FFFFFF" />
              </View>
            </View>
          </View>
          <View style={styles.stationInfoCol}>
            <Text style={[styles.stationNameText, { color: colors.textPrimary }]} numberOfLines={1}>
              {(currentPassing.station.stationName || currentPassing.station.stationCode || '')
                .replace(/\s*\([A-Z0-9]+\)/i, '')
                .trim()
                .toUpperCase()}
            </Text>
            {typeof currentPassing.station.distanceKm === 'number' ? (
              <Text style={[styles.screenshotDistanceText, { color: colors.textSecondary }]}>
                {currentPassing.station.distanceKm} km • Intermediate Station
              </Text>
            ) : null}
            <View style={styles.currentBlueStatusBadge}>
              <Text style={styles.currentBlueStatusBadgeText}>
                Current Station • {currentPassing.station.delayMinutes > 0 ? `${currentPassing.station.delayMinutes} min late` : (t('on_time') || 'On Time')}
              </Text>
            </View>
          </View>
          <View style={styles.timeColRight}>
            {currentPassing.station.scheduledDeparture && currentPassing.station.scheduledDeparture !== '--' ? (
              <Text style={[styles.schedTimeText, { color: colors.textPrimary }]}>
                {formatTo24h(currentPassing.station.scheduledDeparture)}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Capsule button row on the track */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onToggle(item.key)}
        style={[styles.stationTimelineRow, { minHeight: 38, backgroundColor: colors.surface }]}
      >
        <View style={styles.timeColLeft} />
        <View style={styles.trackTrackWrapper}>
          <View
            style={[
              styles.trackLineContinuousTop,
              { backgroundColor: isGroupPassed ? '#16A34A' : '#94A3B8' },
            ]}
          />
          <View
            style={[
              styles.trackLineContinuousBottom,
              { backgroundColor: isGroupPassed ? '#16A34A' : '#94A3B8' },
            ]}
          />
        </View>
        <View style={styles.stationInfoCol}>
          <View style={styles.intermediateCapsuleBtn}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={13}
              color="#0284C7"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.intermediateCapsuleText}>
              {isExpanded
                ? `Hide ${item.stations.length} intermediate stations`
                : `+ ${item.stations.length} intermediate stations`}
            </Text>
          </View>
        </View>
        <View style={styles.timeColRight} />
      </TouchableOpacity>

      {/* Expanded intermediate stations list */}
      {isExpanded &&
        item.stations.map((passSt) => {
          const st = passSt.station;
          const origIdx = passSt.originalIndex;
          const isThisCurrent = origIdx === currentStationIndex;
          const isThisPassed = origIdx < currentStationIndex;

          return (
            <View
              key={`expanded-${st.stationCode}-${origIdx}`}
              style={[
                styles.stationTimelineRow,
                { minHeight: 46, backgroundColor: colors.surface },
                isThisCurrent && { backgroundColor: isDarkMode ? '#1E3A5F' : '#EDF6FF' },
              ]}
            >
              <View style={styles.timeColLeft}>
                {st.scheduledArrival && st.scheduledArrival !== '--' ? (
                  <Text style={[styles.schedTimeText, { fontSize: 11, color: colors.textSecondary }]}>
                    {formatTo24h(st.scheduledArrival)}
                  </Text>
                ) : null}
              </View>
              <View style={styles.trackTrackWrapper}>
                <View
                  style={[
                    styles.trackLineContinuousTop,
                    { backgroundColor: origIdx <= currentStationIndex ? '#16A34A' : '#94A3B8' },
                  ]}
                />
                <View
                  style={[
                    styles.trackLineContinuousBottom,
                    { backgroundColor: origIdx < currentStationIndex ? '#16A34A' : '#94A3B8' },
                  ]}
                />
                {isThisCurrent ? (
                  <View style={styles.reachingStationBadgeWrapper}>
                    <Animated.View
                      style={[
                        styles.currentStationPulseHalo,
                        { transform: [{ scale: pulseAnim }], opacity: 0.35 },
                      ]}
                    />
                    <View style={styles.currentTrainBadge}>
                      <MaterialCommunityIcons name="train" size={14} color="#FFFFFF" />
                    </View>
                  </View>
                ) : isThisPassed ? (
                  <View style={[styles.passedCheckCircle, { width: 14, height: 14, borderRadius: 7 }]}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={[styles.upcomingGrayCircle, { width: 12, height: 12, borderRadius: 6 }]} />
                )}
              </View>
              <View style={styles.stationInfoCol}>
                <Text style={[styles.stationNameText, { fontSize: 13, color: colors.textPrimary }]} numberOfLines={1}>
                  {(st.stationName || st.stationCode || '')
                    .replace(/\s*\([A-Z0-9]+\)/i, '')
                    .trim()
                    .toUpperCase()}
                </Text>
                {typeof st.distanceKm === 'number' && st.distanceKm >= 0 ? (
                  <Text style={[styles.screenshotDistanceText, { fontSize: 10.5, color: colors.textSecondary }]}>
                    {st.distanceKm} km
                  </Text>
                ) : null}
              </View>
              <View style={styles.timeColRight}>
                {st.scheduledDeparture && st.scheduledDeparture !== '--' ? (
                  <Text style={[styles.schedTimeText, { fontSize: 11, color: colors.textSecondary }]}>
                    {formatTo24h(st.scheduledDeparture)}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
    </View>
  );
});

// 3. Day Header Band Component (Day 1 / Day 2)
const DayHeaderComponent = React.memo<{ dayText: string; isDarkMode: boolean; colors: any }>(
  ({ dayText }) => (
    <View style={styles.screenshot1HeaderBar}>
      <Text style={styles.screenshot1HeaderColText}>ARRIVAL</Text>
      <Text style={styles.screenshot1HeaderDayText}>{dayText}</Text>
      <Text style={styles.screenshot1HeaderColText}>DEPARTURE</Text>
    </View>
  )
);

// 4. Skeleton Shimmer Rows for clean loading state
const SkeletonTimeline = React.memo<{ colors: any; isDarkMode: boolean }>(({ colors, isDarkMode }) => {
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const placeholderBg = isDarkMode ? '#334155' : '#E2E8F0';

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={[styles.stationTimelineRow, { backgroundColor: colors.surface }]}>
          <View style={styles.timeColLeft}>
            <Animated.View style={{ width: 44, height: 14, backgroundColor: placeholderBg, borderRadius: 4, opacity: shimmerAnim }} />
            <Animated.View style={{ width: 36, height: 12, backgroundColor: placeholderBg, borderRadius: 4, marginTop: 4, opacity: shimmerAnim }} />
          </View>
          <View style={styles.trackTrackWrapper}>
            <View style={[styles.trackLineContinuousTop, { backgroundColor: '#CBD5E1' }]} />
            <View style={[styles.trackLineContinuousBottom, { backgroundColor: '#CBD5E1' }]} />
            <View style={[styles.upcomingGrayCircle, { backgroundColor: '#CBD5E1', borderColor: colors.surface }]} />
          </View>
          <View style={styles.stationInfoCol}>
            <Animated.View style={{ width: 120, height: 16, backgroundColor: placeholderBg, borderRadius: 4, opacity: shimmerAnim }} />
            <Animated.View style={{ width: 80, height: 12, backgroundColor: placeholderBg, borderRadius: 4, marginTop: 6, opacity: shimmerAnim }} />
          </View>
          <View style={styles.timeColRight}>
            <Animated.View style={{ width: 44, height: 14, backgroundColor: placeholderBg, borderRadius: 4, opacity: shimmerAnim }} />
            <Animated.View style={{ width: 36, height: 12, backgroundColor: placeholderBg, borderRadius: 4, marginTop: 4, opacity: shimmerAnim }} />
          </View>
        </View>
      ))}
    </View>
  );
});

// ==========================================
// MAIN LIVE TRAIN TRACKER SCREEN
// ==========================================
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

  // Screen UI state
  const [selectedDateMode, setSelectedDateMode] = useState<'today' | 'yesterday' | 'tomorrow' | 'custom'>('today');
  const [customPickedDate, setCustomPickedDate] = useState<{ dayLabel: string; dateStr: string; fullDate: Date } | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [alarmStation, setAlarmStation] = useState<string | null>(null);
  const [alarmInterval, setAlarmInterval] = useState<'10m' | '15m' | '30m' | '5km' | '10km'>('15m');
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'journey' | 'live_map' | 'coach_position' | 'info'>('journey');
  const [selectedCoach, setSelectedCoach] = useState<string>('C3');
  const [isSavedTrain, setIsSavedTrain] = useState<boolean>(false);
  const [expandedPassingGroups, setExpandedPassingGroups] = useState<{ [key: string]: boolean }>({});
  const [showHornBanner, setShowHornBanner] = useState(false);

  // Animations & tickers
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const whistleBounce = useRef(new Animated.Value(1)).current;
  const [nowTick, setNowTick] = useState(Date.now());
  const flatListRef = useRef<FlatList<TimelineItem>>(null);
  const hasAutoScrolled = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);

  // 1-second ticker while mounted
  useEffect(() => {
    const ticker = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // Pulse animation for train marker
  useEffect(() => {
    let isReduced = false;
    AccessibilityInfo.isReduceMotionEnabled().then((val) => {
      isReduced = val;
    });

    if (isReduced) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Hook into real honest data layer
  const {
    data: liveApiResponse,
    status: liveStatus,
    source: dataSource,
    fetchedAt,
    ageSeconds,
    provider,
    refresh,
    isRefreshing,
  } = useLiveStatus(trainNumber);

  // Build honest view-model
  const vm: TrackerViewModel = useMemo(() => {
    return buildTrackerViewModel(liveApiResponse, liveStatus, dataSource, provider, ageSeconds);
  }, [liveApiResponse, liveStatus, dataSource, provider, ageSeconds]);

  // Catalog static metadata fallback (only for rake / classes info, NEVER for fake stops)
  const catalogTrain = useMemo(() => {
    return CORRIDOR_TRAINS_MASTER.find((t) => t.number === trainNumber);
  }, [trainNumber]);

  // Saved train persistence
  useEffect(() => {
    SavedTrainsStore.isTrainSaved(trainNumber).then((saved) => setIsSavedTrain(saved));
    SavedTrainsStore.recordViewedTrain({
      number: trainNumber,
      name: vm.trainName || trainName || 'Train',
      fromCode: fromStationCode,
      toCode: toStationCode,
      isSaved: false,
    });
  }, [trainNumber, vm.trainName, trainName, fromStationCode, toStationCode]);

  const toggleSaveTrain = useCallback(async () => {
    const nextSaved = await SavedTrainsStore.toggleSaveTrain(
      trainNumber,
      vm.trainName || trainName || 'Train',
      fromStationCode,
      toStationCode
    );
    setIsSavedTrain(nextSaved);
  }, [trainNumber, vm.trainName, trainName, fromStationCode, toStationCode]);

  // Alarm persistence
  useEffect(() => {
    AlarmStore.getAlarmForTrain(trainNumber).then((saved) => {
      if (saved && !saved.fired) {
        setIsAlarmActive(true);
        setAlarmStation(saved.stationCode);
        setAlarmInterval(saved.mode as any);
      }
    });
  }, [trainNumber]);

  // Toggle passing groups
  const togglePassingGroup = useCallback((groupKey: string) => {
    setExpandedPassingGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);

  // Refresh with 20s rate limiting (Rule B.7)
  const triggerSpin = useCallback(() => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [spinAnim]);

  const handleManualRefresh = useCallback(async () => {
    triggerSpin();
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 20000) {
      return; // within 20s, only animate
    }
    lastFetchTimeRef.current = now;
    try {
      await refresh();
    } catch {}
  }, [refresh, triggerSpin]);

  // Horn animation
  const handlePlayHorn = useCallback(() => {
    Animated.sequence([
      Animated.timing(whistleBounce, { toValue: 1.35, duration: 90, useNativeDriver: true }),
      Animated.timing(whistleBounce, { toValue: 0.85, duration: 90, useNativeDriver: true }),
      Animated.timing(whistleBounce, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start();
    setShowHornBanner(true);
    setTimeout(() => setShowHornBanner(false), 2400);
  }, [whistleBounce]);

  // Share real data only (Rule C.13)
  const handleShare = useCallback(async () => {
    try {
      const num = vm.trainNumber || trainNumber;
      const name = vm.trainName || trainName || 'Train';
      const loc = vm.currentStation?.stationName
        ? `At ${vm.currentStation.stationName}`
        : vm.statusHeroHeadline || 'En route';
      const del = vm.delayMinutes > 0 ? `${vm.delayMinutes} min late` : 'On time';
      const d = new Date(fetchedAt || Date.now());
      const updatedTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      const msg = `${num} ${name} - ${loc}, ${del}. Updated ${updatedTime}.`;
      await Share.share({ message: msg });
    } catch {}
  }, [vm, trainNumber, trainName, fetchedAt]);

  // Start date calculation for day band
  const startDate = useMemo(() => {
    return getStartDateForMode(selectedDateMode, customPickedDate?.fullDate);
  }, [selectedDateMode, customPickedDate]);

  const formattedDay1Text = useMemo(() => {
    return formatDayBandText(startDate, 1);
  }, [startDate]);

  const datePillLabel = useMemo(() => {
    if (selectedDateMode === 'yesterday') return 'Yesterday';
    if (selectedDateMode === 'tomorrow') return 'Tomorrow';
    if (selectedDateMode === 'custom' && customPickedDate) return customPickedDate.dateStr;
    return 'Today';
  }, [selectedDateMode, customPickedDate]);

  // Active station index
  const activeStationIndex = vm.currentStationIndex >= 0 ? vm.currentStationIndex : 0;

  // Build Timeline Items list with Day 1 / Day 2 bands and collapsible intermediate groups
  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!vm.stations || vm.stations.length === 0) return [];
    const items: TimelineItem[] = [];
    let currentDay = 1;
    let currentPassing: { station: TimelineStation; originalIndex: number }[] = [];
    let groupIdx = 0;

    vm.stations.forEach((st, idx) => {
      const stDay = st.day || 1;
      // Day crossing band (Rule A.5)
      if (stDay > currentDay && idx > 0) {
        if (currentPassing.length > 0) {
          items.push({
            type: 'passingGroup',
            key: `pass-group-${groupIdx++}`,
            stations: [...currentPassing],
          });
          currentPassing = [];
        }
        currentDay = stDay;
        items.push({
          type: 'dayHeader',
          key: `day-header-${currentDay}`,
          dayNumber: currentDay,
          dayText: formatDayBandText(startDate, currentDay),
        });
      }

      if (st.isPassing) {
        currentPassing.push({ station: st, originalIndex: idx });
      } else {
        if (currentPassing.length > 0) {
          items.push({
            type: 'passingGroup',
            key: `pass-group-${groupIdx++}`,
            stations: [...currentPassing],
          });
          currentPassing = [];
        }
        items.push({
          type: 'commercial',
          key: `comm-${st.stationCode || idx}-${idx}`,
          station: st,
          originalIndex: idx,
          isFirst: idx === 0,
          isLast: idx === vm.stations.length - 1,
        });
      }
    });

    if (currentPassing.length > 0) {
      items.push({
        type: 'passingGroup',
        key: `pass-group-${groupIdx++}`,
        stations: [...currentPassing],
      });
    }

    return items;
  }, [vm.stations, startDate]);

  // Auto-scroll once on first load (Rule B.6)
  const scrollToCurrentStation = useCallback(() => {
    if (activeStationIndex >= 0 && flatListRef.current) {
      const listIdx = timelineItems.findIndex(
        (it) => it.type === 'commercial' && it.originalIndex === activeStationIndex
      );
      if (listIdx >= 0) {
        try {
          flatListRef.current.scrollToIndex({
            index: listIdx,
            viewPosition: 0.35,
            animated: true,
          });
        } catch {
          flatListRef.current.scrollToOffset({
            offset: listIdx * 68,
            animated: true,
          });
        }
      }
    }
  }, [activeStationIndex, timelineItems]);

  useEffect(() => {
    if (!hasAutoScrolled.current && activeStationIndex >= 0 && timelineItems.length > 0) {
      hasAutoScrolled.current = true;
      setTimeout(() => {
        scrollToCurrentStation();
      }, 450);
    }
  }, [activeStationIndex, timelineItems.length, scrollToCurrentStation]);

  useEffect(() => {
    hasAutoScrolled.current = false;
  }, [trainNumber]);

  // Bottom bar subtitle string (Rule A.1, A.2)
  const bottomBarSubtitle = useMemo(() => {
    return buildBottomBarMetaText(
      fetchedAt,
      vm.isStale,
      liveApiResponse?.currentSpeedKmH,
      provider
    );
  }, [fetchedAt, vm.isStale, liveApiResponse?.currentSpeedKmH, provider, nowTick]);

  // Origin & Destination display names
  const originCode = vm.originStation?.stationCode || catalogTrain?.originCode || fromStationCode || 'NDLS';
  const destCode = vm.destinationStation?.stationCode || catalogTrain?.destCode || toStationCode || 'BTI';
  const originName = vm.originStation?.stationName || catalogTrain?.originName || fromStationName || originCode;
  const destName = vm.destinationStation?.stationName || catalogTrain?.destName || toStationName || destCode;

  // Render FlatList Item
  const renderTimelineItem = useCallback(
    ({ item }: { item: TimelineItem }) => {
      if (item.type === 'dayHeader') {
        return <DayHeaderComponent dayText={item.dayText} isDarkMode={isDarkMode} colors={colors} />;
      }
      if (item.type === 'passingGroup') {
        return (
          <PassingGroupComponent
            item={item}
            currentStationIndex={activeStationIndex}
            isExpanded={Boolean(expandedPassingGroups[item.key])}
            onToggle={togglePassingGroup}
            pulseAnim={pulseAnim}
            colors={colors}
            isDarkMode={isDarkMode}
            t={t}
          />
        );
      }
      return (
        <StationRowComponent
          item={item}
          currentStationIndex={activeStationIndex}
          pulseAnim={pulseAnim}
          colors={colors}
          isDarkMode={isDarkMode}
          t={t}
        />
      );
    },
    [activeStationIndex, expandedPassingGroups, togglePassingGroup, pulseAnim, colors, isDarkMode, t]
  );

  const keyExtractor = useCallback((item: TimelineItem) => item.key, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
              {vm.trainNumber || trainNumber} - {vm.trainName || trainName || 'Train'}
            </Text>
            <Text style={styles.headerSubText} numberOfLines={1}>
              {originCode} ➔ {destCode} ({originName} to {destName})
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            {/* Note: REMOVE_HEADER_SHARE_ICON = true, so share stays exclusively in the pills row */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setShowMenuModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 2. ACTION PILLS BAR ================= */}
        <View style={[styles.actionPillsBar, isDarkMode && { backgroundColor: '#0B192C' }]}>
          {/* 1. Date Selector Pill */}
          <TouchableOpacity
            style={styles.todayActionPill}
            activeOpacity={0.85}
            onPress={() => setShowDateModal(true)}
          >
            <Text style={styles.todayActionPillText}>{datePillLabel}</Text>
            <Ionicons name="caret-down" size={13} color={Colors.primary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {/* 2. Alarm Pill */}
          <TouchableOpacity
            style={[styles.outlinedActionPill, isAlarmActive && { backgroundColor: '#16A34A', borderColor: '#16A34A' }]}
            onPress={() => setShowAlarmModal(true)}
            activeOpacity={0.75}
          >
            <Ionicons name={isAlarmActive ? 'alarm' : 'alarm-outline'} size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.outlinedActionPillText}>{isAlarmActive ? 'Alarm ON' : ((t as any)('alarm') || 'Alarm')}</Text>
          </TouchableOpacity>

          {/* 3. Coach Pill (REMOVE_COACH_PILL = false) */}
          <TouchableOpacity
            style={[
              styles.outlinedActionPill,
              activeTab === 'coach_position' && { backgroundColor: 'rgba(255, 255, 255, 0.35)', borderColor: '#FFFFFF' },
            ]}
            onPress={() => setActiveTab(activeTab === 'coach_position' ? 'journey' : 'coach_position')}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="train-car" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.outlinedActionPillText}>{(t as any)('coach') || 'Coach'}</Text>
          </TouchableOpacity>

          {/* 4. Share Pill */}
          <TouchableOpacity style={styles.outlinedActionPill} onPress={handleShare} activeOpacity={0.75}>
            <Ionicons name="share-social-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.outlinedActionPillText}>{(t as any)('share') || 'Share'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= 3. SUB TABS BAR ================= */}
      <View style={[styles.subTabsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[
          { key: 'journey', label: (t as any)('journey') || 'Journey' },
          { key: 'live_map', label: (t as any)('live_map') || 'Live Map' },
          { key: 'coach_position', label: (t as any)('coach_position') || 'Coach Position' },
          { key: 'info', label: (t as any)('info') || 'Info' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.subTabItem}
              onPress={() => setActiveTab(tab.key as any)}
              activeOpacity={0.75}
            >
              <Text style={[styles.subTabText, isActive && { color: Colors.primary, fontWeight: '800' }]}>
                {tab.label}
              </Text>
              {isActive && <View style={[styles.subTabActiveLine, { backgroundColor: Colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ================= TAB 1: JOURNEY (APPROVED TIMELINE VIEW) ================= */}
      {activeTab === 'journey' && (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Top Fixed Day 1 Header Bar */}
          <View style={styles.screenshot1HeaderBar}>
            <Text style={styles.screenshot1HeaderColText}>ARRIVAL</Text>
            <Text style={styles.screenshot1HeaderDayText}>{formattedDay1Text}</Text>
            <Text style={styles.screenshot1HeaderColText}>DEPARTURE</Text>
          </View>

          {/* Loading Shimmer State */}
          {vm.state === 'loading' && timelineItems.length === 0 ? (
            <SkeletonTimeline colors={colors} isDarkMode={isDarkMode} />
          ) : vm.state === 'unavailable' && timelineItems.length === 0 ? (
            /* Honest Unavailable / Offline State with Retry */
            <View style={[styles.unavailableBox, { backgroundColor: colors.surface }]}>
              <Ionicons name="cloud-offline-outline" size={44} color="#94A3B8" />
              <Text style={[styles.unavailableTitle, { color: colors.textPrimary }]}>
                Live tracking unavailable
              </Text>
              <Text style={[styles.unavailableDesc, { color: colors.textSecondary }]}>
                {vm.unavailableReason || 'Could not fetch current live location from Railway server.'}
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={handleManualRefresh} activeOpacity={0.8}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>{(t as any)('retry') || 'Retry'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={timelineItems}
              renderItem={renderTimelineItem}
              keyExtractor={keyExtractor}
              initialNumToRender={12}
              windowSize={9}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews={Platform.OS === 'android'}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 95 }}
              onScrollToIndexFailed={(info) => {
                flatListRef.current?.scrollToOffset({ offset: info.index * 68, animated: true });
              }}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={handleManualRefresh} colors={[Colors.primary]} />
              }
            />
          )}

          {/* Animated Horn Toast */}
          {showHornBanner && (
            <View style={styles.hornSimulatedBanner}>
              <MaterialCommunityIcons name="bullhorn" size={16} color="#FBBF24" style={{ marginRight: 6 }} />
              <Text style={styles.hornSimulatedText}>Train horn sound triggered 📢 Level crossing alert</Text>
            </View>
          )}

          {/* ================= FLOATING BOTTOM STATUS PILL + REFRESH FAB ================= */}
          <View style={styles.screenshot2FloatingBottomBar}>
            {/* Tapping pill scrolls to current station (Rule B.6) */}
            <TouchableOpacity
              style={[
                styles.screenshot2FloatingPill,
                { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', borderColor: isDarkMode ? '#334155' : '#E2E8F0' },
              ]}
              onPress={scrollToCurrentStation}
              activeOpacity={0.9}
            >
              <View style={[styles.screenshot2FloatingPillIcon, { backgroundColor: vm.delayMinutes > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                <MaterialCommunityIcons
                  name="train"
                  size={18}
                  color={vm.delayMinutes > 0 ? '#DC2626' : '#16A34A'}
                />
              </View>
              <View style={styles.screenshot2FloatingPillTextCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.screenshot2FloatingPillTitle, { color: colors.textPrimary, flexShrink: 1 }]} numberOfLines={1}>
                    {vm.state === 'not_started'
                      ? `Scheduled ${originName}`
                      : vm.state === 'completed'
                      ? `Arrived ${destName}`
                      : vm.currentStation?.stationName
                      ? `At ${vm.currentStation.stationName}`
                      : vm.statusHeroHeadline || 'Running'}
                    {vm.currentStation?.platform ? ` • PF ${vm.currentStation.platform.replace(/Platform\s*/i, '')}` : ''}
                  </Text>
                  <View
                    style={[
                      styles.bottomPillDelayBadge,
                      {
                        backgroundColor:
                          vm.delayMinutes <= 0
                            ? '#DCFCE7'
                            : vm.delayMinutes <= 15
                            ? '#FEF3C7'
                            : '#FEE2E2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bottomPillDelayBadgeText,
                        {
                          color:
                            vm.delayMinutes <= 0
                              ? '#15803D'
                              : vm.delayMinutes <= 15
                              ? '#D97706'
                              : '#DC2626',
                        },
                      ]}
                    >
                      {vm.delayMinutes <= 0 ? 'On Time' : `+${vm.delayMinutes}m`}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.screenshot2FloatingPillSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {bottomBarSubtitle}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.screenshot2WhistleBtn}
                onPress={handlePlayHorn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.8}
              >
                <Animated.View style={{ transform: [{ scale: whistleBounce }] }}>
                  <MaterialCommunityIcons name="bullhorn-outline" size={17} color={isDarkMode ? '#FBBF24' : '#D97706'} />
                </Animated.View>
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Circular Refresh FAB (Rate limited to 20s) */}
            <TouchableOpacity
              style={styles.screenshot2CircularRefreshBtn}
              onPress={handleManualRefresh}
              activeOpacity={0.85}
              disabled={isRefreshing}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="refresh" size={22} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ================= TAB 2: LIVE MAP VIEW ================= */}
      {activeTab === 'live_map' && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="map-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Live Route Schematic</Text>
            </View>
            {vm.stations.filter((s) => !s.isPassing).map((st, i, arr) => {
              const isCurr = i === activeStationIndex;
              const isPast = i < activeStationIndex;
              return (
                <View key={st.stationCode} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
                  <View style={{ width: 20, alignItems: 'center' }}>
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: isCurr ? Colors.primary : isPast ? '#16A34A' : '#94A3B8',
                      }}
                    />
                    {i < arr.length - 1 && (
                      <View style={{ width: 2, height: 26, backgroundColor: isPast ? '#16A34A' : '#CBD5E1', marginTop: 2 }} />
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                      {st.stationName} ({st.stationCode})
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      {st.scheduledArrival} - {st.scheduledDeparture}
                      {st.platform ? ` • PF ${st.platform}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ================= TAB 3: COACH POSITION ================= */}
      {activeTab === 'coach_position' && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <MaterialCommunityIcons name="train-car" size={22} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Coach Composition</Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
              Standard rake formation for {vm.trainName || trainName || 'Train'}:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              {['ENG', 'GEN', 'S1', 'S2', 'S3', 'B1', 'B2', 'A1', 'GEN', 'SLR'].map((c, idx) => (
                <View
                  key={idx}
                  style={{
                    width: 58,
                    height: 52,
                    borderRadius: 8,
                    borderWidth: 1.5,
                    borderColor: c === selectedCoach ? Colors.primary : colors.border,
                    backgroundColor: c === selectedCoach ? (isDarkMode ? '#1E3A5F' : '#E0F2FE') : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>{c}</Text>
                  <Text style={{ fontSize: 9, color: colors.textSecondary }}>
                    {c === 'ENG' ? 'Engine' : c.startsWith('S') ? 'Sleeper' : c.startsWith('B') ? '3AC' : c.startsWith('A') ? '2AC' : 'General'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* ================= TAB 4: INFO ================= */}
      {activeTab === 'info' && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 12 }]}>Train Specifications</Text>
            {[
              { label: 'Train Number', val: vm.trainNumber || trainNumber },
              { label: 'Train Name', val: vm.trainName || trainName || 'Express' },
              { label: 'Type', val: vm.trainType || 'Superfast Express' },
              { label: 'Source Route', val: `${originName} (${originCode})` },
              { label: 'Destination', val: `${destName} (${destCode})` },
              { label: 'Commercial Halts', val: `${vm.totalHaltsCount || vm.stations.filter(s => !s.isPassing).length} Stations` },
              { label: 'Total Distance', val: vm.totalDistanceKm ? `${vm.totalDistanceKm} km` : 'Route Schedule' },
              { label: 'Tracking Source', val: vm.provider ? `${vm.provider} (Official GPS / Satellite)` : 'Indian Railways GPS' },
            ].map((row, idx) => (
              <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{row.label}</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.textPrimary }}>{row.val}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ================= MODAL: DATE SELECTOR ================= */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDateModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Journey Date</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {[
              { mode: 'today', label: 'Today (Runs Today)' },
              { mode: 'yesterday', label: 'Yesterday (Started Yesterday)' },
              { mode: 'tomorrow', label: 'Tomorrow (Upcoming)' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.mode}
                style={[
                  styles.alarmStationRow,
                  { borderBottomColor: colors.border },
                  selectedDateMode === opt.mode && { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' },
                ]}
                onPress={() => {
                  setSelectedDateMode(opt.mode as any);
                  setShowDateModal(false);
                }}
              >
                <Text style={[styles.alarmStationText, { color: colors.textPrimary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= MODAL: ALARM ================= */}
      <Modal visible={showAlarmModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAlarmModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="alarm" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Set Station Alarm</Text>
              <TouchableOpacity onPress={() => setShowAlarmModal(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Alert threshold before reaching station (works while app is foregrounded):
            </Text>
            <View style={styles.alarmIntervalRow}>
              {[
                { id: '10m', label: '10m' },
                { id: '15m', label: '15m' },
                { id: '30m', label: '30m' },
                { id: '5km', label: '5km' },
                { id: '10km', label: '10km' },
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

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {isAlarmActive && (
                <TouchableOpacity
                  style={[styles.saveAlarmBtn, { flex: 1, backgroundColor: '#EF4444' }]}
                  onPress={async () => {
                    await AlarmStore.clearAlarm(trainNumber);
                    setIsAlarmActive(false);
                    setShowAlarmModal(false);
                  }}
                >
                  <Text style={styles.saveAlarmBtnText}>CANCEL</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveAlarmBtn, { flex: isAlarmActive ? 1 : 2 }]}
                onPress={async () => {
                  const targetCode = alarmStation || vm.nextStation?.stationCode || vm.stations[0]?.stationCode || 'STN';
                  const targetName = vm.nextStation?.stationName || targetCode;
                  await AlarmStore.saveAlarm({
                    trainNumber,
                    stationCode: targetCode,
                    stationName: targetName,
                    mode: alarmInterval,
                    createdAt: Date.now(),
                  });
                  setIsAlarmActive(true);
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
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenuModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Train Options</Text>
              <TouchableOpacity onPress={() => setShowMenuModal(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.alarmStationRow, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowMenuModal(false);
                toggleSaveTrain();
              }}
            >
              <Ionicons name={isSavedTrain ? 'star' : 'star-outline'} size={18} color="#EAB308" style={{ marginRight: 10 }} />
              <Text style={[styles.alarmStationText, { color: colors.textPrimary }]}>
                {isSavedTrain ? 'Remove from Saved Trains' : 'Save this Train'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.alarmStationRow, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowMenuModal(false);
                handleManualRefresh();
              }}
            >
              <Ionicons name="refresh" size={18} color={Colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.alarmStationText, { color: colors.textPrimary }]}>Refresh Live Location</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ==========================================
// STYLESHEET (100% Matching Screenshot Design)
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerWrapper: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 44 : 10,
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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
  },
  headerBackBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 6,
    marginLeft: 6,
  },
  actionPillsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  todayActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 16,
  },
  todayActionPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  outlinedActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  outlinedActionPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    position: 'relative',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabActiveLine: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2.5,
    borderRadius: 1.5,
  },

  // Screenshot Dark Day Strip
  screenshot1HeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  screenshot1HeaderColText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  screenshot1HeaderDayText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Station Row Design
  stationTimelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 68,
    paddingHorizontal: 8,
    paddingVertical: 0,
    backgroundColor: '#FFFFFF',
  },
  timeColLeft: {
    width: 66,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  timeColRight: {
    width: 66,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  schedTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  actualTimeText: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  textPassedGreen: {
    color: '#16A34A',
  },
  textDelayedRed: {
    color: '#DC2626',
  },

  // Track Column
  trackTrackWrapper: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    position: 'relative',
  },
  trackLineContinuousTop: {
    position: 'absolute',
    top: -4,
    bottom: '50%',
    width: 4,
    left: 15,
    zIndex: 1,
  },
  trackLineContinuousBottom: {
    position: 'absolute',
    top: '50%',
    bottom: -4,
    width: 4,
    left: 15,
    zIndex: 1,
  },
  passedCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  reachingStationBadgeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  currentStationPulseHalo: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(2, 132, 199, 0.35)',
    zIndex: 3,
  },
  currentTrainBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  upcomingGrayCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#94A3B8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 4,
  },
  destRedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 4,
  },

  // Station Info Column
  stationInfoCol: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  stationNameText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: '#0F172A',
  },
  screenshotStationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  screenshotDistanceText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
  },
  screenshotPlatformBox: {
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotPlatformBoxText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  screenshotDelayPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  screenshotDelayPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  currentBlueStatusBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  currentBlueStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },

  // Intermediate Station Capsule
  intermediateCapsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginVertical: 4,
  },
  intermediateCapsuleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },

  // Floating Bottom Bar
  screenshot2FloatingBottomBar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 99,
  },
  screenshot2FloatingPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 10,
    elevation: 5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  screenshot2FloatingPillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  screenshot2FloatingPillTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  screenshot2FloatingPillTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  bottomPillDelayBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  bottomPillDelayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  screenshot2FloatingPillSub: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  screenshot2WhistleBtn: {
    padding: 6,
    marginLeft: 4,
  },
  screenshot2CircularRefreshBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Horn Banner
  hornSimulatedBanner: {
    position: 'absolute',
    bottom: 74,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    zIndex: 100,
  },
  hornSimulatedText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Unavailable Box
  unavailableBox: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 4,
  },
  unavailableDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },

  // Card & Generic tab styles
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
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
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  modalSubtitle: {
    fontSize: 11.5,
    marginBottom: 10,
  },
  alarmIntervalRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  alarmIntervalChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  alarmIntervalChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  alarmIntervalText: {
    fontSize: 11,
    fontWeight: '700',
  },
  alarmIntervalTextActive: {
    color: '#FFFFFF',
  },
  alarmStationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  alarmStationText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveAlarmBtn: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveAlarmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
