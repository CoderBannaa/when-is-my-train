import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrainBetweenStation } from '../../data/trainsBetweenStations';
import { DayChips } from './DayChips';
import {
  parseTimeToMinutes,
  formatTime12h,
  parseDurationMinutes,
  formatDuration,
  getArrivalDayOffset,
} from '../../utils/trainTime';

export function deriveTrainTypeName(trainName: string, fallbackType: string): string {
  const upper = (trainName || '').toUpperCase();
  if (upper.includes('VANDE BHARAT')) return 'Vande Bharat';
  if (upper.includes('RAJDHANI')) return 'Rajdhani';
  if (upper.includes('SHATABDI')) return 'Shatabdi';
  if (upper.includes('GATIMAAN')) return 'Gatimaan';
  if (upper.includes('DURONTO')) return 'Duronto';
  if (upper.includes('HUMSAFAR')) return 'Humsafar';
  if (upper.includes('INTERCITY')) return 'Intercity';
  return fallbackType || 'Express';
}

export function getNextRunningDate(
  selectedDate: Date,
  runsOn: boolean[] = [true, true, true, true, true, true, true]
): { dayName: string; formattedDate: string } | null {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 1; i <= 7; i++) {
    const next = new Date(selectedDate.getTime() + i * 86400000);
    const dayIdx = next.getDay();
    if (runsOn[dayIdx]) {
      return {
        dayName: days[dayIdx],
        formattedDate: `${next.getDate()} ${months[next.getMonth()]}`,
      };
    }
  }
  return null;
}

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface TrainResultCardProps {
  train: TrainBetweenStation;
  selectedDate: Date;
  isFastest?: boolean;
  isDarkMode?: boolean;
  onPress: (trainNumber: string, trainName: string) => void;
  t?: (key: any) => string;
}

