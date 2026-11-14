import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../../context/PreferencesContext';
import { TrackerViewModel, TimelineStation } from '../buildTrackerViewModel';
import { StationRow } from './StationRow';
import { PassingGroupRow } from './PassingGroupRow';
import { trackerStyles } from '../trackerStyles';

interface JourneyTimelineProps {
  vm: TrackerViewModel;
  onSelectStation: (station: TimelineStation) => void;
  ListHeaderComponent?: React.ReactElement;
  ListFooterComponent?: React.ReactElement;
}

type TimelineItem =
  | {
      type: 'station';
      station: TimelineStation;
      isFirst: boolean;
      isLast: boolean;
      stationIndex: number;
      key: string;
    }
  | {
      type: 'passingGroup';
      stations: TimelineStation[];
      key: string;
    };

export const JourneyTimeline: React.FC<JourneyTimelineProps> = React.memo(({
  vm,
  onSelectStation,
  ListHeaderComponent,
  ListFooterComponent,
}) => {
  const { colors, isDarkMode } = usePreferences();
  const flatListRef = useRef<FlatList>(null);
  const hasAutoScrolledRef = useRef(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Group stations into commercial halts & passing station bundles
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];
    const all = vm.stations || [];
    let currentPassingBatch: TimelineStation[] = [];

    all.forEach((st, idx) => {
      if (st.isPassing) {
        currentPassingBatch.push(st);
      } else {
        if (currentPassingBatch.length > 0) {
          items.push({
            type: 'passingGroup',
            stations: [...currentPassingBatch],
            key: `passing_${currentPassingBatch[0].stationCode}_${items.length}`,
          });
          currentPassingBatch = [];
        }
        items.push({
          type: 'station',
          station: st,
          isFirst: idx === 0,
          isLast: idx === all.length - 1,
          stationIndex: idx,
          key: `stn_${st.stationCode}_${idx}`,
        });
      }
    });

    if (currentPassingBatch.length > 0) {
      items.push({
        type: 'passingGroup',
        stations: [...currentPassingBatch],
        key: `passing_${currentPassingBatch[0].stationCode}_${items.length}`,
      });
    }

    return items;
  }, [vm.stations]);

  // Find index in timelineItems corresponding to the current station
  const targetItemIndex = useMemo(() => {
    if (vm.currentStationIndex < 0) return 0;
    const currentCode = vm.currentStation?.stationCode;
    const idx = timelineItems.findIndex(
      (it) => it.type === 'station' && it.station.stationCode === currentCode
    );
    return idx >= 0 ? idx : 0;
  }, [timelineItems, vm.currentStation, vm.currentStationIndex]);

  // Auto-scroll to active station on initial mount or train change
  useEffect(() => {
    if (!hasAutoScrolledRef.current && timelineItems.length > 0 && targetItemIndex > 0) {
      const timer = setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index: targetItemIndex,
            animated: true,
            viewPosition: 0.35,
          });
          hasAutoScrolledRef.current = true;
        } catch {
          // Fallback to offset
          flatListRef.current?.scrollToOffset({
            offset: targetItemIndex * 58,
            animated: true,
          });
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [timelineItems, targetItemIndex]);

  // Scroll handler to toggle sticky "You are here" mini bar
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      const targetEstimateY = targetItemIndex * 58;
      // If user has scrolled significantly away from current station, show sticky bar
      if (Math.abs(scrollY - targetEstimateY) > 280) {
        if (!showStickyBar) setShowStickyBar(true);
      } else {
        if (showStickyBar) setShowStickyBar(false);
      }
    },
    [targetItemIndex, showStickyBar]
  );

  const scrollToCurrentStation = useCallback(() => {
    try {
      flatListRef.current?.scrollToIndex({
        index: targetItemIndex,
        animated: true,
        viewPosition: 0.35,
      });
    } catch {
      flatListRef.current?.scrollToOffset({
        offset: targetItemIndex * 58,
        animated: true,
      });
    }
    setShowStickyBar(false);
  }, [targetItemIndex]);

  const renderItem = useCallback(
    ({ item }: { item: TimelineItem }) => {
      if (item.type === 'station') {
        return (
          <StationRow
            station={item.station}
            isFirst={item.isFirst}
            isLast={item.isLast}
            onPress={onSelectStation}
          />
        );
      }
      return (
        <PassingGroupRow
          stations={item.stations}
          onSelectStation={onSelectStation}
        />
      );
    },
    [onSelectStation]
  );

  const keyExtractor = useCallback((item: TimelineItem) => item.key, []);

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* Sticky "You are here" Mini Bar */}
      {showStickyBar && vm.currentStation && (
        <TouchableOpacity
          style={[
            trackerStyles.stickyBar,
            {
              backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
              borderColor: isDarkMode ? colors.primary : '#BAE6FD',
            },
          ]}
          onPress={scrollToCurrentStation}
          activeOpacity={0.88}
          accessible={true}
          accessibilityLabel={`Jump to current station ${vm.currentStation.stationName}`}
        >
          <Text
            style={[
              trackerStyles.stickyBarText,
              { color: isDarkMode ? colors.textPrimary : '#0F172A' },
            ]}
            numberOfLines={1}
          >
            You are here:{' '}
            <Text style={{ color: isDarkMode ? '#38BDF8' : colors.primary }}>
              {vm.currentStation.stationName}
            </Text>
            {vm.nextStation ? ` • Next: ${vm.nextStation.stationName}` : ''}
          </Text>

          <View style={trackerStyles.stickyBarAction}>
            <Text style={[trackerStyles.stickyBarActionText, { color: isDarkMode ? '#38BDF8' : colors.primary }]}>
              Jump
            </Text>
            <Ionicons name="arrow-up" size={14} color={isDarkMode ? '#38BDF8' : colors.primary} />
          </View>
        </TouchableOpacity>
      )}

      {/* Main FlatList Timeline */}
      <FlatList
        ref={flatListRef}
        data={timelineItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={trackerStyles.timelineContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={9}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        onScrollToIndexFailed={({ index }) => {
          flatListRef.current?.scrollToOffset({
            offset: index * 58,
            animated: true,
          });
        }}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
      />
    </View>
  );
});

