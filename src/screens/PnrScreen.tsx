import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Share, Platform, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { getPnrStatusRecord, PnrRecord } from '../data/pnrDatabase';
import { LiveTrainApi } from '../services/liveTrainApiService';
import { usePreferences } from '../context/PreferencesContext';

export const PnrScreen: React.FC = () => {
  const { colors, t } = usePreferences();
  const [pnrInput, setPnrInput] = useState('2456891023');
  const [currentRecord, setCurrentRecord] = useState<PnrRecord>(() => getPnrStatusRecord('2456891023'));
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  const handleCheckPnr = async (pnrToQuery?: string) => {
    const targetPnr = pnrToQuery || pnrInput;
    if (!targetPnr.trim()) return;

    if (pnrToQuery) {
      setPnrInput(pnrToQuery);
    }

    setIsLoading(true);
    setApiNotice(null);

    try {
      // 1. Try real RapidAPI call with 60-Second Cache
      const apiResponse = await LiveTrainApi.getPNRStatus(targetPnr);

      if (apiResponse && apiResponse.success && apiResponse.data) {
        const d = apiResponse.data;
        const mappedRecord: PnrRecord = {
          pnr: targetPnr,
          trainNumber: d.trainNumber || '12004',
          trainName: d.trainName || 'Shatabdi Express',
          originCode: d.sourceStation || 'NDLS',
          destCode: d.destinationStation || 'LKO',
          originName: d.sourceStationName || 'New Delhi',
          destName: d.destinationStationName || 'Lucknow',
          boardingStation: d.boardingStation || 'NDLS',
          journeyDate: d.dateOfJourney || 'Today',
          travelClass: d.journeyClass || 'CC',
          chartStatus: d.chartPrepared ? 'Chart Prepared' : 'Chart Not Prepared',
          isConfirmed: d.passengerList?.some((p: any) => p.currentStatus?.includes('CNF')) || false,
          passengers: (d.passengerList || []).map((p: any, idx: number) => ({
            id: idx + 1,
            bookingStatus: p.bookingStatus || 'WL',
            currentStatus: p.currentStatus || 'CNF',
            coach: p.coach || 'C3',
            berth: p.berthNumber || '42',
            berthType: p.berthType || 'Chair Car',
            statusType: p.currentStatus?.includes('CNF') ? 'cnf' : 'wl',
          })),
        };
        setCurrentRecord(mappedRecord);
        setApiNotice(apiResponse.isCached ? `Cached Live Data (${apiResponse.cacheAgeSeconds}s ago)` : 'Real-time Live PNR Verified');
      } else if (apiResponse && apiResponse.message) {
        // Real Railway Server returned message (e.g. FLUSHED PNR / PNR NOT YET GENERATED)
        setApiNotice(apiResponse.message);
        const record = getPnrStatusRecord(targetPnr);
        setCurrentRecord(record);
      } else {
        // Fallback Database lookup
        const record = getPnrStatusRecord(targetPnr);
        setCurrentRecord(record);
      }
    } catch {
      const record = getPnrStatusRecord(targetPnr);
      setCurrentRecord(record);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareTicket = async () => {
    const passengerSummary = currentRecord.passengers
      .map(
        (p) =>
          `Passenger ${p.id}: ${p.currentStatus} ${p.coach !== '--' ? `(Coach ${p.coach}, Berth ${p.berth} - ${p.berthType})` : `(${p.berthType})`}`
      )
      .join('\n');

    const shareText = `🚆 Train: ${currentRecord.trainNumber} - ${currentRecord.trainName}
📍 Route: ${currentRecord.originCode} ➔ ${currentRecord.destCode}
📅 Date: ${currentRecord.journeyDate}
🎫 PNR: ${currentRecord.pnr}
📋 Status: ${currentRecord.chartStatus}
${passengerSummary}
Shared via When is my train App`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          setCopiedNotification(true);
          setTimeout(() => setCopiedNotification(false), 3000);
        }
      } else {
        await Share.share({
          message: shareText,
          title: `PNR Status - ${currentRecord.pnr}`,
        });
      }
    } catch {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* 1. PNR Input Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <MaterialCommunityIcons name="ticket-percent" size={20} color={Colors.primary} />
          <Text style={styles.cardLabel}>10-DIGIT IRCTC PNR STATUS CHECKER</Text>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.pnrTextInput}
            value={pnrInput}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
              setPnrInput(cleaned);
            }}
            placeholder="Enter 10-digit PNR (e.g. 2456891023)"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={10}
          />
          {pnrInput.length > 0 && (
            <TouchableOpacity onPress={() => setPnrInput('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Preset Buttons for Real Testing */}
        <View style={styles.quickPresetsSection}>
          <Text style={styles.quickPresetsTitle}>Quick Test Presets:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => handleCheckPnr('2456891023')}
            >
              <Text style={styles.presetChipIcon}>🟢</Text>
              <Text style={styles.presetChipText}>Confirmed (CNF)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => handleCheckPnr('4821950371')}
            >
              <Text style={styles.presetChipIcon}>🟡</Text>
              <Text style={styles.presetChipText}>Waiting List (88% Chance)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => handleCheckPnr('8192304918')}
            >
              <Text style={styles.presetChipIcon}>🔵</Text>
              <Text style={styles.presetChipText}>RAC Ticket</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.checkBtn, isLoading && { opacity: 0.8 }]}
          activeOpacity={0.85}
          onPress={() => handleCheckPnr()}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="search" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
          )}
          <Text style={styles.checkBtnText}>{isLoading ? 'CHECKING LIVE PNR...' : 'CHECK PNR STATUS'}</Text>
        </TouchableOpacity>
      </View>

      {/* Live Railway Server API Notice */}
      {apiNotice && (
        <View style={styles.apiNoticeCard}>
          <Ionicons name="shield-checkmark" size={16} color="#0284C7" style={{ marginRight: 8 }} />
          <Text style={styles.apiNoticeText}>{apiNotice}</Text>
        </View>
      )}

      {/* Copied Notification Toast */}
      {copiedNotification && (
        <View style={styles.copiedBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.copiedText}>Ticket details copied to clipboard!</Text>
        </View>
      )}

      {/* 2. PNR Result Card */}
      <View style={styles.resultCard}>
        {/* Header: Train Number, Name & PNR */}
        <View style={styles.resultHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={styles.trainNumBadge}>
                <Text style={styles.trainNumText}>{currentRecord.trainNumber}</Text>
              </View>
              <View style={styles.pnrBadge}>
                <Text style={styles.pnrBadgeText}>PNR: {currentRecord.pnr}</Text>
              </View>
            </View>
            <Text style={styles.trainName}>{currentRecord.trainName}</Text>
          </View>

          {/* 1-Tap Share / WhatsApp Button */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShareTicket} activeOpacity={0.8}>
            <Ionicons name="share-social" size={18} color={Colors.primary} />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Route Info Card */}
        <View style={styles.routeBox}>
          <View style={styles.stationBlock}>
            <Text style={styles.stationCode}>{currentRecord.originCode}</Text>
            <Text style={styles.stationName}>{currentRecord.originName}</Text>
          </View>

          <View style={styles.routeArrow}>
            <Text style={styles.classQuotaText}>
              {currentRecord.travelClass} • {currentRecord.quota}
            </Text>
            <View style={styles.arrowRow}>
              <View style={styles.arrowLine} />
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.dojText}>{currentRecord.journeyDate}</Text>
          </View>

          <View style={[styles.stationBlock, { alignItems: 'flex-end' }]}>
            <Text style={styles.stationCode}>{currentRecord.destCode}</Text>
            <Text style={[styles.stationName, { textAlign: 'right' }]}>{currentRecord.destName}</Text>
          </View>
        </View>

        {/* 3. Confirmation Probability Gauge (Passenger's Favorite Feature) */}
        {currentRecord.confirmationProbability !== undefined && (
          <View style={styles.probabilityCard}>
            <View style={styles.probHeaderRow}>
              <View style={styles.probTitleLeft}>
                <Ionicons
                  name={currentRecord.confirmationProbability >= 80 ? 'checkmark-circle' : 'time'}
                  size={18}
                  color={currentRecord.confirmationProbability >= 80 ? Colors.secondary : Colors.accent}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.probTitleText}>Confirmation Probability</Text>
              </View>
              <Text
                style={[
                  styles.probPercentage,
                  { color: currentRecord.confirmationProbability >= 80 ? '#15803D' : '#C2410C' },
                ]}
              >
                {currentRecord.confirmationProbability}%
              </Text>
            </View>

            {/* Visual Probability Bar */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${currentRecord.confirmationProbability}%`,
                    backgroundColor: currentRecord.confirmationProbability >= 80 ? Colors.secondary : Colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={styles.probSubText}>{currentRecord.probabilityText}</Text>
          </View>
        )}

        {/* Charting Status Banner */}
        <View
          style={[
            styles.chartBanner,
            currentRecord.chartStatus === 'Chart Prepared' ? styles.chartReady : styles.chartPending,
          ]}
        >
          <Ionicons
            name={currentRecord.chartStatus === 'Chart Prepared' ? 'checkmark-done-circle' : 'time-outline'}
            size={18}
            color={currentRecord.chartStatus === 'Chart Prepared' ? '#15803D' : '#92400E'}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.chartText}>
            Chart Status: <Text style={styles.bold}>{currentRecord.chartStatus}</Text>
          </Text>
        </View>

        {/* 4. Passenger Details & Visual Berth Locator */}
        <Text style={styles.passengersTitle}>Passenger & Berth Details</Text>
        {currentRecord.passengers.map((p) => {
          const isConfirmed = p.currentStatus === 'CNF';
          const isRac = p.currentStatus.includes('RAC');

          return (
            <View key={p.id} style={styles.passengerCard}>
              <View style={styles.passengerHeader}>
                <Text style={styles.passengerNum}>Passenger {p.id}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    isConfirmed ? styles.statusCnf : isRac ? styles.statusRac : styles.statusWl,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isConfirmed ? styles.textCnf : isRac ? styles.textRac : styles.textWl,
                    ]}
                  >
                    {p.currentStatus}
                  </Text>
                </View>
              </View>

              <View style={styles.berthDetailsRow}>
                <View style={styles.berthCol}>
                  <Text style={styles.berthLabel}>COACH</Text>
                  <Text style={styles.berthVal}>{p.coach}</Text>
                </View>
                <View style={styles.berthDivider} />
                <View style={styles.berthCol}>
                  <Text style={styles.berthLabel}>BERTH / SEAT</Text>
                  <Text style={styles.berthVal}>{p.berth}</Text>
                </View>
                <View style={styles.berthDivider} />
                <View style={[styles.berthCol, { flex: 1.4 }]}>
                  <Text style={styles.berthLabel}>BERTH POSITION</Text>
                  <Text style={styles.berthTypeVal}>{p.berthType}</Text>
                </View>
              </View>

              {/* Visual Seat Map Diagram (If Confirmed) */}
              {isConfirmed && p.berth !== '--' && (
                <View style={styles.seatMapBox}>
                  <View style={styles.seatMapHeader}>
                    <MaterialCommunityIcons name="seat-passenger" size={16} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.seatMapTitle}>Visual Coach Seat Position:</Text>
                  </View>

                  <View style={styles.visualBayLayout}>
                    {/* Upper Berth */}
                    <View style={styles.berthDiagramRow}>
                      <View style={[styles.berthSlot, p.berthType.includes('Upper') && !p.berthType.includes('Side') && styles.berthSlotActive]}>
                        <Text style={[styles.berthSlotText, p.berthType.includes('Upper') && !p.berthType.includes('Side') && styles.berthSlotTextActive]}>
                          Upper Berth (UB)
                        </Text>
                      </View>
                      <View style={[styles.berthSlotSide, p.berthType.includes('Side Upper') && styles.berthSlotActive]}>
                        <Text style={[styles.berthSlotText, p.berthType.includes('Side Upper') && styles.berthSlotTextActive]}>
                          Side Upper
                        </Text>
                      </View>
                    </View>

                    {/* Middle Berth */}
                    <View style={styles.berthDiagramRow}>
                      <View style={[styles.berthSlot, p.berthType.includes('Middle') && styles.berthSlotActive]}>
                        <Text style={[styles.berthSlotText, p.berthType.includes('Middle') && styles.berthSlotTextActive]}>
                          Middle Berth (MB)
                        </Text>
                      </View>
                      <View style={styles.aisleGap}>
                        <Text style={styles.aisleText}>Aisle</Text>
                      </View>
                    </View>

                    {/* Lower Berth (Window) */}
                    <View style={styles.berthDiagramRow}>
                      <View style={[styles.berthSlot, p.berthType.includes('Lower') && !p.berthType.includes('Side') && styles.berthSlotActive]}>
                        <Text style={[styles.berthSlotText, p.berthType.includes('Lower') && !p.berthType.includes('Side') && styles.berthSlotTextActive]}>
                          Lower Berth (LB) 🪟 Window
                        </Text>
                      </View>
                      <View style={[styles.berthSlotSide, p.berthType.includes('Side Lower') && styles.berthSlotActive]}>
                        <Text style={[styles.berthSlotText, p.berthType.includes('Side Lower') && styles.berthSlotTextActive]}>
                          Side Lower 🪟
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={{ height: 35 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7FD',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.7,
    marginLeft: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    marginBottom: 12,
  },
  pnrTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
  },
  quickPresetsSection: {
    marginBottom: 14,
  },
  quickPresetsTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  presetsScroll: {
    flexDirection: 'row',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.borderBlue,
  },
  presetChipIcon: {
    fontSize: 9,
    marginRight: 4,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  checkBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  checkBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  copiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  copiedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trainNumBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  trainNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pnrBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pnrBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  trainName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    marginLeft: 4,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stationBlock: {
    width: 80,
  },
  stationCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  stationName: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  routeArrow: {
    alignItems: 'center',
    flex: 1,
  },
  classQuotaText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  arrowLine: {
    width: 36,
    height: 2,
    backgroundColor: Colors.primary,
    marginRight: -2,
  },
  dojText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  probabilityCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  probHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  probTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  probTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  probPercentage: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  probSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  chartBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  chartReady: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  chartPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  chartText: {
    fontSize: 12,
    color: '#475569',
  },
  bold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  passengersTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  passengerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passengerNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusCnf: {
    backgroundColor: Colors.secondaryLight,
  },
  statusRac: {
    backgroundColor: Colors.primarySoft,
  },
  statusWl: {
    backgroundColor: Colors.accentLight,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textCnf: {
    color: Colors.secondary,
  },
  textRac: {
    color: Colors.primary,
  },
  textWl: {
    color: Colors.accent,
  },
  berthDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  berthCol: {
    alignItems: 'center',
    flex: 1,
  },
  berthLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  berthVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  berthTypeVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
    textAlign: 'center',
  },
  berthDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },
  seatMapBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  seatMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  seatMapTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  visualBayLayout: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  berthDiagramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  berthSlot: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
  },
  berthSlotSide: {
    width: 90,
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  berthSlotActive: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#16A34A',
  },
  berthSlotText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  berthSlotTextActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  aisleGap: {
    width: 90,
    alignItems: 'center',
    paddingVertical: 2,
  },
  aisleText: {
    fontSize: 9,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  apiNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  apiNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    flex: 1,
  },
});
