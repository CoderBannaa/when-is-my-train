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
  delayMinutes?: number;
  isDelayed?: boolean;
  haltMinutes?: number;
  isPassing?: boolean;
  day?: number;
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
  distanceRemainingKm?: number;
  distanceToNextKm?: number;
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

  // Build timeline with day tracking across midnights
  let dayOffset = 0;
  let prevRawMin = -1;

  const timeline = stops.map((stop) => {
    let rawArr = parseTimeToMinutes(stop.arr);
    let rawDep = parseTimeToMinutes(stop.dep);

    if (typeof stop.day === 'number') {
      dayOffset = Math.max(0, stop.day - 1);
    } else if (prevRawMin !== -1) {
      const checkMin = rawArr !== -1 ? rawArr : rawDep;
      if (checkMin !== -1 && checkMin < (prevRawMin % 1440)) {
        dayOffset++;
      }
    }

    const cumArr = rawArr !== -1 ? dayOffset * 1440 + rawArr : -1;
    const cumDep = rawDep !== -1 ? dayOffset * 1440 + rawDep : -1;

    prevRawMin = rawDep !== -1 ? rawDep : rawArr;

    return {
      cumArr,
      cumDep,
      day: dayOffset + 1,
    };
  });

  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];

  const originDepCumulative = timeline[0].cumDep !== -1 ? timeline[0].cumDep : timeline[0].cumArr;
  const destArrCumulative = timeline[timeline.length - 1].cumArr !== -1
    ? timeline[timeline.length - 1].cumArr
    : timeline[timeline.length - 1].cumDep;

  const isReverse = train.destCode === 'NDLS' || train.destCode === 'NZM' || train.destCode === 'DLI';
  let delayMins = forceDelayMinutes;
  if (delayMins === 0 || delayMins === 8) {
    if (train.number === '22436') {
      delayMins = 2;
    } else if (train.number === '12418' || train.number === '12417') {
      delayMins = 45;
    } else if (train.number === '12189') {
      delayMins = 22;
    } else if (train.number === '22181') {
      delayMins = 15;
    } else if (train.number === '12229') {
      delayMins = 18;
    } else if (!train.isLocalEmu) {
      delayMins = 12;
    } else {
      delayMins = 4;
    }
  }
  const isDelayed = delayMins > 0;

  // Normalize current time into journey timeline (handles overnight journeys seamlessly)
  let normalizedCurrentMins = currentMins;
  if (destArrCumulative > 1440 && currentMins < (originDepCumulative % 1440)) {
    normalizedCurrentMins = 1440 + currentMins;
  }

  // Build station details with platform and distance
  const stationDetails: StationLiveDetail[] = stops.map((stop, idx) => {
    const scheduledArrMins = parseTimeToMinutes(stop.arr);
    const scheduledDepMins = parseTimeToMinutes(stop.dep);

    const actualArrMins = scheduledArrMins !== -1 ? scheduledArrMins + delayMins : -1;
    const actualDepMins = scheduledDepMins !== -1 ? scheduledDepMins + delayMins : -1;

    let haltDuration = '2m';
    if (stop.isPassing) {
      haltDuration = 'Pass';
    } else if (scheduledArrMins !== -1 && scheduledDepMins !== -1) {
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
      platform: stop.platform || (stop.isPassing ? 'Through' : getPlatformForStation(stop.code, isReverse)),
      distanceKm: typeof stop.distanceKm === 'number' ? stop.distanceKm : getStationDistanceKm(idx, stops.length),
      haltDuration,
      status: 'UPCOMING',
      delayAtStopMinutes: delayMins,
      delayMinutes: delayMins,
      isDelayed,
      haltMinutes: haltDuration === 'Pass' ? 0 : 2,
      day: timeline[idx].day,
      isPassing: !!stop.isPassing,
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
  const cruisingSpeed = train.number === '22436' ? 96 : train.type === 'Gatimaan' ? 140 : train.type === 'Shatabdi' ? 120 : train.isLocalEmu ? 78 : 105;

  let calculatedDistToNext: number | undefined = undefined;

  // 1. CASE: NOT YET STARTED
  if (normalizedCurrentMins < originDepCumulative + delayMins) {
    state = 'NOT_STARTED';
    activeStopIndex = 0;
    currentSpeed = 0;
    currentStationName = firstStop.name;
    currentStationCode = firstStop.code;
    currentPlatform = stationDetails[0].platform;
    nextStationName = stops[1]?.name || lastStop.name;
    nextStationCode = stops[1]?.code || lastStop.code;

    const minsToStart = originDepCumulative + delayMins - normalizedCurrentMins;
    bannerStatusText = `Scheduled Departure at ${firstStop.dep}`;
    bannerSubText = `Yet to depart from ${firstStop.name} • Starts in ${minsToStart > 60 ? `${Math.floor(minsToStart / 60)}h ${minsToStart % 60}m` : `${minsToStart} mins`}`;

    stationDetails[0].status = 'CURRENT';
    for (let j = 1; j < stationDetails.length; j++) {
      stationDetails[j].actualArr = '---';
      stationDetails[j].actualDep = '---';
    }
  }
  // 2. CASE: TRIP COMPLETED
  else if (normalizedCurrentMins >= destArrCumulative + delayMins) {
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
    let found = false;

    // Search which two stops train is currently between or halted at
    for (let i = 0; i < stops.length; i++) {
      const stopCum = timeline[i];
      const stopActualArr = stopCum.cumArr !== -1 ? stopCum.cumArr + delayMins : stopCum.cumDep + delayMins;
      const stopActualDep = stopCum.cumDep !== -1 ? stopCum.cumDep + delayMins : stopActualArr;

      // Check if train is HALTED at station platform
      if (normalizedCurrentMins >= stopActualArr && normalizedCurrentMins <= stopActualDep) {
        state = 'HALTED_AT_STATION';
        activeStopIndex = i;
        currentSpeed = 0;
        currentStationName = stops[i].name;
        currentStationCode = stops[i].code;
        currentPlatform = stationDetails[i].platform;
        nextStationName = stops[i + 1]?.name || 'Destination';
        nextStationCode = stops[i + 1]?.code || lastStop.code;

        const remainingHalt = Math.max(1, stopActualDep - normalizedCurrentMins);
        bannerStatusText = isDelayed ? `${delayMins} Mins Late at Platform` : 'Right Time • At Platform';
        bannerSubText = `Halted at ${stops[i].name} (${currentPlatform}) • Departs in ${remainingHalt}m`;
        found = true;
        break;
      }

      // Check if train is RUNNING BETWEEN stops[i] and stops[i + 1]
      if (i < stops.length - 1) {
        const nextCum = timeline[i + 1];
        const nextActualArr = (nextCum.cumArr !== -1 ? nextCum.cumArr : nextCum.cumDep) + delayMins;

        if (normalizedCurrentMins > stopActualDep && normalizedCurrentMins < nextActualArr) {
          state = 'RUNNING_BETWEEN_STATIONS';
          activeStopIndex = i;
          currentSpeed = cruisingSpeed;
          currentStationName = stops[i].name;
          currentStationCode = stops[i].code;
          nextStationName = stops[i + 1].name;
          nextStationCode = stops[i + 1].code;
          currentPlatform = stationDetails[i + 1].platform;

          const prevDist = stationDetails[i].distanceKm;
          const nextDist = stationDetails[i + 1].distanceKm;
          const segmentDist = Math.max(1, nextDist - prevDist);
          const segmentTime = Math.max(1, nextActualArr - stopActualDep);
          const elapsedSegment = Math.max(0, normalizedCurrentMins - stopActualDep);
          const progressRatio = Math.min(0.95, elapsedSegment / segmentTime);
          const distCoveredInSeg = Math.round(progressRatio * segmentDist);
          calculatedDistToNext = Math.max(1, segmentDist - distCoveredInSeg);

          etaNextStopMinutes = Math.max(1, nextActualArr - normalizedCurrentMins);
          bannerStatusText = `${calculatedDistToNext} km to ${nextStationName}`;
          bannerSubText = isDelayed
            ? `Late by ${delayMins} mins • Updated few seconds ago`
            : `Right Time • Updated few seconds ago`;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      activeStopIndex = 0;
      currentStationName = firstStop.name;
      currentStationCode = firstStop.code;
      nextStationName = stops[1]?.name || lastStop.name;
      nextStationCode = stops[1]?.code || lastStop.code;
      currentSpeed = cruisingSpeed;
      bannerStatusText = 'Running On Time';
      bannerSubText = `Next: ${nextStationName}`;
    }

    // Update station statuses and set upcoming station timings to '---' matching Where is My Train
    stationDetails.forEach((s, idx) => {
      if (idx < activeStopIndex) {
        s.status = 'PASSED';
      } else if (idx === activeStopIndex) {
        s.status = 'CURRENT';
      } else {
        s.status = 'UPCOMING';
        s.actualArr = '---';
        s.actualDep = '---';
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
    distanceRemainingKm: Math.max(0, totalDistanceKm - distanceCoveredKm),
    distanceToNextKm: calculatedDistToNext,
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
