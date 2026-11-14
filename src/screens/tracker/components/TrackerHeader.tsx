import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../../context/PreferencesContext';
import { trackerStyles } from '../trackerStyles';

interface TrackerHeaderProps {
  trainNumber: string;
  trainName: string;
  trainType: string;
  travelDateLabel?: string;
  isRefreshing: boolean;
  isSaved?: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onToggleSave: () => void;
}

export const TrackerHeader: React.FC<TrackerHeaderProps> = React.memo(({
  trainNumber,
  trainName,
  trainType,
  travelDateLabel = 'Today',
  isRefreshing,
  isSaved = false,
  onBack,
  onRefresh,
  onToggleSave,
}) => {
  const { colors, isDarkMode } = usePreferences();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const isReduceMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      isReduceMotionRef.current = enabled;
    });
  }, []);

  useEffect(() => {
    if (isRefreshing && !isReduceMotionRef.current) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [isRefreshing, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[trackerStyles.headerContainer, { backgroundColor: colors.primary }]}>
      <View style={trackerStyles.headerLeft}>
        <TouchableOpacity
          onPress={onBack}
          style={trackerStyles.headerBackBtn}
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={trackerStyles.headerTitleGroup}>
          <View style={trackerStyles.headerTrainRow}>
            <Text style={[trackerStyles.headerTrainName, { color: '#FFFFFF' }]} numberOfLines={1}>
              {trainNumber} {trainName}
            </Text>
            {trainType !== 'Express' && (
              <View style={[trackerStyles.headerTypeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[trackerStyles.headerTypeBadgeText, { color: '#FFFFFF' }]}>
                  {trainType}
                </Text>
              </View>
            )}
          </View>

          <Text style={[trackerStyles.headerDateText, { color: 'rgba(255,255,255,0.85)' }]}>
            {travelDateLabel}
          </Text>
        </View>
      </View>

      <View style={trackerStyles.headerRightActions}>
        <TouchableOpacity
          onPress={onRefresh}
          disabled={isRefreshing}
          style={trackerStyles.headerIconBtn}
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel="Refresh train live status"
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggleSave}
          style={trackerStyles.headerIconBtn}
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel={isSaved ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Ionicons
            name={isSaved ? 'star' : 'star-outline'}
            size={20}
            color={isSaved ? '#FDE047' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

