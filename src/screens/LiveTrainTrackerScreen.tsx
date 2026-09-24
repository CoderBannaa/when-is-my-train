import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { CorridorTrain, findOrGenerateTrain } from '../data/trainsBetweenStations';
import { calculateLiveStatus, parseTimeToMinutes, StationLiveDetail } from '../utils/liveStatusEngine';

interface LiveTrainTrackerScreenProps {
  trainNumber: string;
  onBack: () => void;
}

export const LiveTrainTrackerScreen: React.FC<LiveTrainTrackerScreenProps> = ({
  trainNumber,
  onBack,
}) => {
  const [lastUpdatedSec, setLastUpdatedSec] = useState(0);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [alarmStation, setAlarmStation] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Dynamic universal train lookup (resolves any 5-digit number or name)
  const activeTrain: CorridorTrain = useMemo(() => {
    return findOrGenerateTrain(trainNumber);
  }, [trainNumber]);

  // Animated pulse for current train location icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Auto-refresh timer counter (Every second increment seconds ago)
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdatedSec((prev) => (prev >= 60 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live location
  const simulationMinutes = useMemo(() => {
    if (activeTrain.number === '05379') {
      return 4 * 60 + 56; // 4:56 AM, departed Manak Nagar towards Amausi
    }
    if (!activeTrain.stops || activeTrain.stops.length < 2) return 8 * 60;
    const originMins = parseTimeToMinutes(
      activeTrain.stops[0].dep === '--' ? activeTrain.stops[0].arr : activeTrain.stops[0].dep
    );
    const destMins = parseTimeToMinutes(activeTrain.stops[activeTrain.stops.length - 1].arr);
    return Math.floor((originMins + destMins) / 2) + 8;
  }, [activeTrain]);

  const liveData = useMemo(() => {
    const data = calculateLiveStatus(activeTrain, simulationMinutes, 12); // 12 mins delay
    if (activeTrain.number === '05379') {
      data.currentSpeed = 45;
      data.currentStationName = 'Etawah';
      data.currentStationCode = 'ETW';
      data.nextStationName = 'Kanpur Central';
      data.nextStationCode = 'CNB';
      data.bannerStatusText = 'Departed Etawah';
    }
    return data;
  }, [activeTrain, simulationMinutes]);

  const handleManualRefresh = useCallback(() => {
    setLastUpdatedSec(0);
  }, []);

  const handleScrollToCurrent = useCallback(() => {
    if (scrollRef.current && liveData.activeStopIndex >= 0) {
      scrollRef.current.scrollTo({
        y: Math.max(0, (liveData.activeStopIndex - 1) * 72),
        animated: true,
      });
    }
  }, [liveData.activeStopIndex]);

  const handleShare = useCallback(async () => {
    const text = `🚆 ${activeTrain.number} ${activeTrain.name}
📍 Current Location: ${liveData.currentStationName} (${liveData.currentStationCode})
➡️ Next Station: ${liveData.nextStationName} (${liveData.nextStationCode})
🟢 Status: Running • ${liveData.isDelayed ? `${liveData.delayMinutes} min late` : 'On Time'}
ETA: ${liveData.etaNextStopMinutes} mins away
Tracked on When is my train App`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          alert('Live train status copied to clipboard!');
        }
      } else {
        await Share.share({ message: text });
      }
    } catch {}
  }, [activeTrain, liveData]);

  const lastUpdatedDisplay = useMemo(() => {
    if (lastUpdatedSec === 0) return 'Last updated: Just now';
    return `Last updated: ${lastUpdatedSec}s ago`;
  }, [lastUpdatedSec]);

  const [activeTab, setActiveTab] = useState<'journey' | 'live_map' | 'coach_position' | 'info'>('journey');

  return (
    <View style={styles.container}>
      {/* ================= 1. FIXED TOP HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerCircleBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {activeTrain.number} - {activeTrain.name}
          </Text>
          <Text style={styles.headerSubText} numberOfLines={1}>
            {activeTrain.originCode} ➔ {activeTrain.destCode} ({activeTrain.originName} to {activeTrain.destName})
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => setShowAlarmModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerCircleBtn, { marginLeft: 8 }]}
            onPress={() => setShowMenuModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= 2. ACTION PILLS BAR (Today, Alarm, Coach, Share) ================= */}
      <View style={styles.actionPillsBar}>
        <TouchableOpacity style={styles.todayActionPill} activeOpacity={0.8}>
          <Text style={styles.todayActionPillText}>Today</Text>
          <Ionicons name="caret-down" size={12} color={Colors.primary} style={{ marginLeft: 3 }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlinedActionPill}
          onPress={() => setShowAlarmModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="alarm-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.outlinedActionPillText}>Alarm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlinedActionPill}
          onPress={() => setActiveTab('coach_position')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="train" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.outlinedActionPillText}>Coach</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlinedActionPill}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-social-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.outlinedActionPillText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* ================= 3. ROUTE SUMMARY CARD (NDLS 06:00 AM ── 04h 08m ──> CNB 10:08 AM) ================= */}
      <View style={styles.routeSummaryCard}>
        <View style={styles.routeStationCol}>
          <Text style={styles.routeCodeBig}>{activeTrain.originCode}</Text>
          <Text style={styles.routeTimeSub}>{activeTrain.depTime || '06:00 AM'}</Text>
        </View>

        <View style={styles.routeCenterTrackCol}>
          <Text style={styles.routeDurationText}>{activeTrain.duration || '04h 08m'}</Text>
          <View style={styles.routeTrackLineRow}>
            <View style={styles.routeDotGreen} />
            <View style={styles.routeTrackLine} />
            <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
          </View>
          <Text style={styles.routeStopsText}>
            {activeTrain.totalHaults > 0 ? `${activeTrain.totalHaults} stops` : 'Non-stop'}
          </Text>
        </View>

        <View style={[styles.routeStationCol, { alignItems: 'flex-end' }]}>
          <Text style={styles.routeCodeBig}>{activeTrain.destCode}</Text>
          <Text style={styles.routeTimeSub}>{activeTrain.arrTime || '10:08 AM'}</Text>
        </View>
      </View>

      {/* ================= 4. 4 SUB-TABS NAVIGATION BAR (Journey | Live Map | Coach Position | Info) ================= */}
      <View style={styles.subTabsBar}>
        {[
          { key: 'journey', label: 'Journey' },
          { key: 'live_map', label: 'Live Map' },
          { key: 'coach_position', label: 'Coach Position' },
          { key: 'info', label: 'Info' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.subTabItem, isActive && styles.subTabItemActive]}
              onPress={() => setActiveTab(tab.key as any)}
              activeOpacity={0.75}
            >
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.subTabActiveLine} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ================= TAB 1: JOURNEY (TIMELINE VIEW) ================= */}
      {activeTab === 'journey' && (
        <View style={{ flex: 1 }}>
          <View style={styles.timelineHeaderStrip}>
            <Text style={styles.stripColText}>Arrival</Text>
            <Text style={styles.stripTitleText}>Day 0 - Sat, 20 Sep</Text>
            <Text style={styles.stripColText}>Departure</Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.timelineScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.timelineContentWrapper}>
              {liveData.stationDetails.map((st: StationLiveDetail, index: number) => {
                const isFirst = index === 0;
                const isLast = index === liveData.stationDetails.length - 1;
                const isPassed = index < liveData.activeStopIndex;
                const isCurrent = index === liveData.activeStopIndex;
                const isUpcoming = index > liveData.activeStopIndex;

                const schedArrText = isFirst ? 'Start' : st.scheduledArr;
                const schedDepText = isLast ? 'End' : st.scheduledDep;

                const actualArrText = isFirst ? '---' : st.actualArr;
                const actualDepText = isLast ? '---' : st.actualDep;

                return (
                  <View
                    key={`${st.code}-${index}`}
                    style={[
                      styles.stationTimelineRow,
                      isCurrent && styles.currentStationRowHighlight,
                    ]}
                  >
                    {/* 1. Timings Column Left */}
                    <View style={styles.timeColLeft}>
                      <Text style={[styles.schedTimeText, isPassed && styles.textMuted]}>
                        {schedArrText}
                      </Text>
                      <Text
                        style={[
                          styles.actualTimeText,
                          isPassed ? styles.textPassedGreen : isCurrent ? styles.textCurrentBlue : styles.textUpcomingGrey,
                        ]}
                      >
                        {actualArrText}
                      </Text>
                    </View>

                    {/* 2. Vertical Line & Status Icon Node */}
                    <View style={styles.trackTrackWrapper}>
                      <View
                        style={[
                          styles.verticalTrackLine,
                          isPassed && styles.linePassedGreen,
                          isCurrent && styles.lineCurrentBlue,
                          isUpcoming && styles.lineUpcomingGrey,
                          isFirst && { top: '50%' },
                          isLast && { bottom: '50%' },
                        ]}
                      />

                      {/* Completed Station Icon (Green Checkmark ✓) */}
                      {isPassed && (
                        <View style={styles.passedCheckCircle}>
                          <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                        </View>
                      )}

                      {/* Current Station Icon (Blue Animated Train Badge 🚆) */}
                      {isCurrent && (
                        <Animated.View
                          style={[
                            styles.currentTrainBadge,
                            { transform: [{ scale: pulseAnim }] },
                          ]}
                        >
                          <MaterialCommunityIcons name="train" size={16} color="#FFFFFF" />
                        </Animated.View>
                      )}

                      {/* Upcoming Station Icon (Grey Dot or Red for Dest) */}
                      {isUpcoming && (
                        <View
                          style={[
                            styles.upcomingGreyDot,
                            isLast && { backgroundColor: '#DC2626', width: 12, height: 12, borderRadius: 6 },
                          ]}
                        />
                      )}
                    </View>

                    {/* 3. Station Name & Details Center */}
                    <View style={styles.stationInfoCol}>
                      <View style={styles.stationNameCodeRow}>
                        <Text
                          style={[
                            styles.stationNameText,
                            isCurrent && styles.stationNameTextCurrent,
                            isPassed && styles.stationNameTextPassed,
                          ]}
                          numberOfLines={1}
                        >
                          {st.name} ({st.code})
                        </Text>
                      </View>

                      <View style={styles.stationSubInfoRow}>
                        <Text style={styles.subInfoText}>{st.distanceKm} km</Text>
                        <Text style={styles.dotSeparator}>•</Text>
                        <Text style={styles.subInfoText}>{st.platform}</Text>
                      </View>

                      {isPassed && <Text style={styles.statusDepartedSmall}>Departed</Text>}
                      {isCurrent && (
                        <View style={styles.currentStatusBadgeMini}>
                          <Text style={styles.currentStatusBadgeMiniText}>Current Station · 2 min late</Text>
                        </View>
                      )}
                      {isUpcoming && <Text style={styles.statusExpectedSmall}>Expected</Text>}
                    </View>

                    {/* 4. Timings Column Right (Departure) */}
                    <View style={styles.timeColRight}>
                      <Text style={[styles.schedTimeText, isPassed && styles.textMuted]}>
                        {schedDepText}
                      </Text>
                      <Text
                        style={[
                          styles.actualTimeText,
                          isPassed ? styles.textPassedGreen : isCurrent ? styles.textCurrentBlue : styles.textUpcomingGrey,
                        ]}
                      >
                        {actualDepText}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={{ height: 110 }} />
          </ScrollView>

          {/* Bottom Telemetry Bar for Speed & Distance Left */}
          <View style={styles.bottomTelemetryBar}>
            <View style={styles.telemetryStatCol}>
              <Ionicons name="speedometer-outline" size={16} color={Colors.primary} />
              <Text style={styles.telemetryStatVal}>{liveData.currentSpeed || 96} km/h</Text>
              <Text style={styles.telemetryStatSub}>Speed</Text>
            </View>
            <View style={styles.telemetryDividerLine} />
            <View style={styles.telemetryStatCol}>
              <Ionicons name="navigate-outline" size={16} color="#16A34A" />
              <Text style={styles.telemetryStatVal}>252 km</Text>
              <Text style={styles.telemetryStatSub}>Distance Left</Text>
            </View>
            <View style={styles.telemetryDividerLine} />
            <View style={styles.telemetryStatCol}>
              <Ionicons name="time-outline" size={16} color="#EA580C" />
              <Text style={styles.telemetryStatVal}>10:20 AM</Text>
              <Text style={styles.telemetryStatSub}>Expected Arrival</Text>
            </View>
          </View>
        </View>
      )}

      {/* ================= TAB 2: LIVE MAP VIEW ================= */}
      {activeTab === 'live_map' && (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.mapTabContainer} showsVerticalScrollIndicator={false}>
            {/* Visual Route Map Box */}
            <View style={styles.visualMapBox}>
              <View style={styles.mapRouteLine} />

              {liveData.stationDetails.map((st, idx) => {
                const isPassed = idx < liveData.activeStopIndex;
                const isCurrent = idx === liveData.activeStopIndex;
                const isLast = idx === liveData.stationDetails.length - 1;

                return (
                  <View key={st.code} style={styles.mapNodeRow}>
                    <View
                      style={[
                        styles.mapDotCircle,
                        isPassed && { backgroundColor: '#16A34A' },
                        isCurrent && { backgroundColor: '#0284C7', width: 20, height: 20, borderRadius: 10 },
                        isLast && { backgroundColor: '#DC2626' },
                      ]}
                    />
                    <View style={styles.mapNodeCard}>
                      <Text style={styles.mapNodeName}>{st.name} ({st.code})</Text>
                      <Text style={styles.mapNodeTime}>
                        {isCurrent ? `Current Location · ${st.actualArr}` : st.actualArr}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Current Station Map Summary Card */}
            <View style={styles.mapBottomCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <MaterialCommunityIcons name="train" size={20} color={Colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.mapCardStationTitle}>{liveData.currentStationName} ({liveData.currentStationCode})</Text>
                <View style={styles.latePill}>
                  <Text style={styles.latePillText}>2 min late</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={styles.mapCardSubText}>Arrived: {liveData.stationDetails[liveData.activeStopIndex]?.actualArr || '08:10 AM'}</Text>
                <Text style={styles.mapCardSubText}>Departed: {liveData.stationDetails[liveData.activeStopIndex]?.actualDep || '08:12 AM'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.fullJourneyBtn}
              onPress={() => setActiveTab('journey')}
            >
              <Text style={styles.fullJourneyBtnText}>≡ Show Full Journey Timeline</Text>
            </TouchableOpacity>

            <View style={{ height: 90 }} />
          </ScrollView>
        </View>
      )}

      {/* ================= TAB 3: COACH POSITION VIEW ================= */}
      {activeTab === 'coach_position' && (
        <ScrollView style={styles.coachTabContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.coachPlatformCard}>
            <View style={styles.coachHeaderRow}>
              <Text style={styles.coachPlatformTitle}>{activeTrain.originCode}</Text>
              <Text style={styles.coachSideText}>Engine Side ➔</Text>
              <Text style={styles.coachPlatformTitle}>{activeTrain.destCode}</Text>
            </View>

            {/* Coach Horizontal Train Composition */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.coachCompositionScroll}>
              <View style={[styles.coachBox, styles.engineBox]}>
                <Text style={styles.coachBoxText}>ENG</Text>
              </View>
              <View style={styles.coachBox}><Text style={styles.coachBoxText}>C1</Text></View>
              <View style={styles.coachBox}><Text style={styles.coachBoxText}>C2</Text></View>
              <View style={[styles.coachBox, styles.userCoachBox]}>
                <Text style={[styles.coachBoxText, { color: '#FFFFFF' }]}>C3</Text>
              </View>
              <View style={styles.coachBox}><Text style={styles.coachBoxText}>C4</Text></View>
              <View style={styles.coachBox}><Text style={styles.coachBoxText}>C5</Text></View>
              <View style={styles.coachBox}><Text style={styles.coachBoxText}>C6</Text></View>
              <View style={styles.coachBox}><Text style={styles.coachBoxText}>C7</Text></View>
              <View style={styles.coachBox}><Text style={styles.coachBoxText}>C8</Text></View>
            </ScrollView>

            <View style={styles.coachLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.legendText}>Your Coach (C3)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EA580C' }]} />
                <Text style={styles.legendText}>Engine</Text>
              </View>
            </View>
          </View>

          {/* Platform Guidance Box */}
          <View style={styles.platformGuidanceCard}>
            <Ionicons name="location-outline" size={22} color={Colors.primary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.guidanceTitle}>Your Coach Position (C3)</Text>
              <Text style={styles.guidanceSub}>
                Coach C3 will be in the middle section (near Platform 4 side) at {liveData.currentStationName}
              </Text>
            </View>
          </View>

          {/* Tips Card */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Platform Tips:</Text>
            <Text style={styles.tipsBullet}>• Coach position may change at some intermediate junction stations.</Text>
            <Text style={styles.tipsBullet}>• Arrive 10-15 minutes before scheduled departure time.</Text>
            <Text style={styles.tipsBullet}>• Check station platform display boards for live coach sequence.</Text>
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* ================= TAB 4: INFO (TRAIN DETAILS) VIEW ================= */}
      {activeTab === 'info' && (
        <ScrollView style={styles.infoTabContainer} showsVerticalScrollIndicator={false}>
          {/* Train Information Block */}
          <View style={styles.infoSectionCard}>
            <View style={styles.infoSectionHeader}>
              <MaterialCommunityIcons name="train" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.infoSectionTitle}>Train Information</Text>
            </View>

            {[
              { label: 'Train Number', val: activeTrain.number },
              { label: 'Train Name', val: activeTrain.name },
              { label: 'Running Days', val: 'Sun, Mon, Tue, Thu, Fri, Sat' },
              { label: 'Type', val: activeTrain.type || 'Superfast Express' },
              { label: 'Rake Zone', val: 'NR (Northern Railway)' },
              { label: 'Total Distance', val: `${liveData.totalDistanceKm || 440} km` },
              { label: 'Average Speed', val: '107 km/h' },
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.infoDataRow}>
                <Text style={styles.infoDataLabel}>{row.label}</Text>
                <Text style={styles.infoDataValue}>{row.val}</Text>
              </View>
            ))}
          </View>

          {/* Route Information Block */}
          <View style={styles.infoSectionCard}>
            <View style={styles.infoSectionHeader}>
              <Ionicons name="map-outline" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.infoSectionTitle}>Route Information</Text>
            </View>

            {[
              { label: 'Source Station', val: `${activeTrain.originName} (${activeTrain.originCode})` },
              { label: 'Destination Station', val: `${activeTrain.destName} (${activeTrain.destCode})` },
              { label: 'Total Stops', val: `${activeTrain.stops?.length || 5} Stops` },
              { label: 'Total Duration', val: activeTrain.duration || '04h 08m' },
              { label: 'Scheduled Departure', val: activeTrain.depTime || '06:00 AM' },
              { label: 'Scheduled Arrival', val: activeTrain.arrTime || '10:08 AM' },
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.infoDataRow}>
                <Text style={styles.infoDataLabel}>{row.label}</Text>
                <Text style={styles.infoDataValue}>{row.val}</Text>
              </View>
            ))}
          </View>

          {/* Facilities Block */}
          <View style={styles.infoSectionCard}>
            <View style={styles.infoSectionHeader}>
              <Ionicons name="apps-outline" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.infoSectionTitle}>Train Facilities</Text>
            </View>

            <View style={styles.facilitiesGrid}>
              {['AC Chair Car', 'Wi-Fi', 'On-board Catering', 'Charging Port', 'Bio Toilet'].map((fac) => (
                <View key={fac} style={styles.facilityChip}>
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" style={{ marginRight: 4 }} />
                  <Text style={styles.facilityChipText}>{fac}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* ================= 5. FIXED BOTTOM REFRESH ACTION BAR ================= */}
      <View style={styles.fixedBottomBar}>
        <TouchableOpacity
          style={styles.refreshActionBtn}
          activeOpacity={0.82}
          onPress={handleManualRefresh}
        >
          <Ionicons name="refresh-circle" size={22} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.refreshActionBtnText}>REFRESH STATUS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareIconCircleBtn}
          activeOpacity={0.75}
          onPress={handleShare}
        >
          <Ionicons name="share-social-outline" size={19} color={Colors.primary} />
        </TouchableOpacity>
      </View>


      {/* Station Alarm Modal */}
      <Modal visible={showAlarmModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAlarmModal(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="notifications" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>Set Wake-up Alarm</Text>
              <TouchableOpacity onPress={() => setShowAlarmModal(false)}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Receive vibration alert 15 minutes before reaching:
            </Text>

            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {activeTrain.stops.map((stop) => (
                <TouchableOpacity
                  key={stop.code}
                  style={[styles.alarmStationRow, alarmStation === stop.name && styles.alarmStationSelected]}
                  onPress={() => setAlarmStation(stop.name)}
                >
                  <Text
                    style={[
                      styles.alarmStationText,
                      alarmStation === stop.name && { color: Colors.primary, fontWeight: '800' },
                    ]}
                  >
                    {stop.name} ({stop.code})
                  </Text>
                  {alarmStation === stop.name && (
                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.saveAlarmBtn}
              onPress={() => {
                alert(`Alarm set for ${alarmStation || liveData.nextStationName}!`);
                setShowAlarmModal(false);
              }}
            >
              <Text style={styles.saveAlarmBtnText}>SET ALARM</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Menu Options Modal */}
      <Modal visible={showMenuModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Train Options</Text>
              <TouchableOpacity onPress={() => setShowMenuModal(false)}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.menuOptionRow}
              onPress={() => {
                setShowMenuModal(false);
                handleShare();
              }}
            >
              <Ionicons name="share-social-outline" size={18} color={Colors.primary} style={{ marginRight: 10 }} />
              <Text style={styles.menuOptionText}>Share Train Running Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOptionRow}
              onPress={() => {
                setShowMenuModal(false);
                setShowAlarmModal(true);
              }}
            >
              <Ionicons name="alarm-outline" size={18} color={Colors.primary} style={{ marginRight: 10 }} />
              <Text style={styles.menuOptionText}>Set Destination Alarm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOptionRow}
              onPress={() => {
                setShowMenuModal(false);
                handleManualRefresh();
              }}
            >
              <Ionicons name="refresh-outline" size={18} color={Colors.primary} style={{ marginRight: 10 }} />
              <Text style={styles.menuOptionText}>Refresh Live GPS Location</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // 1. Top Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubText: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // 2. Action Pills Bar
  actionPillsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 2,
  },
  todayActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  todayActionPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  outlinedActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  outlinedActionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 3. Route Summary Card
  routeSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  routeStationCol: {
    alignItems: 'flex-start',
  },
  routeCodeBig: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  routeTimeSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  routeCenterTrackCol: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  routeDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 3,
  },
  routeTrackLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  routeDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  routeTrackLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.primary,
    marginHorizontal: 4,
  },
  routeStopsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },

  // 4. Sub Tabs Bar
  subTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    position: 'relative',
  },
  subTabItemActive: {
    backgroundColor: '#FFFFFF',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  subTabActiveLine: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  // 5. Journey Timeline Tab
  timelineHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stripColText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  stripTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  timelineScroll: {
    flex: 1,
  },
  timelineContentWrapper: {
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  stationTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  currentStationRowHighlight: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },

  timeColLeft: {
    width: 62,
    alignItems: 'flex-start',
  },
  timeColRight: {
    width: 62,
    alignItems: 'flex-end',
  },
  schedTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  actualTimeText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  textMuted: {
    color: '#94A3B8',
  },
  textPassedGreen: {
    color: '#16A34A',
  },
  textCurrentBlue: {
    color: '#0284C7',
  },
  textUpcomingGrey: {
    color: '#64748B',
  },

  trackTrackWrapper: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  verticalTrackLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#CBD5E1',
    zIndex: 1,
  },
  linePassedGreen: {
    backgroundColor: '#16A34A',
  },
  lineCurrentBlue: {
    backgroundColor: '#0284C7',
  },
  lineUpcomingGrey: {
    backgroundColor: '#CBD5E1',
  },

  passedCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  currentTrainBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0284C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  upcomingGreyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#94A3B8',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 2,
  },

  stationInfoCol: {
    flex: 1,
    paddingLeft: 8,
    paddingRight: 6,
  },
  stationNameCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  stationNameTextCurrent: {
    color: '#0284C7',
    fontSize: 13.5,
  },
  stationNameTextPassed: {
    color: '#334155',
  },
  stationSubInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  subInfoText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  dotSeparator: {
    fontSize: 10,
    color: '#CBD5E1',
    marginHorizontal: 4,
  },
  statusDepartedSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 2,
  },
  currentStatusBadgeMini: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  currentStatusBadgeMiniText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  statusExpectedSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  // Telemetry Bar
  bottomTelemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  telemetryStatCol: {
    alignItems: 'center',
  },
  telemetryStatVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  telemetryStatSub: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },
  telemetryDividerLine: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  // 6. Live Map Tab
  mapTabContainer: {
    flex: 1,
    padding: 12,
  },
  visualMapBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    marginBottom: 12,
  },
  mapRouteLine: {
    position: 'absolute',
    left: 23,
    top: 24,
    bottom: 24,
    width: 3,
    backgroundColor: Colors.primary,
  },
  mapNodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  mapDotCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#94A3B8',
    marginRight: 14,
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapNodeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  mapNodeName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapNodeTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  mapBottomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    marginBottom: 12,
  },
  mapCardStationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  latePill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  latePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  mapCardSubText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  fullJourneyBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  fullJourneyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // 7. Coach Position Tab
  coachTabContainer: {
    flex: 1,
    padding: 12,
  },
  coachPlatformCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  coachHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  coachPlatformTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  coachSideText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  coachCompositionScroll: {
    marginVertical: 8,
  },
  coachBox: {
    width: 44,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  engineBox: {
    backgroundColor: '#EA580C',
  },
  userCoachBox: {
    backgroundColor: Colors.primary,
  },
  coachBoxText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  coachLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  platformGuidanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 12,
  },
  guidanceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  guidanceSub: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  tipsBullet: {
    fontSize: 11.5,
    color: '#64748B',
    marginVertical: 2,
    lineHeight: 16,
  },

  // 8. Info Tab
  infoTabContainer: {
    flex: 1,
    padding: 12,
  },
  infoSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  infoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  infoDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  infoDataLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  infoDataValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  facilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  facilityChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },

  // Fixed Bottom Action Bar
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  refreshActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    borderRadius: 12,
    marginRight: 10,
    elevation: 2,
  },
  refreshActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  shareIconCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  alarmStationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#F8FAFC',
  },
  alarmStationSelected: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  alarmStationText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  saveAlarmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  saveAlarmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
});
