/**
 * buildTrackerViewModel.ts
 * Pure view-model generator for the Live Train Tracker screen.
 * Strictly honest: Never fabricates placeholder numbers or data not provided by the API/scraper.
 */

import { LiveTrainTrackingData, LiveStationItem } from '../../services/liveTrainApiService';
import { DataSource, DataErrorKind } from '../../services/dataTypes';
import {
  parseTimeToMinutes,
  formatTime12h,
  parseDurationMinutes,
  formatDuration,
} from '../../utils/trainTime';

export type TrackerState =
  | 'loading'
  | 'not_started'
  | 'running'
  | 'at_station'
  | 'completed'
  | 'cancelled'
  | 'unavailable';

export interface TimelineStation {
  stationCode: string;
  stationName: string;
  platform?: string;
  distanceKm?: number;
  scheduledArrival: string;
  scheduledDeparture: string;
  actualArrival?: string;
  actualDeparture?: string;
  expectedArrival?: string;
  expectedDeparture?: string;
  delayMinutes: number;
  status: 'departed' | 'current' | 'upcoming';
  isPassing?: boolean;
  haltMinutes?: number;
  day?: number;
}

export interface TrackerViewModel {
  state: TrackerState;
  trainNumber: string;
  trainName: string;
  trainType: string;

  // Real delay info
  delayMinutes: number;
  delayStatusText: string;
  delaySeverity: 'on_time' | 'low' | 'high';

  // Positions & Movement
  statusHeroHeadline: string;
  currentStation?: TimelineStation;
  nextStation?: TimelineStation;
  minutesToNextStation?: number;

  // Progress (origin -> dest)
  progressFraction: number; // 0..1
  distanceCoveredKm?: number;
  totalDistanceKm?: number;

  // Journey Summary (origin, dest, duration, halts)
  originStation?: TimelineStation;
  destinationStation?: TimelineStation;
  scheduledDepOrigin?: string;
  expectedArrDestination?: string;
  scheduledArrDestination?: string;
  totalDurationText?: string;
  totalHaltsCount?: number;

  // Stations & Timeline
  stations: TimelineStation[];
  currentStationIndex: number;

  // Source & Freshness (Honest!)
  provider?: string;
  sourceText: string;
  isStale: boolean;
  unavailableReason?: string;
}

export function deriveTrainType(name: string): string {
  const upper = (name || '').toUpperCase();
  if (upper.includes('VANDE BHARAT')) return 'Vande Bharat';
  if (upper.includes('RAJDHANI')) return 'Rajdhani';
  if (upper.includes('SHATABDI')) return 'Shatabdi';
  if (upper.includes('GATIMAAN')) return 'Gatimaan';
  if (upper.includes('DURONTO')) return 'Duronto';
  if (upper.includes('HUMSAFAR')) return 'Humsafar';
  if (upper.includes('INTERCITY')) return 'Intercity';
  if (upper.includes('SUPERFAST') || upper.includes('SF')) return 'Superfast';
  return 'Express';
}

function calculateHalt(arr: string, dep: string): number | undefined {
  if (!arr || !dep || arr === '--:--' || dep === '--:--' || arr === dep) return undefined;
  const arrM = parseTimeToMinutes(arr);
  const depM = parseTimeToMinutes(dep);
  if (depM >= arrM) {
    const diff = depM - arrM;
    return diff > 0 && diff <= 120 ? diff : undefined;
  }
  return undefined;
}