export const TrainResultCard: React.FC<TrainResultCardProps> = React.memo(({
  train,
  selectedDate,
  isFastest = false,
  isDarkMode = false,
  onPress,
  t = (s: any) => s,
}) => {
  const selectedDayIndex = selectedDate.getDay();
  const runsOn = train.runsOn || [true, true, true, true, true, true, true];
  const runsToday = !!runsOn[selectedDayIndex];
  const runsDaily = runsOn.length === 7 && runsOn.every(Boolean);

  // Departed check
  const now = new Date();
  const isToday =
    selectedDate.getFullYear() === now.getFullYear() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getDate() === now.getDate();

  const depMinutes = parseTimeToMinutes(train.depTime);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isDeparted = isToday && depMinutes < nowMinutes;

  const durationMin = parseDurationMinutes(train.duration);
  const dayOffset = getArrivalDayOffset(train.depTime, durationMin);
  const trainType = deriveTrainTypeName(train.name, train.type);

  const isDimmed = !runsToday || isDeparted;
  const nextRun = !runsToday ? getNextRunningDate(selectedDate, runsOn) : null;
  const currentDayName = SHORT_DAY_NAMES[selectedDayIndex];

  // Accessible string representation
  const a11yLabel = `Train ${train.number} ${train.name}, departs ${formatTime12h(
    train.depTime
  )}, arrives ${formatTime12h(train.arrTime)}, duration ${formatDuration(durationMin)}, ${
    runsDaily ? 'runs daily' : runsToday ? 'runs today' : 'not running today'
  }`;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onPress(train.number, train.name)}
      accessible={true}
      accessibilityLabel={a11yLabel}
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0',
          opacity: isDimmed ? 0.68 : 1,
        },
      ]}
    >
      {/* ROW 1: Number Badge + Departure/Duration/Arrival + (+1) + FASTEST Tag */}
      <View style={styles.rowTop}>
        <View style={styles.rowLeftTop}>
          {/* Train Number Pill Badge */}
          <View
            style={[
              styles.numberBadge,
              {
                backgroundColor: !isDimmed
                  ? (isDarkMode ? '#0284C7' : '#2563EB')
                  : (isDarkMode ? '#475569' : '#64748B'),
              },
            ]}
          >
            <Text style={styles.numberBadgeText}>{train.number}</Text>
          </View>

          {/* Times: 11:25 AM — 7h 15m — 6:40 PM */}
          <View style={styles.timeGroup}>
            <Text style={[styles.timeBold, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
              {formatTime12h(train.depTime)}
            </Text>
            <Text style={[styles.durationDash, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
              {' '}—{' '}{formatDuration(durationMin)}{' '}—{' '}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={[styles.timeBold, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                {formatTime12h(train.arrTime)}
              </Text>
              {dayOffset > 0 && (
                <Text style={styles.superscriptDay}>+{dayOffset}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Small FASTEST Tag */}
        {isFastest && !isDimmed && (
          <View style={styles.fastestBadge}>
            <Text style={styles.fastestBadgeText}>{t('fastest') || 'FASTEST'}</Text>
          </View>
        )}
      </View>

      {/* ROW 2: Train Name + Type Tag on Left, Runs Daily / DayChips on Right */}
      <View style={styles.rowMiddle}>
        <View style={styles.nameAndTypeWrapper}>
          <Text
            style={[styles.trainName, { color: isDarkMode ? '#F8FAFC' : '#1E293B' }]}
            numberOfLines={1}
          >
            {train.name}
          </Text>
          {trainType !== 'Express' && (
            <View style={[styles.typeBadge, { backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9' }]}>
              <Text style={[styles.typeBadgeText, { color: isDarkMode ? '#94A3B8' : '#475569' }]}>
                {trainType}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.daysContainer}>
          {runsDaily ? (
            <Text style={[styles.runsDailyText, { color: isDarkMode ? '#38BDF8' : '#2563EB' }]}>
              {t('runsDaily') || 'Runs Daily'}
            </Text>
          ) : (
            <DayChips
              runsOn={runsOn}
              selectedDayIndex={selectedDayIndex}
              isDarkMode={isDarkMode}
            />
          )}
        </View>
      </View>

      {/* ROW 3: Sub Status (Not running on Sat • Next: Mon, 17 Nov / Departed) */}
      {isDimmed && (
        <View style={styles.rowStatus}>
          {!runsToday ? (
            <Text style={[styles.statusDimText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
              {t('notRunningOn') || 'Not running on'} {currentDayName}
              {nextRun ? ` • ${t('next') || 'Next'}: ${nextRun.dayName}, ${nextRun.formattedDate}` : ''}
            </Text>
          ) : isDeparted ? (
            <View style={styles.departedPill}>
              <Text style={styles.departedText}>{t('departed') || 'Departed'}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* ROW 4: Class Chips in Neutral Style (SL, 3A, 2A, CC...) */}
      {train.classes && train.classes.length > 0 && (
        <View style={styles.rowClasses}>
          {train.classes.map((c, i) => (
            <View
              key={i}
              style={[
                styles.neutralClassChip,
                {
                  backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                  borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <Text style={[styles.neutralClassText, { color: isDarkMode ? '#CBD5E1' : '#475569' }]}>
                {c.type}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    minHeight: 52,
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeftTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  numberBadge: {
    paddingHorizontal: 6.5,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginRight: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  timeBold: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  durationDash: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  superscriptDay: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
    marginLeft: 1.5,
    top: -3,
  },
  fastestBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 6,
  },
  fastestBadgeText: {
    color: '#D97706',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  rowMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  nameAndTypeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  trainName: {
    fontSize: 13.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 6,
  },
  typeBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  daysContainer: {
    alignItems: 'flex-end',
  },
  runsDailyText: {
    fontSize: 12,
    fontWeight: '800',
  },
  rowStatus: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDimText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  departedPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  departedText: {
    color: '#DC2626',
    fontSize: 10.5,
    fontWeight: '800',
  },
  rowClasses: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  neutralClassChip: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  neutralClassText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
