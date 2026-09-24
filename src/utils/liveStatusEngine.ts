import { CorridorTrain, RouteStop } from '../data/trainsBetweenStations';

export type TrainOperationalState =
  | 'NOT_STARTED'
  | 'HALTED_AT_STATION'
  | 'RUNNING_BETWEEN_STATIONS'
  | 'COMPLETED';

export interface StationLiveDetail {
  code: string;
  name: string;
  scheduledArr: string;
  scheduledDep: string;
  actualArr: string;
  actualDep: string;
  platform: string;
  distanceKm: number;
  haltDuration: string;
  status: 'PASSED' | 'CURRENT' | 'UPCOMING';
  delayAtStopMinutes: number;
}

export interface LiveTrainStatusData {
  trainNumber: string;
  trainName: string;
  type: string;
  isLocalEmu: boolean;
  state: TrainOperationalState;
  bannerStatusText: string;
  bannerSubText: string;
  isDelayed: boolean;
  delayMinutes: number;
  currentSpeed: number; // km/h (0 when halted)
  currentPlatform: string;
  currentStationName: string;
  currentStationCode: string;
  nextStationName: string;
  nextStationCode: string;
  etaNextStopMinutes: number;
  lastUpdatedText: string;
  totalDistanceKm: number;
  distanceCoveredKm: number;
  stationDetails: StationLiveDetail[];
  activeStopIndex: number;
}

// Lookup caches to prevent repeated string parsing & formatting overhead
const timeParseCache = new Map<string, number>();
const minutesFormatCache = new Map<number, string>();

// Convert "07:15 AM" or "05:40 PM" to minutes from midnight (0 - 1439) with caching
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || timeStr === '--') return -1;
  const cached = timeParseCache.get(timeStr);
  if (cached !== undefined) return cached;

  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) return -1;
  const [hStr, mStr] = parts[0].split(':');
  let hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  const meridiem = parts[1]?.toUpperCase();

  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const total = hours * 60 + minutes;

  timeParseCache.set(timeStr, total);
  return total;
}

// Convert minutes from midnight back to "HH:MM AM/PM" with caching
export function formatMinutesToTime(totalMins: number): string {
  let normalized = Math.floor(totalMins) % (24 * 60);
  if (normalized < 0) normalized += 24 * 60;

  const cached = minutesFormatCache.get(normalized);
  if (cached) return cached;

  let hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const meridiem = hours >= 12 ? 'PM' : 'AM';

  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;

  const hh = hours.toString().padStart(2, '0');
  const mm = mins.toString().padStart(2, '0');
  const formatted = `${hh}:${mm} ${meridiem}`;

  if (minutesFormatCache.size < 1440) {
    minutesFormatCache.set(normalized, formatted);
  }
  return formatted;
}

// Standard platform number lookup for stations
export function getPlatformForStation(stationCode: string, isReverse: boolean): string {
  switch (stationCode.toUpperCase()) {
    case 'NDLS':
      return isReverse ? 'Platform 1' : 'Platform 16';
    case 'NZM':
      return isReverse ? 'Platform 2' : 'Platform 7';
    case 'LJN':
      return 'Platform 6';
    case 'MKG':
      return 'Platform 1';
    case 'AMS':
      return 'Platform 1';
    case 'POF':
      return 'Platform 2';
    case 'HRN':
      return 'Platform 1';
    case 'JTU':
      return 'Platform 1';
    case 'KVX':
      return 'Platform 2';
    case 'AJG':
      return 'Platform 1';
    case 'SIC':
      return 'Platform 1';
    case 'ON':
      return isReverse ? 'Platform 2' : 'Platform 3';
    case 'CNB':
      return isReverse ? 'Platform 1' : 'Platform 5';
    case 'CPA':
      return 'Platform 1';
    case 'KNP':
      return 'Platform 1';
    case 'BLU':
      return 'Platform 1';
    case 'KJN':
      return 'Platform 1';
    case 'FBD':
      return 'Platform 1';
    case 'KSJ':
      return isReverse ? 'Platform 2' : 'Platform 1';
    case 'PRYJ':
      return 'Platform 4';
    case 'BSB':
      return 'Platform 1';
    case 'LKO':
      return 'Platform 2';
    case 'OKA':
      return isReverse ? 'Platform 1' : 'Platform 2';
    case 'TKD':
      return isReverse ? 'Platform 2' : 'Platform 3';
    case 'FDB':
      return isReverse ? 'Platform 1' : 'Platform 2';
    case 'FDN':
      return isReverse ? 'Platform 2' : 'Platform 3';
    case 'BVH':
      return isReverse ? 'Platform 1' : 'Platform 2';
    case 'AST':
      return isReverse ? 'Platform 2' : 'Platform 3';
    case 'PWL':
      return isReverse ? 'Platform 1' : 'Platform 2';
    case 'HDL':
      return isReverse ? 'Platform 2' : 'Platform 1';
    case 'KSV':
      return isReverse ? 'Platform 1' : 'Platform 2';
    case 'CHJ':
      return isReverse ? 'Platform 2' : 'Platform 1';
    case 'MTJ':
      return isReverse ? 'Platform 3' : 'Platform 1';
    case 'RKM':
      return isReverse ? 'Platform 1' : 'Platform 2';
    case 'AGC':
      return isReverse ? 'Platform 1' : 'Platform 2';
    default:
      return 'Platform 1';
  }
}

