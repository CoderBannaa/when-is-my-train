import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePreferences } from '../../../context/PreferencesContext';
import { Typography } from '../../../theme/typography';
import { TrainData } from '../../../services/trainDataService';
import { CoachLayout, CoachItem } from '../../../services/dataTypes';

interface TrackerCoachTabProps {
  trainNumber: string;
}

export const TrackerCoachTab: React.FC<TrackerCoachTabProps> = React.memo(({ trainNumber }) => {
  const { colors, isDarkMode } = usePreferences();
  const [layout, setLayout] = useState<CoachLayout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    TrainData.getCoachLayout(trainNumber)
      .then((res) => {
        if (mounted) {
          if (res.data && res.data.rakeSequence && res.data.rakeSequence.length > 0) {
            setLayout(res.data);
          } else {
            setLayout(null);
          }
        }
      })
      .catch(() => {
        if (mounted) setLayout(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [trainNumber]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  // 1. If real coach layout is available from official API
  if (layout && layout.rakeSequence && layout.rakeSequence.length > 0) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
              borderColor: isDarkMode ? colors.border : '#E2E8F0',
            },
          ]}
        >
          <Text style={[styles.title, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
            Verified Coach Layout • {layout.trainNumber}
          </Text>
          <Text style={[styles.subtitle, { color: isDarkMode ? colors.textSecondary : '#64748B' }]}>
            Engine ➔ Brake Van sequence as confirmed by railway controllers
          </Text>

          {/* Horizontal Rake Sequence */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rakeScroll}>
            {layout.rakeSequence.map((coach: CoachItem, idx: number) => {
              const isEngine = coach.coachCode === 'ENG' || coach.coachType?.toLowerCase().includes('engine') || idx === 0;
              return (
                <View
                  key={coach.index || idx}
                  style={[
                    styles.coachBox,
                    {
                      backgroundColor: isEngine
                        ? (isDarkMode ? '#0369A1' : '#0284C7')
                        : (isDarkMode ? '#1E293B' : '#F8FAFC'),
                      borderColor: isDarkMode ? colors.border : '#CBD5E1',
                    },
                  ]}
                >
                  <Text style={[styles.coachCode, { color: isEngine ? '#FFFFFF' : (isDarkMode ? colors.textPrimary : '#0F172A') }]}>
                    {coach.coachCode}
                  </Text>
                  <Text style={[styles.coachType, { color: isEngine ? 'rgba(255,255,255,0.85)' : (isDarkMode ? colors.textMuted : '#64748B') }]} numberOfLines={1}>
                    {coach.class || coach.coachType}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    );
  }

  // 2. Honest empty state
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
            borderColor: isDarkMode ? colors.border : '#E2E8F0',
          },
        ]}
      >
        <MaterialCommunityIcons
          name="train-car"
          size={44}
          color={isDarkMode ? '#64748B' : '#94A3B8'}
          style={{ marginBottom: 12 }}
        />
        <Text style={[styles.title, { color: isDarkMode ? colors.textPrimary : '#0F172A' }]}>
          Coach layout not available
        </Text>
        <Text style={[styles.subtitle, { color: isDarkMode ? colors.textSecondary : '#64748B' }]}>
          Official coach arrangement is updated upon chart preparation at the origin station (approx. 4 hours before departure).
        </Text>
        <View
          style={[
            styles.noticeBox,
            {
              backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
              borderColor: isDarkMode ? colors.border : '#E2E8F0',
            },
          ]}
        >
          <Text style={[styles.noticeText, { color: isDarkMode ? colors.textMuted : '#64748B' }]}>
            ℹ Zero fabricated coach sequences are displayed. When a verified rake is confirmed by controllers, it appears here automatically.
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 14,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  title: {
    ...Typography.h2,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  rakeScroll: {
    paddingVertical: 10,
    gap: 8,
  },
  coachBox: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  coachCode: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
  coachType: {
    ...Typography.caption,
    fontSize: 9.5,
    marginTop: 2,
  },
  noticeBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
  },
  noticeText: {
    ...Typography.caption,
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
  },
});
