import { StyleSheet, Platform } from 'react-native';
import { Typography } from '../../theme/typography';

export const trackerStyles = StyleSheet.create({
  // Container & Roots
  screenRoot: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerBackBtn: {
    padding: 6,
    marginRight: 8,
    borderRadius: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTrainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTrainName: {
    ...Typography.h3,
    flexShrink: 1,
  },
  headerTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  headerTypeBadgeText: {
    ...Typography.badge,
    fontSize: 9.5,
  },
  headerDateText: {
    ...Typography.caption,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },

  // HERO CARD
  heroCard: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroHeadlineContainer: {
    flex: 1,
  },
  heroHeadline: {
    ...Typography.h2,
    fontSize: 16,
  },
  heroDelayChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroDelayText: {
    ...Typography.badge,
    fontSize: 11,
  },
  heroNextStnRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroNextStnLabel: {
    ...Typography.body,
    fontSize: 13,
  },
  heroNextStnEta: {
    ...Typography.bodyBold,
    fontSize: 13,
  },

  // PROGRESS BAR
  progressWrapper: {
    marginTop: 12,
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressMarkerContainer: {
    position: 'absolute',
    top: -9,
    marginLeft: -10,
  },
  progressMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  // FOOTER SOURCE LINE
  heroFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroFooterText: {
    ...Typography.caption,
    fontSize: 11,
  },
  heroOfflineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroOfflineText: {
    ...Typography.badge,
    fontSize: 10.5,
  },

  // QUICK ACTIONS
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 8,
  },
  quickActionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 6,
  },
  quickActionText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },

  // SUMMARY STRIP
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 12,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryCol: {
    alignItems: 'center',
    flex: 1,
  },
  summaryColLabel: {
    ...Typography.microLabel,
    marginBottom: 2,
  },
  summaryColValue: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
  summaryColSub: {
    ...Typography.caption,
    fontSize: 10.5,
    marginTop: 1,
  },

  // STICKY MINI BAR
  stickyBar: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    zIndex: 999,
    elevation: 6,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    borderWidth: 1,
  },
  stickyBarText: {
    ...Typography.bodyBold,
    fontSize: 12.5,
    flex: 1,
  },
  stickyBarAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
  },
  stickyBarActionText: {
    ...Typography.badge,
    fontSize: 11,
  },

  // TIMELINE ROWS
  timelineContainer: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  stationRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  railColumn: {
    width: 48,
    alignItems: 'center',
  },
  railSegmentTop: {
    width: 3,
    flex: 1,
  },
  railSegmentBottom: {
    width: 3,
    flex: 1,
  },
  dotContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  passedDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDotPulse: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  upcomingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  },
  stationContentCard: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 14,
    justifyContent: 'center',
  },
  stationHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stationName: {
    ...Typography.bodyBold,
    fontSize: 13.5,
    flex: 1,
  },
  stationTimesGroup: {
    alignItems: 'flex-end',
  },
  stationTimeScheduled: {
    ...Typography.caption,
    fontSize: 11.5,
  },
  stationTimeExpected: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
  stationMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  platformPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  platformPillText: {
    ...Typography.badge,
    fontSize: 10,
  },
  haltText: {
    ...Typography.caption,
    fontSize: 11,
  },
  distanceText: {
    ...Typography.caption,
    fontSize: 11,
  },

  // COLLAPSIBLE PASSING STATIONS GROUP
  passingGroupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  passingRailCol: {
    width: 48,
    alignItems: 'center',
  },
  passingRailLine: {
    width: 2,
    flex: 1,
  },
  passingToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  passingToggleText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },

  // BOTTOM SHEET FOR STATION DETAIL
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    elevation: 10,
  },
  sheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetStationTitle: {
    ...Typography.h2,
    fontSize: 18,
  },
  sheetStationSub: {
    ...Typography.caption,
    marginTop: 2,
  },
  sheetGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 12,
  },
  sheetGridCol: {
    alignItems: 'center',
    flex: 1,
  },
  sheetGridLabel: {
    ...Typography.microLabel,
    marginBottom: 4,
  },
  sheetGridVal: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  sheetAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  sheetAlarmBtnText: {
    ...Typography.button,
    color: '#FFFFFF',
    fontSize: 14,
  },
});

