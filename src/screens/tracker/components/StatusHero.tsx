import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePreferences } from '../../../context/PreferencesContext';
import { TrackerViewModel } from '../buildTrackerViewModel';
import { trackerStyles } from '../trackerStyles';

interface StatusHeroProps {
  vm: TrackerViewModel;
  onRetry?: () => void;
}

export const StatusHero: React.FC<StatusHeroProps> = React.memo(({ vm, onRetry }) => {
  const { colors, isDarkMode, t } = usePreferences();
  const progressAnim = useRef(new Animated.Value(vm.progressFraction)).current;
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;
  const isReduceMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      isReduceMotionRef.current = enabled;
    });
  }, []);

  // Shimmer animation for loading state
  useEffect(() => {
    if (vm.state === 'loading' && !isReduceMotionRef.current) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 0.85, duration: 800, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [vm.state, shimmerAnim]);

  // Smooth progress bar animation
  useEffect(() => {
    if (!isReduceMotionRef.current) {
      Animated.timing(progressAnim, {
        toValue: vm.progressFraction,
        duration: 650,
        useNativeDriver: false, // needed for width/left layout
      }).start();
    } else {
      progressAnim.setValue(vm.progressFraction);
    }
  }, [vm.progressFraction, progressAnim]);

  // 1. Loading Skeleton
  if (vm.state === 'loading') {
    return (
      <View
        style={[
          trackerStyles.heroCard,
          {
            backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
            borderColor: isDarkMode ? colors.border : '#E2E8F0',
          },
        ]}
      >
        <Animated.View style={{ opacity: shimmerAnim }}>
          <View style={{ height: 22, width: '70%', backgroundColor: isDarkMode ? '#334155' : '#E2E8F0', borderRadius: 6, marginBottom: 12 }} />
          <View style={{ height: 16, width: '45%', backgroundColor: isDarkMode ? '#334155' : '#E2E8F0', borderRadius: 4, marginBottom: 16 }} />
          <View style={{ height: 6, width: '100%', backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderRadius: 3, marginBottom: 12 }} />
          <View style={{ height: 12, width: '35%', backgroundColor: isDarkMode ? '#334155' : '#E2E8F0', borderRadius: 4 }} />
        </Animated.View>
      </View>
    );
  }

  // 2. Unavailable Card
  if (vm.state === 'unavailable') {
    return (
      <View
        style={[
          trackerStyles.heroCard,
          {
            backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
            borderColor: isDarkMode ? colors.danger : '#FCA5A5',
            alignItems: 'center',
            paddingVertical: 20,
          },
        ]}
      >
        <Ionicons name="train-outline" size={42} color={isDarkMode ? '#F87171' : colors.danger} style={{ marginBottom: 10 }} />
        <Text style={[trackerStyles.heroHeadline, { color: isDarkMode ? colors.textPrimary : '#0F172A', textAlign: 'center' }]}>
          {vm.statusHeroHeadline}
        </Text>
        <Text style={[trackerStyles.heroFooterText, { color: isDarkMode ? colors.textSecondary : '#64748B', textAlign: 'center', marginTop: 4, paddingHorizontal: 16 }]}>
          {vm.unavailableReason || 'Real-time GPS coordinates not received. Zero fabricated data is shown.'}
        </Text>
        {onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            style={{
              marginTop: 14,
              backgroundColor: colors.primary,
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: 8,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.8}
            accessible={true}
            accessibilityLabel="Retry tracking"
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 3. Cancelled Card
  if (vm.state === 'cancelled') {
    return (
      <View
        style={[
          trackerStyles.heroCard,
          {
            backgroundColor: isDarkMode ? '#450A0A' : '#FEF2F2',
            borderColor: '#EF4444',
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="alert-circle" size={24} color="#EF4444" />
          <Text style={[trackerStyles.heroHeadline, { color: '#EF4444' }]}>
            {vm.statusHeroHeadline}
          </Text>
        </View>
        <Text style={[trackerStyles.heroFooterText, { color: isDarkMode ? '#FCA5A5' : '#B91C1C', marginTop: 6 }]}>
          {vm.sourceText}
        </Text>
      </View>
    );
  }

  // Delay chip colors based on delaySeverity
  const delayBg =
    vm.delaySeverity === 'on_time'
      ? (isDarkMode ? '#065F46' : '#DCFCE7')
      : vm.delaySeverity === 'low'
      ? (isDarkMode ? '#78350F' : '#FEF3C7')
      : (isDarkMode ? '#7F1D1D' : '#FEE2E2');

  const delayTextColor =
    vm.delaySeverity === 'on_time'
      ? (isDarkMode ? '#A7F3D0' : '#15803D')
      : vm.delaySeverity === 'low'
      ? (isDarkMode ? '#FDE68A' : '#B45309')
      : (isDarkMode ? '#FECACA' : '#B91C1C');

  // Accessible sentence description
  const a11yHeroSentence = `${vm.statusHeroHeadline}. Status: ${vm.delayStatusText}. ${
    vm.nextStation ? `Next station: ${vm.nextStation.stationName}, expected ${vm.nextStation.expectedArrival || vm.nextStation.scheduledArrival}.` : ''
  } ${vm.sourceText}.`;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const markerLeft = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        trackerStyles.heroCard,
        {
          backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
          borderColor: isDarkMode ? colors.border : '#E2E8F0',
        },
      ]}
      accessible={true}
      accessibilityLabel={a11yHeroSentence}
    >
      {/* Top Row: Headline + Delay Chip */}
      <View style={trackerStyles.heroTopRow}>
        <View style={trackerStyles.heroHeadlineContainer}>
          <Text style={[trackerStyles.heroHeadline, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]} numberOfLines={1}>
            {vm.statusHeroHeadline}
          </Text>
        </View>

        <View style={[trackerStyles.heroDelayChip, { backgroundColor: delayBg }]}>
          <Text style={[trackerStyles.heroDelayText, { color: delayTextColor }]}>
            {vm.delayStatusText}
          </Text>
        </View>
      </View>

      {/* Next Station Line (if running / at_station) */}
      {vm.nextStation && (
        <View style={trackerStyles.heroNextStnRow}>
          <Text style={[trackerStyles.heroNextStnLabel, { color: isDarkMode ? colors.textSecondary : '#64748B' }]} numberOfLines={1}>
            Next: <Text style={{ fontWeight: '700', color: isDarkMode ? colors.textPrimary : '#1E293B' }}>{vm.nextStation.stationName}</Text>
          </Text>

          <Text style={[trackerStyles.heroNextStnEta, { color: vm.delaySeverity === 'high' ? delayTextColor : (isDarkMode ? '#38BDF8' : colors.primary) }]}>
            {vm.nextStation.expectedArrival || vm.nextStation.scheduledArrival}
            {vm.minutesToNextStation !== undefined && (
              <Text style={{ fontWeight: '500', fontSize: 11.5, color: isDarkMode ? colors.textSecondary : '#64748B' }}>
                {' '}(in {vm.minutesToNextStation} min)
              </Text>
            )}
          </Text>
        </View>
      )}

      {/* Completed Arrival Details */}
      {vm.state === 'completed' && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#34D399' : '#059669' }}>
            ✓ Journey Completed {vm.delaySeverity === 'on_time' ? '(On time)' : `(${vm.delayStatusText})`}
          </Text>
        </View>
      )}

      {/* Progress Bar (Origin -> Destination) */}
      <View style={trackerStyles.progressWrapper}>
        <View style={[trackerStyles.progressTrack, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
          <Animated.View
            style={[
              trackerStyles.progressFill,
              {
                width: progressWidth,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        {/* Small Train Icon Marker */}
        <Animated.View style={[trackerStyles.progressMarkerContainer, { left: markerLeft }]}>
          <View style={[trackerStyles.progressMarker, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="train" size={13} color="#FFFFFF" />
          </View>
        </Animated.View>
      </View>

      {/* Origin & Destination Labels under Progress Bar */}
      {vm.originStation && vm.destinationStation && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: isDarkMode ? colors.textSecondary : '#64748B' }}>
            {vm.originStation.stationCode}
          </Text>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: isDarkMode ? colors.textSecondary : '#64748B' }}>
            {vm.destinationStation.stationCode}
          </Text>
        </View>
      )}

      {/* Footer Line: Source + Freshness / Offline Badge */}
      <View style={[trackerStyles.heroFooter, { borderTopColor: isDarkMode ? colors.border : '#F1F5F9' }]}>
        <Text style={[trackerStyles.heroFooterText, { color: isDarkMode ? colors.textMuted : '#94A3B8' }]}>
          {vm.sourceText}
        </Text>

        {vm.isStale && (
          <View style={trackerStyles.heroOfflineBadge}>
            <Ionicons name="warning-outline" size={13} color="#D97706" />
            <Text style={[trackerStyles.heroOfflineText, { color: '#D97706' }]}>
              Offline (last known)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

