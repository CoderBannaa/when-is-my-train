import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { CORRIDOR_TRAINS_MASTER } from '../data/trainsBetweenStations';
import { searchAndRankTrains } from '../utils/searchRanker';
import { usePreferences } from '../context/PreferencesContext';

export const TimetableScreen: React.FC = () => {
  const { isDarkMode, colors, t } = usePreferences();
  const [trainQuery, setTrainQuery] = useState('64902');
  const [selectedTrainNum, setSelectedTrainNum] = useState('64902');

  // Entrance animation
  const screenFadeAnim = useRef(new Animated.Value(0)).current;
  const screenSlideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(screenSlideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Search and rank suggestions
  const searchSuggestions = useMemo(() => {
    if (!trainQuery.trim() || trainQuery.trim() === selectedTrainNum) return [];
    return searchAndRankTrains(trainQuery, CORRIDOR_TRAINS_MASTER).slice(0, 5);
  }, [trainQuery, selectedTrainNum]);

  // Find active train
  const activeTrain = useMemo(() => {
    return (
      CORRIDOR_TRAINS_MASTER.find((t) => t.number === selectedTrainNum) ||
      CORRIDOR_TRAINS_MASTER[0]
    );
  }, [selectedTrainNum]);

  const handleSelectTrain = (num: string) => {
    setSelectedTrainNum(num);
    setTrainQuery(num);
  };

  return (
    <ScrollView
      style={[styles.container, isDarkMode && { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View style={{ flex: 1, opacity: screenFadeAnim, transform: [{ translateY: screenSlideAnim }] }}>
      {/* Search Bar */}
      <View style={[styles.card, isDarkMode && { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.cardLabel}>TRAIN TIMETABLE & ROUTE</Text>
        <View style={styles.searchBar}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            value={trainQuery}
            onChangeText={(text) => {
              setTrainQuery(text);
              const exact = CORRIDOR_TRAINS_MASTER.find((t) => t.number === text.trim());
              if (exact) setSelectedTrainNum(exact.number);
            }}
            placeholder="Search train no or name (e.g. Mathura, 64902)..."
            placeholderTextColor={Colors.textMuted}
          />
          {trainQuery.length > 0 && (
            <TouchableOpacity onPress={() => setTrainQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Auto Suggestions */}
        {searchSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsHeader}>Top Matching Trains ({searchSuggestions.length}):</Text>
            {searchSuggestions.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectTrain(t.number)}
              >
                <View style={[styles.suggestionNumBadge, t.isLocalEmu && styles.suggestionEmuBadge]}>
                  <Text style={styles.suggestionNumText}>{t.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionNameText}>{t.name}</Text>
                  <Text style={styles.suggestionRouteText}>
                    {t.originCode} ➔ {t.destCode} • {t.type}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.offlineRow}>
          <Ionicons name="cloud-done-outline" size={16} color={Colors.secondary} style={{ marginRight: 6 }} />
          <Text style={styles.offlineText}>Saved for 100% Offline Access</Text>
        </View>
      </View>

      {/* Train Info Card */}
      <View style={[styles.infoCard, isDarkMode && { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.trainHeader}>
          <View style={[styles.trainNumBadge, activeTrain.isLocalEmu && styles.emuBadge]}>
            <Text style={styles.trainNumText}>{activeTrain.number}</Text>
          </View>
          <View style={[styles.typePill, activeTrain.isLocalEmu && styles.emuTypePill]}>
            <Text style={[styles.typePillText, activeTrain.isLocalEmu && { color: '#15803D' }]}>{activeTrain.type}</Text>
          </View>
          <View style={styles.runsOnBadge}>
            <Text style={styles.runsOnText}>Daily Service</Text>
          </View>
        </View>

        <Text style={[styles.trainName, isDarkMode && { color: colors.textPrimary }]}>{activeTrain.name}</Text>
        <Text style={[styles.classesText, isDarkMode && { color: colors.textSecondary }]}>
          Route: {activeTrain.originName} ({activeTrain.originCode}) ➔ {activeTrain.destName} ({activeTrain.destCode})
        </Text>

        <View style={[styles.tableHeader, isDarkMode && { backgroundColor: colors.cardSecondary, borderBottomColor: colors.border }]}>
          <Text style={[styles.thText, { flex: 2 }, isDarkMode && { color: colors.textSecondary }]}>STATION</Text>
          <Text style={[styles.thText, { flex: 1, textAlign: 'center' }, isDarkMode && { color: colors.textSecondary }]}>ARR / DEP</Text>
          <Text style={[styles.thText, { flex: 1, textAlign: 'right' }, isDarkMode && { color: colors.textSecondary }]}>HALT / PF</Text>
        </View>

        {/* Stations List */}
        {activeTrain.stops.map((st, idx) => (
          <View
            key={`${st.code}-${idx}`}
            style={[
              styles.tableRow,
              idx % 2 === 0 && (isDarkMode ? { backgroundColor: colors.cardSecondary } : styles.rowEven),
            ]}
          >
            <View style={{ flex: 2 }}>
              <Text style={[styles.stCode, isDarkMode && { color: colors.textSecondary }]}>
                {st.code} - <Text style={[styles.stName, isDarkMode && { color: colors.textPrimary }]}>{st.name}</Text>
              </Text>
              <Text style={styles.stDist}>{st.day ? `Day ${st.day}` : 'Daily'}</Text>
            </View>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.stTime, isDarkMode && { color: colors.textPrimary }]}>{st.arr === '--' ? st.dep : st.arr}</Text>
              <Text style={styles.stTimeDep}>{st.arr !== '--' ? `Dep ${st.dep}` : 'Origin'}</Text>
            </View>

            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.stPf}>PF {((idx % 4) + 1)}</Text>
              <Text style={styles.stHalt}>{idx === 0 ? 'Origin' : idx === activeTrain.stops.length - 1 ? 'Term' : '2m halt'}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 30 }} />
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7FD',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  suggestionsContainer: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
  },
  suggestionsHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionNumBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
  },
  suggestionEmuBadge: {
    backgroundColor: '#15803D',
  },
  suggestionNumText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  suggestionNameText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  suggestionRouteText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1.5,
    fontWeight: '500',
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  offlineText: {
    fontSize: 11.5,
    color: Colors.secondary,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trainNumBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    marginRight: 6,
  },
  emuBadge: {
    backgroundColor: '#15803D',
  },
  trainNumText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  typePill: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    marginRight: 6,
  },
  emuTypePill: {
    backgroundColor: '#DCFCE7',
  },
  typePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.primary,
  },
  runsOnBadge: {
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  runsOnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.secondary,
  },
  trainName: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  classesText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    marginBottom: 16,
    fontWeight: '500',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
    marginBottom: 6,
  },
  thText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.7,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  rowEven: {
    backgroundColor: '#F8FAFC',
  },
  stCode: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  stName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stDist: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  stTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  stTimeDep: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  stPf: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  stHalt: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
});
