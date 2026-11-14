import React from 'react';
import { View, Text, TouchableOpacity, Share, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../../context/PreferencesContext';
import { TrackerViewModel } from '../buildTrackerViewModel';
import { SavedAlarm } from '../../../utils/alarmStore';
import { Typography } from '../../../theme/typography';

interface QuickActionsProps {
  vm: TrackerViewModel;
  activeAlarm: SavedAlarm | null;
  onOpenAlarm: () => void;
  onCancelAlarm: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = React.memo(({
  vm,
  activeAlarm,
  onOpenAlarm,
  onCancelAlarm,
}) => {
  const { colors, isDarkMode } = usePreferences();

  const handleShare = async () => {
    try {
      const now = new Date();
      let hours = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const timeStr = `${hours}:${mins} ${ampm}`;

      let statusDesc = vm.statusHeroHeadline;
      if (vm.delayMinutes > 0) {
        statusDesc += `, ${vm.delayMinutes} min late`;
      } else {
        statusDesc += ', on time';
      }

      const shareMessage = `🚆 ${vm.trainNumber} ${vm.trainName}\n📍 ${statusDesc}\n🕒 Updated: ${timeStr}\n\nTracked live on When Is My Train app.`;

      await Share.share({
        message: shareMessage,
        title: `${vm.trainNumber} Live Status`,
      });
    } catch {}
  };

  const isAlarmPaused = activeAlarm && (vm.isStale || vm.state === 'unavailable');

  return (
    <View style={styles.container}>
      {/* 1. Alarm Pill / Active Alarm Chip */}
      {activeAlarm ? (
        <View
          style={[
            styles.activeAlarmChip,
            {
              backgroundColor: isAlarmPaused
                ? (isDarkMode ? '#78350F' : '#FEF3C7')
                : (isDarkMode ? '#065F46' : '#ECFDF5'),
              borderColor: isAlarmPaused
                ? '#F59E0B'
                : (isDarkMode ? '#10B981' : '#34D399'),
            },
          ]}
        >
          <Ionicons
            name={isAlarmPaused ? 'pause-circle-outline' : 'alarm'}
            size={16}
            color={isAlarmPaused ? '#D97706' : (isDarkMode ? '#34D399' : '#059669')}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.activeAlarmText,
              { color: isAlarmPaused ? '#B45309' : (isDarkMode ? '#A7F3D0' : '#065F46') },
            ]}
            numberOfLines={1}
          >
            {isAlarmPaused
              ? 'Alarm paused - no live data'
              : `Alarm: ${activeAlarm.stationCode} (${activeAlarm.mode})`}
          </Text>
          <TouchableOpacity
            onPress={onCancelAlarm}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.cancelAlarmBtn}
            accessible={true}
            accessibilityLabel="Cancel alarm"
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={isAlarmPaused ? '#B45309' : (isDarkMode ? '#A7F3D0' : '#059669')}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.actionPill,
            {
              backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
              borderColor: isDarkMode ? colors.border : '#E2E8F0',
            },
          ]}
          onPress={onOpenAlarm}
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel="Set station wake up alarm"
        >
          <Ionicons name="alarm-outline" size={17} color={isDarkMode ? '#38BDF8' : colors.primary} />
          <Text style={[styles.actionText, { color: isDarkMode ? colors.textPrimary : '#1E293B' }]}>
            Set Alarm
          </Text>
        </TouchableOpacity>
      )}

      {/* 2. Share Pill (Single source of truth for Share) */}
      <TouchableOpacity
        style={[
          styles.actionPill,
          {
            backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
            borderColor: isDarkMode ? colors.border : '#E2E8F0',
          },
        ]}
        onPress={handleShare}
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel="Share live train running status"
      >
        <Ionicons name="share-social-outline" size={17} color={isDarkMode ? '#38BDF8' : colors.primary} />
        <Text style={[styles.actionText, { color: isDarkMode ? colors.textPrimary : '#1E293B' }]}>
          Share Status
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 10,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  activeAlarmChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  activeAlarmText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 11.5,
    flex: 1,
  },
  cancelAlarmBtn: {
    paddingLeft: 6,
  },
});