// Distance from corridor origin in km
export function getStationDistanceKm(index: number, totalStops: number): number {
  return Math.round((index / Math.max(1, totalStops - 1)) * 195);
}

// Live status computation cache (prevents redundant calculations on rapid renders)
const liveStatusCache = new Map<string, LiveTrainStatusData>();
const MAX_LIVE_STATUS_CACHE = 60;

/**
 * Real-Time Live Status Engine for any Corridor Train
 * Matches device clock or simulated clock to calculate exact train movement,
 * delay, platform, and speed.
 */
export function calculateLiveStatus(
  train: CorridorTrain,
  simulatedMinutes?: number,
  forceDelayMinutes = 8
): LiveTrainStatusData {
  const stops = train.stops;
  if (!stops || stops.length === 0) {
    throw new Error('Train has no stops');
  }

  // Get current time in minutes from midnight
  let currentMins: number;
  if (typeof simulatedMinutes === 'number') {
    currentMins = simulatedMinutes;
  } else {
    const now = new Date();
    currentMins = now.getHours() * 60 + now.getMinutes();
  }

  const cacheKey = `${train.number}__${currentMins}__${forceDelayMinutes}`;
  const cached = liveStatusCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];

  const originDepMins = parseTimeToMinutes(firstStop.dep === '--' ? firstStop.arr : firstStop.dep);
  const destArrMins = parseTimeToMinutes(lastStop.arr === '--' ? lastStop.dep : lastStop.arr);

  const isReverse = train.destCode === 'NDLS' || train.destCode === 'NZM' || train.destCode === 'DLI';
  const delayMins = forceDelayMinutes;
  const isDelayed = delayMins > 0;

  // Build station details with platform and distance
  const stationDetails: StationLiveDetail[] = stops.map((stop, idx) => {
    const scheduledArrMins = parseTimeToMinutes(stop.arr);
    const scheduledDepMins = parseTimeToMinutes(stop.dep);

    const actualArrMins = scheduledArrMins !== -1 ? scheduledArrMins + delayMins : -1;
    const actualDepMins = scheduledDepMins !== -1 ? scheduledDepMins + delayMins : -1;

    let haltDuration = '2m';
    if (scheduledArrMins !== -1 && scheduledDepMins !== -1) {
      const diff = scheduledDepMins - scheduledArrMins;
      haltDuration = diff > 0 ? `${diff}m` : '1m';
    } else if (idx === 0) {
      haltDuration = 'Origin';
    } else if (idx === stops.length - 1) {
      haltDuration = 'Term';
    }

    return {
      code: stop.code,
      name: stop.name,
      scheduledArr: stop.arr,
      scheduledDep: stop.dep,
      actualArr: actualArrMins !== -1 ? formatMinutesToTime(actualArrMins) : '--',
      actualDep: actualDepMins !== -1 ? formatMinutesToTime(actualDepMins) : '--',
      platform: getPlatformForStation(stop.code, isReverse),
      distanceKm: typeof stop.distanceKm === 'number' ? stop.distanceKm : getStationDistanceKm(idx, stops.length),
      haltDuration,
      status: 'UPCOMING',
      delayAtStopMinutes: delayMins,
    };
  });

  let state: TrainOperationalState = 'RUNNING_BETWEEN_STATIONS';
  let activeStopIndex = 0;
  let currentSpeed = 0;
  let bannerStatusText = '';
  let bannerSubText = '';
  let currentStationName = '';
  let currentStationCode = '';
  let nextStationName = '';
  let nextStationCode = '';
  let currentPlatform = '';
  let etaNextStopMinutes = 0;

  // Base top cruising speed by train category
  const cruisingSpeed = train.type === 'Gatimaan' ? 140 : train.type === 'Shatabdi' ? 120 : train.isLocalEmu ? 78 : 95;

  // 1. CASE: NOT YET STARTED
  if (currentMins < originDepMins + delayMins) {
    state = 'NOT_STARTED';
    activeStopIndex = 0;
    currentSpeed = 0;
    currentStationName = firstStop.name;
    currentStationCode = firstStop.code;
    currentPlatform = stationDetails[0].platform;
    nextStationName = stops[1]?.name || lastStop.name;
    nextStationCode = stops[1]?.code || lastStop.code;

    const minsToStart = originDepMins + delayMins - currentMins;
    bannerStatusText = `Scheduled Departure at ${firstStop.dep}`;
    bannerSubText = `Yet to depart from ${firstStop.name} • Starts in ${minsToStart > 60 ? `${Math.floor(minsToStart / 60)}h ${minsToStart % 60}m` : `${minsToStart} mins`}`;

    stationDetails[0].status = 'CURRENT';
  }
  // 2. CASE: TRIP COMPLETED
  else if (currentMins >= destArrMins + delayMins) {
    state = 'COMPLETED';
    activeStopIndex = stops.length - 1;
    currentSpeed = 0;
    currentStationName = lastStop.name;
    currentStationCode = lastStop.code;
    currentPlatform = stationDetails[stationDetails.length - 1].platform;
    nextStationName = 'Journey Completed';
    nextStationCode = lastStop.code;

    bannerStatusText = isDelayed ? `Arrived ${delayMins} Mins Late` : 'Arrived Right Time';
    bannerSubText = `Completed run at ${lastStop.name} (${stationDetails[stationDetails.length - 1].actualArr})`;

    stationDetails.forEach((s) => (s.status = 'PASSED'));
    stationDetails[stationDetails.length - 1].status = 'CURRENT';
  }
  // 3. CASE: EN ROUTE (Between Origin & Destination)
  else {
    // Search which two stops train is currently between or halted at
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const stopArrMins = parseTimeToMinutes(stop.arr);
      const stopDepMins = parseTimeToMinutes(stop.dep);

      const actualArr = stopArrMins !== -1 ? stopArrMins + delayMins : stopDepMins + delayMins;
      const actualDep = stopDepMins !== -1 ? stopDepMins + delayMins : actualArr;

      // Check if train is HALTED at station platform
      if (currentMins >= actualArr && currentMins <= actualDep) {
        state = 'HALTED_AT_STATION';
        activeStopIndex = i;
        currentSpeed = 0;
        currentStationName = stop.name;
        currentStationCode = stop.code;
        currentPlatform = stationDetails[i].platform;
        nextStationName = stops[i + 1]?.name || 'Destination';
        nextStationCode = stops[i + 1]?.code || lastStop.code;

        const remainingHalt = Math.max(1, actualDep - currentMins);
        bannerStatusText = isDelayed ? `${delayMins} Mins Late at Platform` : 'Right Time • At Platform';
        bannerSubText = `Halted at ${stop.name} (${currentPlatform}) • Departs in ${remainingHalt}m`;
        break;
      }

      // Check if train is RUNNING BETWEEN stops[i] and stops[i + 1]
      if (i < stops.length - 1) {
        const nextStopItem = stops[i + 1];
        const nextArrMins = parseTimeToMinutes(nextStopItem.arr === '--' ? nextStopItem.dep : nextStopItem.arr) + delayMins;

        if (currentMins > actualDep && currentMins < nextArrMins) {
          state = 'RUNNING_BETWEEN_STATIONS';
          activeStopIndex = i;
          currentSpeed = cruisingSpeed;
          currentStationName = stop.name;
          currentStationCode = stop.code;
          nextStationName = nextStopItem.name;
          nextStationCode = nextStopItem.code;
          currentPlatform = stationDetails[i + 1].platform;

          etaNextStopMinutes = Math.max(1, nextArrMins - currentMins);
          bannerStatusText = isDelayed
            ? `${delayMins} Mins Late • Next: ${nextStationName}`
            : `Right Time • Next: ${nextStationName}`;
          bannerSubText = `Running ${currentSpeed} km/h • Expected at ${nextStationName} in ${etaNextStopMinutes}m (${currentPlatform})`;
          break;
        }
      }
    }

    // Update station statuses
    stationDetails.forEach((s, idx) => {
      if (idx < activeStopIndex) {
        s.status = 'PASSED';
      } else if (idx === activeStopIndex) {
        s.status = 'CURRENT';
      } else {
        s.status = 'UPCOMING';
      }
    });
  }

  const totalDistanceKm = stationDetails[stationDetails.length - 1].distanceKm;
  const distanceCoveredKm = stationDetails[activeStopIndex]?.distanceKm || 0;

  const result: LiveTrainStatusData = {
    trainNumber: train.number,
    trainName: train.name,
    type: train.type,
    isLocalEmu: train.isLocalEmu,
    state,
    bannerStatusText,
    bannerSubText,
    isDelayed,
    delayMinutes: delayMins,
    currentSpeed,
    currentPlatform,
    currentStationName,
    currentStationCode,
    nextStationName,
    nextStationCode,
    etaNextStopMinutes,
    lastUpdatedText: 'Just now via GPS',
    totalDistanceKm,
    distanceCoveredKm,
    stationDetails,
    activeStopIndex,
  };

  if (liveStatusCache.size >= MAX_LIVE_STATUS_CACHE) {
    const firstKey = liveStatusCache.keys().next().value;
    if (firstKey) liveStatusCache.delete(firstKey);
  }
  liveStatusCache.set(cacheKey, result);

  return result;
}