function addMinutesToTime(timeStr: string, minsToAdd: number): string {
  if (!timeStr || timeStr === '--:--') return timeStr;
  const baseMins = parseTimeToMinutes(timeStr);
  const total = (baseMins + minsToAdd + 1440) % 1440;
  let h = Math.floor(total / 60);
  const m = total % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm} ${period}`;
}

export function buildTrackerViewModel(
  data: LiveTrainTrackingData | null,
  status: 'loading' | 'ready' | 'error',
  source: DataSource,
  provider?: string,
  ageSeconds?: number | null,
  error?: { kind: DataErrorKind; message: string }
): TrackerViewModel {
  // 1. Loading State
  if (status === 'loading' && !data) {
    return {
      state: 'loading',
      trainNumber: '',
      trainName: 'Loading Train Status...',
      trainType: 'Express',
      delayMinutes: 0,
      delayStatusText: 'Loading...',
      delaySeverity: 'on_time',
      statusHeroHeadline: 'Fetching Live Tracking Data...',
      progressFraction: 0,
      stations: [],
      currentStationIndex: -1,
      sourceText: 'Connecting to Indian Railways...',
      isStale: false,
    };
  }

  // 2. Unavailable / Error State
  if (!data || !data.stations || data.stations.length === 0 || status === 'error') {
    return {
      state: 'unavailable',
      trainNumber: data?.trainNumber || '',
      trainName: data?.trainName || 'Live Tracking Unavailable',
      trainType: deriveTrainType(data?.trainName || ''),
      delayMinutes: 0,
      delayStatusText: 'Unavailable',
      delaySeverity: 'on_time',
      statusHeroHeadline: 'Unable to track this train right now',
      progressFraction: 0,
      stations: [],
      currentStationIndex: -1,
      sourceText: 'No live GPS tracking available',
      isStale: false,
      unavailableReason: error?.message || 'Server did not return a valid schedule or route for this train.',
    };
  }

  const rawStations = data.stations || [];
  const trainType = deriveTrainType(data.trainName);

  // Convert raw stations into timeline stations with halt & expected times
  const stations: TimelineStation[] = rawStations.map((st) => {
    const delay = typeof st.delayMinutes === 'number' ? st.delayMinutes : 0;
    const halt = calculateHalt(st.scheduledArrival, st.scheduledDeparture);

    let expArr = st.actualArrival && st.actualArrival !== '--:--' ? st.actualArrival : undefined;
    if (!expArr && st.scheduledArrival && st.scheduledArrival !== '--:--') {
      expArr = delay !== 0 ? addMinutesToTime(st.scheduledArrival, delay) : st.scheduledArrival;
    }

    let expDep = st.actualDeparture && st.actualDeparture !== '--:--' ? st.actualDeparture : undefined;
    if (!expDep && st.scheduledDeparture && st.scheduledDeparture !== '--:--') {
      expDep = delay !== 0 ? addMinutesToTime(st.scheduledDeparture, delay) : st.scheduledDeparture;
    }

    return {
      stationCode: st.stationCode,
      stationName: st.stationName,
      platform: st.platform && st.platform !== '-' && st.platform !== '0' ? st.platform : undefined,
      distanceKm: typeof st.distanceKm === 'number' && st.distanceKm > 0 ? st.distanceKm : undefined,
      scheduledArrival: st.scheduledArrival || '--:--',
      scheduledDeparture: st.scheduledDeparture || '--:--',
      actualArrival: st.actualArrival,
      actualDeparture: st.actualDeparture,
      expectedArrival: expArr,
      expectedDeparture: expDep,
      delayMinutes: delay,
      status: st.status,
      isPassing: Boolean(st.isPassing),
      haltMinutes: halt,
      day: st.day,
    };
  });

  // Find active / current station index
  let currentIdx = stations.findIndex((s) => s.status === 'current');
  const firstUpcomingIdx = stations.findIndex((s) => s.status === 'upcoming');

  // Determine State
  const bannerUpper = (data.statusBanner || '').toUpperCase();
  const isCancelled = bannerUpper.includes('CANCELLED');
  const allDeparted = stations.every((s) => s.status === 'departed');
  const noneDeparted = stations.every((s) => s.status === 'upcoming');

  let state: TrackerState = 'running';
  if (isCancelled) {
    state = 'cancelled';
  } else if (allDeparted) {
    state = 'completed';
    currentIdx = stations.length - 1;
  } else if (noneDeparted && currentIdx === -1) {
    state = 'not_started';
    currentIdx = 0;
  } else if (currentIdx !== -1) {
    // Check if stopped at station
    const currentSpeed = typeof data.currentSpeedKmH === 'number' ? data.currentSpeedKmH : data.currentSpeed;
    if (currentSpeed === 0 || bannerUpper.includes('AT ') || bannerUpper.includes('ARRIVED AT')) {
      state = 'at_station';
    } else {
      state = 'running';
    }
  } else if (firstUpcomingIdx > 0) {
    // Train is running between station [firstUpcomingIdx - 1] and [firstUpcomingIdx]
    state = 'running';
    currentIdx = firstUpcomingIdx - 1;
  } else {
    state = 'running';
    currentIdx = 0;
  }

  const currentStn = stations[currentIdx] || stations[0];
  const nextStn = firstUpcomingIdx >= 0 ? stations[firstUpcomingIdx] : undefined;

  // Real Delay
  const realDelay = typeof data.totalDelayMinutes === 'number'
    ? data.totalDelayMinutes
    : (currentStn?.delayMinutes || 0);

  let delaySeverity: 'on_time' | 'low' | 'high' = 'on_time';
  let delayStatusText = 'On time';

  if (realDelay <= 0) {
    delaySeverity = 'on_time';
    delayStatusText = 'On time';
  } else if (realDelay <= 15) {
    delaySeverity = 'low';
    delayStatusText = `+${realDelay} min`;
  } else {
    delaySeverity = 'high';
    delayStatusText = `+${realDelay} min late`;
  }

  // Hero Headline
  let statusHeroHeadline = '';
  if (state === 'not_started') {
    statusHeroHeadline = `Departs ${formatTime12h(stations[0]?.scheduledDeparture || '')}`;
  } else if (state === 'completed') {
    statusHeroHeadline = `Arrived at ${stations[stations.length - 1]?.stationName || ''}`;
  } else if (state === 'at_station') {
    statusHeroHeadline = `At ${currentStn?.stationName || currentStn?.stationCode || ''}`;
  } else if (state === 'running') {
    const fromName = currentStn?.stationName || currentStn?.stationCode || '';
    const toName = nextStn?.stationName || nextStn?.stationCode || '';
    if (fromName && toName && fromName !== toName) {
      statusHeroHeadline = `Running between ${fromName} and ${toName}`;
    } else {
      statusHeroHeadline = `Next: ${nextStn?.stationName || currentStn?.stationName || ''}`;
    }
  } else if (state === 'cancelled') {
    statusHeroHeadline = data.statusBanner || 'Train Cancelled';
  }

  // Progress Fraction
  let progressFraction = 0;
  const distCovered = typeof data.distanceCoveredKm === 'number' ? data.distanceCoveredKm : undefined;
  const distTotal = typeof data.totalDistanceKm === 'number' ? data.totalDistanceKm : undefined;

  if (distCovered !== undefined && distTotal && distTotal > 0) {
    progressFraction = Math.max(0, Math.min(1, distCovered / distTotal));
  } else if (stations.length > 1) {
    const activeIdx = Math.max(0, currentIdx);
    progressFraction = Math.max(0, Math.min(1, activeIdx / (stations.length - 1)));
  }

  // Origin & Destination
  const originStation = stations[0];
  const destinationStation = stations[stations.length - 1];

  // Duration
  let totalDurationText: string | undefined = undefined;
  if (originStation?.scheduledDeparture && destinationStation?.scheduledArrival) {
    const depM = parseTimeToMinutes(originStation.scheduledDeparture);
    let arrM = parseTimeToMinutes(destinationStation.scheduledArrival);
    if (arrM < depM) arrM += 1440;
    totalDurationText = formatDuration(arrM - depM);
  }

  // Halts Count (commercial stops)
  const totalHalts = stations.filter((s) => !s.isPassing).length;

  // Minutes until next station (Strictly hidden for stale data older than 15 min)
  let minutesToNextStation: number | undefined = undefined;
  const isOlderThan15m = typeof ageSeconds === 'number' && ageSeconds > 15 * 60;
  if (!isOlderThan15m && source !== 'stale' && nextStn && nextStn.expectedArrival) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const arrMin = parseTimeToMinutes(nextStn.expectedArrival);
    const diff = arrMin - nowMin;
    if (diff > 0 && diff < 300) {
      minutesToNextStation = diff;
    }
  }

  // Source & Age
  const providerLabel = provider ? (provider === 'railyatri' ? 'RailYatri' : provider === 'erail' ? 'eRail' : provider) : 'Railway NTES';
  let ageText = 'just now';
  if (typeof ageSeconds === 'number' && ageSeconds > 0) {
    if (ageSeconds < 60) ageText = `${ageSeconds}s ago`;
    else if (ageSeconds < 3600) ageText = `${Math.floor(ageSeconds / 60)}m ago`;
    else ageText = `${Math.floor(ageSeconds / 3600)}h ago`;
  }
  const sourceText = `Source: ${providerLabel} • updated ${ageText}`;

  return {
    state,
    trainNumber: data.trainNumber || '',
    trainName: data.trainName || '',
    trainType,
    delayMinutes: realDelay,
    delayStatusText,
    delaySeverity,
    statusHeroHeadline,
    currentStation: currentStn,
    nextStation: nextStn,
    minutesToNextStation,
    progressFraction,
    distanceCoveredKm: distCovered,
    totalDistanceKm: distTotal,
    originStation,
    destinationStation,
    scheduledDepOrigin: originStation?.scheduledDeparture,
    expectedArrDestination: destinationStation?.expectedArrival || destinationStation?.scheduledArrival,
    scheduledArrDestination: destinationStation?.scheduledArrival,
    totalDurationText,
    totalHaltsCount: totalHalts,
    stations,
    currentStationIndex: currentIdx,
    provider: providerLabel,
    sourceText,
    isStale: source === 'stale',
  };
}

