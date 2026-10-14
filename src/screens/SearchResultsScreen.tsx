import React, { useState, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { TrainBetweenStation, getTrainsBetweenStations } from '../data/trainsBetweenStations';
import { Station } from '../data/stations';
import { usePreferences } from '../context/PreferencesContext';

interface SearchResultsScreenProps {
  fromStation: Station;
  toStation: Station;
  selectedDate: string;
  onBack: () => void;
  onTrackTrain: (trainNumber: string, trainName: string) => void;
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

function get20RandomTrains(fromCode: string, toCode: string): TrainBetweenStation[] {
  const list = [
    { id: '22436', number: '22436', name: 'Vande Bharat Express', type: 'Superfast', depTime: '06:00 AM', arrTime: '10:08 AM', duration: '04h 08m', totalHaults: 2, classes: [{ type: 'CC', price: 1185, status: 'AVL 42', statusType: 'available', updatedText: 'Live' }, { type: 'EC', price: 2115, status: 'AVL 08', statusType: 'available', updatedText: 'Live' }] },
    { id: '12004', number: '12004', name: 'Lucknow Swarna Shatabdi', type: 'Shatabdi', depTime: '06:10 AM', arrTime: '11:20 AM', duration: '05h 10m', totalHaults: 4, classes: [{ type: 'CC', price: 920, status: 'AVL 114', statusType: 'available', updatedText: 'Live' }, { type: 'EC', price: 1675, status: 'AVL 16', statusType: 'available', updatedText: 'Live' }] },
    { id: '12418', number: '12418', name: 'Prayagraj Express', type: 'Superfast', depTime: '10:10 PM', arrTime: '03:55 AM', duration: '05h 45m', totalHaults: 2, classes: [{ type: 'SL', price: 345, status: 'AVL 88', statusType: 'available', updatedText: 'Live' }, { type: '3A', price: 890, status: 'WL 14', statusType: 'waiting', updatedText: 'Live' }, { type: '2A', price: 1250, status: 'RAC 04', statusType: 'rac', updatedText: 'Live' }, { type: '1A', price: 2100, status: 'AVL 02', statusType: 'available', updatedText: 'Live' }] },
    { id: '12560', number: '12560', name: 'Shiv Ganga Express', type: 'Superfast', depTime: '08:05 PM', arrTime: '01:25 AM', duration: '05h 20m', totalHaults: 1, classes: [{ type: 'SL', price: 320, status: 'AVL 45', statusType: 'available', updatedText: 'Live' }, { type: '3A', price: 840, status: 'AVL 18', statusType: 'available', updatedText: 'Live' }, { type: '2A', price: 1190, status: 'AVL 06', statusType: 'available', updatedText: 'Live' }] },
    { id: '12424', number: '12424', name: 'Dibrugarh Rajdhani Express', type: 'Rajdhani', depTime: '04:10 PM', arrTime: '09:15 PM', duration: '05h 05m', totalHaults: 1, classes: [{ type: '3A', price: 1340, status: 'AVL 64', statusType: 'available', updatedText: 'Live' }, { type: '2A', price: 1880, status: 'AVL 12', statusType: 'available', updatedText: 'Live' }, { type: '1A', price: 2950, status: 'WL 02', statusType: 'waiting', updatedText: 'Live' }] },
    { id: '12582', number: '12582', name: 'Banaras SF Express', type: 'Superfast', depTime: '10:50 PM', arrTime: '04:45 AM', duration: '05h 55m', totalHaults: 3, classes: [{ type: '2S', price: 190, status: 'AVL 130', statusType: 'available', updatedText: 'Live' }, { type: 'SL', price: 335, status: 'AVL 52', statusType: 'available', updatedText: 'Live' }, { type: '3A', price: 870, status: 'WL 09', statusType: 'waiting', updatedText: 'Live' }] },
    { id: '12452', number: '12452', name: 'Shram Shakti Express', type: 'Superfast', depTime: '11:55 PM', arrTime: '06:00 AM', duration: '06h 05m', totalHaults: 1, classes: [{ type: '2S', price: 175, status: 'AVL 76', statusType: 'available', updatedText: 'Live' }, { type: 'SL', price: 310, status: 'AVL 34', statusType: 'available', updatedText: 'Live' }, { type: '3A', price: 820, status: 'AVL 15', statusType: 'available', updatedText: 'Live' }, { type: '2A', price: 1150, status: 'AVL 08', statusType: 'available', updatedText: 'Live' }] },
    { id: '12398', number: '12398', name: 'Mahabodhi Express', type: 'Superfast', depTime: '12:50 PM', arrTime: '05:55 PM', duration: '05h 05m', totalHaults: 2, classes: [{ type: '2S', price: 180, status: 'AVL 94', statusType: 'available', updatedText: 'Live' }, { type: 'SL', price: 325, status: 'RAC 12', statusType: 'rac', updatedText: 'Live' }, { type: '3A', price: 860, status: 'AVL 22', statusType: 'available', updatedText: 'Live' }] },
    { id: '12878', number: '12878', name: 'Ranchi Garib Rath', type: 'Superfast', depTime: '04:10 PM', arrTime: '09:40 PM', duration: '05h 30m', totalHaults: 1, classes: [{ type: '3A', price: 685, status: 'AVL 110', statusType: 'available', updatedText: 'Live' }] },
    { id: '12276', number: '12276', name: 'Prayagraj Humsafar Express', type: 'Superfast', depTime: '10:30 PM', arrTime: '04:20 AM', duration: '05h 50m', totalHaults: 1, classes: [{ type: '3A', price: 865, status: 'AVL 58', statusType: 'available', updatedText: 'Live' }] },
    { id: '12420', number: '12420', name: 'Gomti Express', type: 'Express', depTime: '12:20 PM', arrTime: '07:35 PM', duration: '07h 15m', totalHaults: 12, classes: [{ type: '2S', price: 160, status: 'AVL 240', statusType: 'available', updatedText: 'Live' }, { type: 'CC', price: 640, status: 'AVL 38', statusType: 'available', updatedText: 'Live' }, { type: '2A', price: 1080, status: 'AVL 10', statusType: 'available', updatedText: 'Live' }] },
    { id: '14218', number: '14218', name: 'Unchahar Express', type: 'Express', depTime: '09:10 PM', arrTime: '05:35 AM', duration: '08h 25m', totalHaults: 16, classes: [{ type: '2S', price: 145, status: 'AVL 180', statusType: 'available', updatedText: 'Live' }, { type: 'SL', price: 270, status: 'AVL 65', statusType: 'available', updatedText: 'Live' }, { type: '3A', price: 730, status: 'WL 08', statusType: 'waiting', updatedText: 'Live' }] },
    { id: '12402', number: '12402', name: 'Magadh Express', type: 'Superfast', depTime: '09:05 PM', arrTime: '03:15 AM', duration: '06h 10m', totalHaults: 4, classes: [{ type: 'SL', price: 330, status: 'AVL 40', statusType: 'available', updatedText: 'Live' }, { type: '3A', price: 880, status: 'AVL 12', statusType: 'available', updatedText: 'Live' }, { type: '2A', price: 1230, status: 'RAC 02', statusType: 'rac', updatedText: 'Live' }] },
    { id: '20802', number: '20802', name: 'Magadh Superfast Express', type: 'Superfast', depTime: '07:50 PM', arrTime: '01:40 AM', duration: '05h 50m', totalHaults: 2, classes: [{ type: 'SL', price: 340, status: 'AVL 92', statusType: 'available', updatedText: 'Live' }, { type: '3A', price: 895, status: 'AVL 24', statusType: 'available', updatedText: 'Live' }, { type: '2A', price: 1260, status: 'AVL 07', statusType: 'available', updatedText: 'Live' }] },
    { id: '12259', number: '12259', name: 'Sealdah Duronto Express', type: 'Duronto', depTime: '08:00 PM', arrTime: '04:00 AM', duration: '08h 00m', totalHaults: 0, classes: [{ type: '3A', price: 1100, status: 'AVL 50', statusType: 'available', updatedText: 'Live' }, { type: '2A', price: 1650, status: 'AVL 15', statusType: 'available', updatedText: 'Live' }, { type: '1A', price: 2700, status: 'AVL 05', statusType: 'available', updatedText: 'Live' }] },
    { id: '12313', number: '12313', name: 'Sealdah Rajdhani Express', type: 'Rajdhani', depTime: '04:25 PM', arrTime: '10:05 PM', duration: '05h 40m', totalHaults: 2, classes: [{ type: '3A', price: 1420, status: 'AVL 30', statusType: 'available', updatedText: 'Live' }, { type: '2A', price: 1950, status: 'AVL 10', statusType: 'available', updatedText: 'Live' }] },
    { id: '12951', number: '12951', name: 'Tejas Rajdhani Express', type: 'Rajdhani', depTime: '05:00 PM', arrTime: '08:30 AM', duration: '15h 30m', totalHaults: 5, classes: [{ type: '3A', price: 1550, status: 'AVL 80', statusType: 'available', updatedText: 'Live' }, { type: '2A', price: 2100, status: 'AVL 25', statusType: 'available', updatedText: 'Live' }] },
    { id: '22415', number: '22415', name: 'Andhra Pradesh AC Superfast', type: 'Superfast', depTime: '06:25 AM', arrTime: '02:15 PM', duration: '07h 50m', totalHaults: 6, classes: [{ type: '3A', price: 980, status: 'AVL 60', statusType: 'available', updatedText: 'Live' }, { type: '2A', price: 1400, status: 'AVL 18', statusType: 'available', updatedText: 'Live' }] },
    { id: '12615', number: '12615', name: 'Grand Trunk Express', type: 'Express', depTime: '04:40 PM', arrTime: '06:20 AM', duration: '13h 40m', totalHaults: 18, classes: [{ type: 'SL', price: 410, status: 'AVL 105', statusType: 'available', updatedText: 'Live' }, { type: '3A', price: 1120, status: 'WL 05', statusType: 'waiting', updatedText: 'Live' }] },
    { id: '64902', number: '64902', name: 'Ghaziabad - Kanpur MEMU Local', type: 'EMU Local', isLocalEmu: true, depTime: '05:30 AM', arrTime: '01:45 PM', duration: '08h 15m', totalHaults: 24, classes: [{ type: '2S', price: 95, status: 'UNRESERVED', statusType: 'unreserved', updatedText: 'Live' }] },
  ];

  return list.map((t, idx) => ({
    ...t,
    id: `${t.number}-${idx}`,
    type: (t.type === 'Duronto' ? 'Superfast' : t.type) as any,
    isLocalEmu: !!(t as any).isLocalEmu,
    fromStationCode: fromCode || 'NDLS',
    fromStationName: 'Origin Station',
    toStationCode: toCode || 'PRYJ',
    toStationName: 'Dest Station',
    runsOn: [true, true, true, true, true, true, true],
  })) as TrainBetweenStation[];
}

export interface DynamicDateItem {
  label: string;
  dayLabel: string; // e.g. "Yesterday" | "Today" | "Tomorrow" | "Mon"
  dateStr: string;
  dayFull: string;
  dayShort: string;
  formattedDate: string; // e.g. "Thu, 19 Sep" (No Year)
  isToday?: boolean;
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
      });
    }
    return list;
  }, []);

  const activeDateInfo = useMemo(() => {
    const matched =
      dynamicDates.find((d) => d.label === currentDate || d.dateStr === currentDate || currentDate.includes(d.dateStr)) ||
      calendarDates.find((d) => d.label === currentDate || d.dateStr === currentDate || currentDate.includes(d.dateStr));
    if (matched) {
      return {
        formattedDate: matched.formattedDate,
        dayName: matched.dayFull,
        date: matched.dateStr,
      };
    }
    const now = new Date();
    const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      formattedDate: `${daysShort[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`,
      dayName: daysFull[now.getDay()],
      date: currentDate,
    };
  }, [currentDate, dynamicDates, calendarDates]);

  const rawTrains = useMemo(() => {
    const corridorTrains = getTrainsBetweenStations(fromStation.code, toStation.code);
    if (corridorTrains && corridorTrains.length >= 20) {
      return corridorTrains;
    }
    // Return 20 random train cards for testing as requested
    return get20RandomTrains(fromStation.code, toStation.code);
  }, [fromStation.code, toStation.code]);

  const classFilteredTrains = useMemo(() => {
    if (selectedClassFilter === 'All') return rawTrains;
    return rawTrains.filter((t) =>
      t.classes.some((c) => c.type.toUpperCase().includes(selectedClassFilter.toUpperCase()))
    );
  }, [rawTrains, selectedClassFilter]);

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

  // Render Compact High-Density Train Card (4-5 trains per screen without scrolling)
  const renderTrainCard = useCallback(
    ({ item, index }: { item: TrainBetweenStation; index: number }) => {
      const runningDaysLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const isNotRunningToday = index % 5 === 0; // Realistic demo flag for not running today
      const departedStatus =
        index % 3 === 0
          ? `Left ${item.fromStationCode} at ${item.depTime} (${(index + 1) * 3} min late)`
          : index % 4 === 0
          ? `On time · Departs at ${item.depTime}`
          : null;

      return (
        <TouchableOpacity
          style={[
            styles.compactTrainCard,
            isDarkMode && { backgroundColor: colors.surface, borderColor: colors.border },
            item.isLocalEmu && styles.emuCardHighlight,
          ]}
          activeOpacity={0.82}
          onPress={() => onTrackTrain(item.number, item.name)}
        >
          {/* Line 1: [Train Badge]  DepTime ── ArrTime  [Days S M T W T F S]  > */}
          <View style={styles.cardHeaderRow}>
            <View style={[styles.compactNumBadge, item.isLocalEmu && styles.emuNumBadge]}>
              <Text style={styles.compactNumText}>{item.number}</Text>
            </View>

            <View style={styles.cardTimeBlock}>
              <Text style={[styles.timeMainText, isDarkMode && { color: colors.textPrimary }]}>{item.depTime}</Text>
              <Text style={[styles.timeDashText, isDarkMode && { color: colors.textSecondary }]}>──</Text>
              <Text style={[styles.timeMainText, isDarkMode && { color: colors.textPrimary }]}>{item.arrTime}</Text>
            </View>

            {/* Days letters S M T W T F S */}
            <View style={styles.daysLetterRow}>
              {item.runsOn.map((runs, dIdx) => (
                <Text
                  key={dIdx}
                  style={[styles.dayLetterChar, runs ? styles.dayActiveText : styles.dayInactiveText]}
                >
                  {runningDaysLetters[dIdx]}
                </Text>
              ))}
            </View>

            <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={{ marginLeft: 6 }} />
          </View>

          {/* Line 2: Duration | Stops */}
          <View style={styles.cardSubDetailsRow}>
            <Text style={[styles.durationStopsText, isDarkMode && { color: colors.textSecondary }]}>
              {item.duration} · {item.totalHaults > 0 ? `${item.totalHaults} Stops` : 'Non-stop'}
            </Text>
          </View>

          {/* Line 3: Train Name */}
          <Text style={[styles.compactTrainName, isDarkMode && { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Line 4: Running Status / Departed Status */}
          {isNotRunningToday ? (
            <Text style={styles.statusNotRunningText}>Not running today</Text>
          ) : departedStatus ? (
            <Text style={styles.statusDepartedText}>{departedStatus}</Text>
          ) : null}
        </TouchableOpacity>
      );
    },
    [onTrackTrain, isDarkMode, colors]
  );

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: colors.background }]}>
      {/* ================= 1. COMPACT TOP HEADER & SHARE ================= */}
      {/* ================= 1. WHERE IS MY TRAIN STYLE TOP HEADER ================= */}
      <View style={styles.header}>
        {/* Circular Back Button */}
        <TouchableOpacity style={styles.headerCircleBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Center 3-Line Info Column */}
        <View style={styles.headerCenterCol}>
          {/* Line 1: NDLS ➔ PRYJ */}
          <Text style={styles.routeHeaderTitle}>
            {fromStation.code} ➔ {toStation.code}
          </Text>

          {/* Line 2: New Delhi to Prayagraj Junction */}
          <Text style={styles.routeHeaderSubtitle} numberOfLines={1}>
            {fromStation.name} to {toStation.name}
          </Text>

          {/* Line 3: Thu, 19 Sep · 2 Trains (No Year) */}
          <Text style={styles.routeHeaderDateRow} numberOfLines={1}>
            {activeDateInfo.formattedDate} · {sortedTrains.length} {sortedTrains.length === 1 ? 'Train' : 'Trains'}
          </Text>
        </View>

        {/* Right Action Buttons: Bell Notification & Share */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => {
              setNotificationMsg('Notification alarm set for this route!');
              setCopiedNotification(true);
              setTimeout(() => setCopiedNotification(false), 2200);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerCircleBtn, { marginLeft: 8 }]}
            onPress={() => {
              setNotificationMsg('Train list copied to clipboard!');
              handleShareResults();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Copied Toast Notification */}
      {copiedNotification && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.toastText}>{notificationMsg}</Text>
        </View>
      )}

      {/* ================= 2. WHERE IS MY TRAIN STYLE FILTER BAR ================= */}
      <View style={styles.filterMasterBar}>
        {/* ROW 1: 2-Line Date Pills + Rightmost Calendar Button */}
        <View style={styles.dateRowWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateFilterScroll}
            contentContainerStyle={styles.dateFilterScrollContent}
          >
            {dynamicDates.map((item) => {
              const isSelected =
                currentDate === item.label ||
                activeDateInfo.formattedDate === item.formattedDate ||
                currentDate.includes(item.dateStr);
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.datePillCard, isSelected && styles.datePillCardActive]}
                  onPress={() => setCurrentDate(item.label)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.datePillDayText, isSelected && styles.datePillDayTextActive]}>
                    {item.dayLabel}
                  </Text>
                  <Text style={[styles.datePillDateText, isSelected && styles.datePillDateTextActive]}>
                    {item.dateStr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Rightmost Calendar Button */}
          <TouchableOpacity
            style={styles.calendarCircleBtn}
            onPress={() => setShowCalendarModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ROW 2: 3 Action Filter Buttons (Sort, All Classes, Filters) */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.actionFilterChip}
            onPress={() => setShowSortModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-horizontal" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.actionFilterChipText}>{getSortLabel()}</Text>
            <Ionicons name="chevron-down" size={13} color={Colors.primary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionFilterChip}
            onPress={() => setShowClassModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="train-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.actionFilterChipText}>
              {selectedClassFilter === 'All' ? 'All Classes' : `${selectedClassFilter} Class`}
            </Text>
            <Ionicons name="chevron-down" size={13} color={Colors.primary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionFilterChip}
            onPress={() => setShowSortModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="funnel-outline" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.actionFilterChipText}>Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= 3. COMPACT TRAIN CARDS LIST ================= */}
      <FlatList
        data={sortedTrains}
        keyExtractor={(item) => item.id}
        renderItem={renderTrainCard}
        contentContainerStyle={[styles.listContainer, sortedTrains.length === 0 && { flexGrow: 1, justifyContent: 'center' }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="train" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No trains found</Text>
            <Text style={styles.emptySub}>
              {selectedClassFilter !== 'All'
                ? `No trains available for class '${selectedClassFilter}'. Try selecting 'All Classes'.`
                : `No direct trains found between ${fromStation.name} (${fromStation.code}) and ${toStation.name} (${toStation.code}).`}
            </Text>
          </View>
        }
      />

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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  emuCardHighlight: {
    borderColor: '#BBF7D0',
  },

  // Line 1: Header
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  compactNumBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  emuNumBadge: {
    backgroundColor: '#15803D',
  },
  compactNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeMainText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  timeDashText: {
    fontSize: 11,
    color: '#94A3B8',
    marginHorizontal: 4,
    fontWeight: '600',
  },
  daysLetterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  dayLetterChar: {
    fontSize: 10,
    fontWeight: '800',
    marginHorizontal: 1,
  },
  dayActiveText: {
    color: Colors.primary,
  },
  dayInactiveText: {
    color: '#CBD5E1',
  },
  cardSubDetailsRow: {
    marginBottom: 2,
  },
  durationStopsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  compactTrainName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  statusNotRunningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  statusDepartedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
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
