import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, AccessibilityInfo } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePreferences } from '../../../context/PreferencesContext';
import { TimelineStation } from '../buildTrackerViewModel';
import { trackerStyles } from '../trackerStyles';

interface StationRowProps {
  station: TimelineStation;
  isFirst: boolean;
  isLast: boolean;
  onPress: (station: TimelineStation) => void;
}

export const StationRow: React.FC<StationRowProps> = React.memo(({
  station,
  isFirst,
  isLast,
  onPress,
}) => {
  const { colors, isDarkMode } = usePreferences();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isReduceMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      isReduceMotionRef.current = enabled;
    });
  }, []);

  useEffect(() => {
    if (station.status === 'current' && !isReduceMotionRef.current) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 750, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [station.status, pulseAnim]);

  const isPassed = station.status === 'departed';
  const isCurrent = station.status === 'current';
  const isUpcoming = station.status === 'upcoming';

  const delayMins = station.delayMinutes;
  const hasDelay = delayMins > 0;
  const isHighDelay = delayMins > 15;

  const expectedTime = station.expectedArrival || station.expectedDeparture || station.scheduledArrival;
  const scheduledTime = station.scheduledArrival !== '--:--' ? station.scheduledArrival : station.scheduledDeparture;

  // Rail segment styling
  const railPassedColor = colors.primary;
  const railUpcomingColor = isDarkMode ? '#334155' : '#CBD5E1';

  // Accessibility label
  const a11yText = `${station.stationName} (${station.stationCode}), ${
    isPassed ? 'passed' : isCurrent ? 'current station' : 'upcoming'
  }, ${hasDelay ? `${delayMins} minutes late, expected ${expectedTime}` : `scheduled ${scheduledTime}`}${
    station.platform ? `, Platform ${station.platform}` : ''
  }`;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(station)}
      style={trackerStyles.stationRow}
      accessible={true}
      accessibilityLabel={a11yText}
    >
      {/* LEFT RAIL & DOT */}
      <View style={trackerStyles.railColumn}>
        {/* Top rail segment */}
        <View
          style={[
            trackerStyles.railSegmentTop,
            {
              backgroundColor: isFirst
                ? 'transparent'
                : isPassed || isCurrent
                ? railPassedColor
                : railUpcomingColor,
            },
          ]}
        />

        {/* Station Indicator Dot */}
        <View style={trackerStyles.dotContainer}>
          {isPassed && (
            <View style={[trackerStyles.passedDot, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={11} color="#FFFFFF" />
            </View>
          )}

          {isCurrent && (
            <Animated.View
              style={[
                trackerStyles.currentDotPulse,
                {
                  backgroundColor: colors.primary,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <MaterialCommunityIcons name="train" size={14} color="#FFFFFF" />
            </Animated.View>
          )}

          {isUpcoming && (
            <View
              style={[
                trackerStyles.upcomingDot,
                {
                  borderColor: isDarkMode ? '#64748B' : '#94A3B8',
                  backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF',
                },
              ]}
            />
          )}
        </View>

        {/* Bottom rail segment */}
        <View
          style={[
            trackerStyles.railSegmentBottom,
            {
              backgroundColor: isLast
                ? 'transparent'
                : isPassed
                ? railPassedColor
                : railUpcomingColor,
            },
          ]}
        />
      </View>

      {/* RIGHT SIDE DETAILS CARD */}
      <View style={trackerStyles.stationContentCard}>
        <View style={trackerStyles.stationHeaderLine}>
          {/* Station Name + Code */}
          <Text
            style={[
              trackerStyles.stationName,
              {
                color: isCurrent
                  ? (isDarkMode ? '#38BDF8' : colors.primary)
                  : isPassed
                  ? (isDarkMode ? '#94A3B8' : '#475569')
                  : (isDarkMode ? colors.textPrimary : '#0F172A'),
                fontWeight: isCurrent ? '800' : isUpcoming ? '700' : '500',
              },
            ]}
            numberOfLines={1}
          >
            {station.stationName}{' '}
            <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? colors.textMuted : '#64748B' }}>
              ({station.stationCode})
            </Text>
          </Text>

          {/* Times Group */}
          <View style={trackerStyles.stationTimesGroup}>
            <Text
              style={[
                trackerStyles.stationTimeExpected,
                {
                  color: isCurrent
                    ? (isDarkMode ? '#38BDF8' : colors.primary)
                    : hasDelay
                    ? (isHighDelay ? (isDarkMode ? '#F87171' : '#DC2626') : (isDarkMode ? '#FBBF24' : '#D97706'))
                    : (isDarkMode ? colors.textPrimary : '#0F172A'),
                },
              ]}
            >
              {expectedTime}
            </Text>

            {hasDelay && scheduledTime && scheduledTime !== expectedTime && (
              <Text
                style={[
                  trackerStyles.stationTimeScheduled,
                  {
                    color: isDarkMode ? colors.textMuted : '#94A3B8',
                    textDecorationLine: 'line-through',
                  },
                ]}
              >
                {scheduledTime}
              </Text>
            )}
          </View>
        </View>

        {/* Meta Line: Platform, Halt, Distance (Only rendered if known!) */}
        <View style={trackerStyles.stationMetaLine}>
          {station.platform && (
            <View
              style={[
                trackerStyles.platformPill,
                { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' },
              ]}
            >
              <Text
                style={[
                  trackerStyles.platformPillText,
                  { color: isDarkMode ? '#94A3B8' : '#475569' },
                ]}
              >
                PF {station.platform}
              </Text>
            </View>
          )}

          {station.haltMinutes !== undefined && (
            <Text style={[trackerStyles.haltText, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>
              {station.haltMinutes}m halt
            </Text>
          )}

          {station.distanceKm !== undefined && (
            <Text style={[trackerStyles.distanceText, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>
              {station.distanceKm} km
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

