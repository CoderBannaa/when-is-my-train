import { calculateLiveStatus, parseTimeToMinutes } from '../utils/liveStatusEngine';
import { CorridorTrain, findOrGenerateTrain, getTrainsBetweenStations, registerTrainsIntoCatalog, TrainBetweenStation } from '../data/trainsBetweenStations';
import { SafeStorage } from '../context/PreferencesContext';

// ==========================================
// 60-SECOND CACHE ENGINE ARCHITECTURE
// ==========================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  source: 'api' | 'fallback';
}

class SixtySecondCacheEngine {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTtlMs = 10 * 60 * 1000; // 10 Minutes TTL (600,000 ms) to conserve API token quota

  /**
   * Retrieves data if present and not expired (within 10 minutes)
   */
  public get<T>(key: string): { data: T; isCached: true; ageSeconds: number } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    const ageSeconds = Math.round((now - entry.timestamp) / 1000);
    return {
      data: entry.data as T,
      isCached: true,
      ageSeconds,
    };
  }

  /**
   * Stores data in cache with exact TTL (default: 10 minutes)
   */
  public set<T>(key: string, data: T, ttlMs?: number, source: 'api' | 'fallback' = 'api'): void {
    const ttl = ttlMs || this.defaultTtlMs;
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      source,
    });
  }

  /**
   * Manually invalidate or refresh a specific train/route cache
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all expired entries
   */
  public purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Returns current cache statistics
   */
  public getStats(): { activeEntries: number; keys: string[] } {
    this.purgeExpired();
    return {
      activeEntries: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global Single Instance of Cache Engine
export const TrainCache = new SixtySecondCacheEngine();

// ==========================================
// DATA MODELS & TYPES
// ==========================================

export interface LiveStationItem {
  stationCode: string;
  stationName: string;
  platform: string;
  distanceKm: number;
  scheduledArrival: string;
  scheduledDeparture: string;
  actualArrival: string;
  actualDeparture: string;
  delayMinutes: number;
  status: 'departed' | 'current' | 'upcoming';
  isPassing?: boolean;
  day?: number;
}

export interface LiveTrainTrackingData {
  trainNumber: string;
  trainName: string;
  currentStationName: string;
  currentStationCode: string;
  nextStationName: string;
  nextStationCode: string;
  distanceToNextKm?: number;
  currentSpeedKmH: number;
  distanceLeftKm: number;
  expectedArrivalAtDestination: string;
  totalDelayMinutes: number;
  isDelayed: boolean;
  statusBanner: string;
  lastUpdated: string;
  stations: LiveStationItem[];
  isCached: boolean;
  cacheAgeSeconds?: number;
}

// ==========================================
// LIVE RAILWAY API SERVICE WITH 60-SEC CACHE
// ==========================================

// Helper to format ISO timestamps from RailRadar into 12-hour AM/PM
function formatIsoTimeTo12h(isoStr?: string): string {
  if (!isoStr) return '--:--';
  if (isoStr.includes('T')) {
    const timePart = isoStr.split('T')[1]?.split('+')[0]?.split('Z')[0];
    if (timePart) {
      const [hStr, mStr] = timePart.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr || '00';
      const mer = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h.toString().padStart(2, '0')}:${m} ${mer}`;
    }
  }
  return isoStr;
}

import { API_CONFIG, STORAGE_KEYS } from '../config/env';

class LiveTrainApiService {
  // RapidAPI credentials from env or user settings
  private rapidApiKey: string = API_CONFIG.rapidApiKey;
  private pnrHost: string = API_CONFIG.pnrHost;
  private liveTrainHost: string = API_CONFIG.liveTrainHost;
  private indianRailApiKey: string = '';
  // RailRadar API credentials from env or user settings
  private railRadarApiKey: string = API_CONFIG.railRadarApiKey;

  constructor() {
    SafeStorage.getItem(STORAGE_KEYS.RAILRADAR_API_KEY)
      .then((saved) => {
        if (saved && saved.trim()) {
          this.railRadarApiKey = saved.trim();
        }
      })
      .catch(() => {});
    SafeStorage.getItem(STORAGE_KEYS.RAPIDAPI_KEY)
      .then((saved) => {
        if (saved && saved.trim()) {
          this.rapidApiKey = saved.trim();
        }
      })
      .catch(() => {});
  }

  /**
   * Configure RailRadar.in API key (from railradar.in/developers)
   */
  public setRailRadarApiKey(key: string) {
    this.railRadarApiKey = key.trim();
    SafeStorage.setItem(STORAGE_KEYS.RAILRADAR_API_KEY, key.trim()).catch(() => {});
  }

  /**
   * Get currently active RailRadar API key
   */
  public getRailRadarApiKey(): string {
    return this.railRadarApiKey;
  }

  /**
   * Configure RapidAPI key when provided
   */
  public setApiKey(key: string, host?: string) {
    this.rapidApiKey = key.trim();
    if (host) this.liveTrainHost = host.trim();
    SafeStorage.setItem(STORAGE_KEYS.RAPIDAPI_KEY, key.trim()).catch(() => {});
  }

  /**
   * Configure IndianRailAPI.com API key
   */
  public setIndianRailApiKey(key: string) {
    this.indianRailApiKey = key.trim();
  }

  /**
   * Fetches Real PNR Status with 60-Second Cache
   */
  public async getPNRStatus(pnrNumber: string): Promise<any> {
    const cleanPnr = pnrNumber.trim().replace(/\D/g, '');
    const cacheKey = `pnr_${cleanPnr}`;

    // 1. Check 60-Second Cache
    const cached = TrainCache.get<any>(cacheKey);
    if (cached) {
      return { ...cached.data, isCached: true, cacheAgeSeconds: cached.ageSeconds };
    }

    // 2. Real API Call
    if (this.rapidApiKey && cleanPnr.length === 10) {
      try {
        const response = await fetch(
          `https://${this.pnrHost}/getPNRStatus/${cleanPnr}`,
          {
            method: 'GET',
            headers: {
              'x-rapidapi-key': this.rapidApiKey,
              'x-rapidapi-host': this.pnrHost,
            },
          }
        );

        if (response.ok) {
          const apiJson = await response.json();
          // Cache successful response for 60 seconds
          TrainCache.set(cacheKey, apiJson, 60 * 1000, 'api');
          return apiJson;
        }
      } catch (err) {
        console.warn('RapidAPI PNR call failed, using fallback:', err);
      }
    }

    return null;
  }

  /**
   * Fetches Real Live Train Running Status from Indian Railway IRCTC NTES API
   * with 60-Second In-Memory Caching
   */
  // In-memory persistent store of last verified real-time tracking data
  private lastKnownLiveStatus: Map<string, LiveTrainTrackingData> = new Map();

  /**
   * Fetches Real Live Train Running Status from Indian Railway IRCTC NTES / RailRadar API
   * with 60-Second In-Memory Caching (bypassed when forceRefresh=true)
   */
  public async getLiveTrainStatus(trainNumber: string, forceRefresh: boolean = false): Promise<LiveTrainTrackingData> {
    const cleanTrainNo = trainNumber.trim().replace(/\D/g, '');
    const cacheKey = `live_status_${cleanTrainNo}`;

    // 1. Check in-memory cache first (unless forceRefresh is true)
    if (!forceRefresh) {
      const cached = TrainCache.get<LiveTrainTrackingData>(cacheKey);
      if (cached) {
        return {
          ...cached.data,
          isCached: true,
          cacheAgeSeconds: cached.ageSeconds,
        };
      }

      // 1.1 Check persistent storage to eliminate token waste across app restarts/screens
      try {
        const storedStr = await SafeStorage.getItem(`@cache_status_${cleanTrainNo}`);
        if (storedStr) {
          const stored = JSON.parse(storedStr);
          const ageMs = Date.now() - (stored.savedAt || 0);
          if (ageMs < 10 * 60 * 1000 && stored.data) {
            TrainCache.set(cacheKey, stored.data, (10 * 60 * 1000) - ageMs, 'api');
            return {
              ...stored.data,
              isCached: true,
              cacheAgeSeconds: Math.round(ageMs / 1000),
            };
          }
        }
      } catch {}
    }

    // 2. RailRadar Local Proxy Bridge (Tareeqa 2 - Real Live Data Without API Key)
    try {
      const localProxyUrl = `http://localhost:5001/api/live-train/${cleanTrainNo}`;
      const proxyRes = await fetch(localProxyUrl, { method: 'GET' });
      if (proxyRes.ok) {
        const proxyJson = await proxyRes.json();
        if (proxyJson && proxyJson.success && Array.isArray(proxyJson.stations) && proxyJson.stations.length > 0) {
          TrainCache.set(cacheKey, proxyJson, 60 * 1000, 'api');
          SafeStorage.setItem(`@cache_status_${cleanTrainNo}`, JSON.stringify({ data: proxyJson, savedAt: Date.now() })).catch(() => {});
          this.lastKnownLiveStatus.set(cleanTrainNo, proxyJson);
          return proxyJson;
        }
      }
    } catch {
      // Local proxy not active, fall through to direct API or simulated engine
    }

    // 2.1 RailRadar.in Real-Time Live Status (Direct Provider if Key Present)
    if (this.railRadarApiKey && cleanTrainNo.length >= 4) {
      try {
        const url = `https://api.railradar.in/v1/trains/${cleanTrainNo}/live`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.railRadarApiKey}`,
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const apiJson = await response.json();
          if (apiJson && (apiJson.success || apiJson.data)) {
            const parsed = this.transformRailRadarApiResponse(cleanTrainNo, apiJson);
            TrainCache.set(cacheKey, parsed, 10 * 60 * 1000, 'api');
            SafeStorage.setItem(`@cache_status_${cleanTrainNo}`, JSON.stringify({ data: parsed, savedAt: Date.now() })).catch(() => {});
            this.lastKnownLiveStatus.set(cleanTrainNo, parsed);
            return parsed;
          }
        }
      } catch (err) {
        console.warn('RailRadar API live query error:', err);
      }
    }

    // 2.1 Return last known verified live GPS state if available before falling back to clock simulation
    const lastKnown = this.lastKnownLiveStatus.get(cleanTrainNo);
    if (lastKnown) {
      return {
        ...lastKnown,
        isCached: true,
        lastUpdated: 'RailRadar (Live Cached)',
      };
    }

    // 3. IndianRailAPI.com Live Status (prioritized if key is configured)
    if (this.indianRailApiKey && cleanTrainNo.length >= 4) {
      try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const yyyymmdd = `${yyyy}${mm}${dd}`;

        const url = `https://indianrailapi.com/api/v2/livetrainstatus/apikey/${this.indianRailApiKey}/trainnumber/${cleanTrainNo}/date/${yyyymmdd}/`;
        const response = await fetch(url);
        if (response.ok) {
          const apiJson = await response.json();
          if (apiJson?.ResponseCode === '200' && apiJson?.CurrentStation) {
            const parsed = this.transformIndianRailApiResponse(cleanTrainNo, apiJson);
            TrainCache.set(cacheKey, parsed, 60 * 1000, 'api');
            return parsed;
          }
        }
      } catch (err) {
        console.warn('IndianRailAPI live status error, trying next source:', err);
      }
    }

    // 3. Real RapidAPI Live Train Status call
    if (this.rapidApiKey && cleanTrainNo.length >= 4) {
      try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const departureDate = `${yyyy}${mm}${dd}`;

        const url = `https://${this.liveTrainHost}/api/trains/v1/train/status?deviceIdentifier=Mozilla%2520Firefox-138.0.0.0&isH5=true&client=web&train_number=${cleanTrainNo}&departure_date=${departureDate}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-rapid-api': 'rapid-api-database',
            'x-rapidapi-host': this.liveTrainHost,
            'x-rapidapi-key': this.rapidApiKey,
          },
        });

        if (response.ok) {
          const apiJson = await response.json();
          if (apiJson?.body?.stations && apiJson.body.stations.length > 0) {
            const parsedData = this.transformRapidApiResponse(cleanTrainNo, apiJson);
            // Cache successful response for 60 seconds
            TrainCache.set(cacheKey, parsedData, 60 * 1000, 'api');
            return parsedData;
          }
        }
      } catch (err) {
        console.warn('RapidAPI live status network error, falling back:', err);
      }
    }

    // 3. Fallback Engine (Runs when offline or API call fails)
    const fallbackData = this.generateRealisticFallbackStatus(cleanTrainNo);
    TrainCache.set(cacheKey, fallbackData, 60 * 1000, 'fallback');
    return fallbackData;
  }

  /**
   * Searches Trains Between Stations with 5-Minute Cache (timetables don't change every minute)
   */
  public async getTrainsBetween(fromCode: string, toCode: string, _date: string): Promise<TrainBetweenStation[]> {
    const cacheKey = `route_${fromCode}_${toCode}`;

    // Timetables cached for 5 minutes (300,000 ms)
    const cached = TrainCache.get<TrainBetweenStation[]>(cacheKey);
    if (cached) {
      return cached.data;
    }

    // Lookup trains
    const results = getTrainsBetweenStations(fromCode, toCode);
    TrainCache.set(cacheKey, results, 5 * 60 * 1000);
    return results;
  }

  /**
   * Transforms raw Indian Railway IRCTC API response into standardized LiveTrainTrackingData
   */
  private transformRapidApiResponse(trainNumber: string, json: any): LiveTrainTrackingData {
    const body = json?.body || json || {};
    const rawStations: any[] = body.stations || [];
    const currentStnCode: string = body.current_station || '';
    const isTerminated: boolean = body.terminated || false;
    const rawMsg: string = body.train_status_message || '';
    const statusMsg = rawMsg.replace(/<[^>]*>?/gm, '').trim();

    // Find active station index
    let activeIndex = -1;
    if (rawStations.length > 0) {
      if (isTerminated) {
        activeIndex = rawStations.length - 1;
      } else if (currentStnCode) {
        activeIndex = rawStations.findIndex((s: any) => s.stationCode === currentStnCode);
      }
    }

    // Build standardized dynamic stations list
    const liveStations: LiveStationItem[] = rawStations.map((st: any, idx: number) => {
      let status: 'departed' | 'current' | 'upcoming' = 'upcoming';
      if (idx < activeIndex) {
        status = 'departed';
      } else if (idx === activeIndex) {
        status = isTerminated ? 'current' : 'departed';
      } else if (idx === activeIndex + 1 && !isTerminated) {
        status = 'upcoming';
      }

      const schMin = parseTimeToMinutes(st.arrivalTime || st.departureTime || '00:00');
      const actMin = parseTimeToMinutes(st.actual_arrival_time || st.actual_departure_time || st.arrivalTime || '00:00');
      let delay = actMin - schMin;
      if (delay < 0 && schMin > 20 * 60 && actMin < 4 * 60) {
        delay += 24 * 60; // Crossed midnight
      } else if (delay < 0) {
        delay = 0;
      }

      return {
        stationCode: st.stationCode || '',
        stationName: st.stationName || '',
        platform: st.expected_platform != null ? String(st.expected_platform) : '1',
        distanceKm: parseInt(st.distance || '0', 10),
        scheduledArrival: st.arrivalTime || '--:--',
        scheduledDeparture: st.departureTime || '--:--',
        actualArrival: st.actual_arrival_time || st.arrivalTime || '--:--',
        actualDeparture: st.actual_departure_time || st.departureTime || '--:--',
        delayMinutes: delay,
        status,
      };
    });

    const currentStn = (activeIndex >= 0 && activeIndex < liveStations.length)
      ? liveStations[activeIndex]
      : (liveStations[0] || { stationName: 'En Route', stationCode: currentStnCode || 'IR', distanceKm: 0 });

    const nextStn = (activeIndex + 1 < liveStations.length)
      ? liveStations[activeIndex + 1]
      : (liveStations[liveStations.length - 1] || currentStn);

    const destStn = liveStations[liveStations.length - 1];
    const distanceLeft = destStn ? Math.max(0, destStn.distanceKm - (currentStn.distanceKm || 0)) : 100;

    // Lookup train details in local catalog if available for proper official name
    const catalogTrain = findOrGenerateTrain(trainNumber);
    const resolvedTrainName = (catalogTrain && catalogTrain.name) ? catalogTrain.name : `Express ${trainNumber}`;

    return {
      trainNumber,
      trainName: resolvedTrainName,
      currentStationName: currentStn.stationName,
      currentStationCode: currentStn.stationCode,
      nextStationName: nextStn.stationName,
      nextStationCode: nextStn.stationCode,
      currentSpeedKmH: isTerminated ? 0 : 104,
      distanceLeftKm: distanceLeft,
      expectedArrivalAtDestination: destStn?.actualArrival || destStn?.scheduledArrival || '--:--',
      totalDelayMinutes: nextStn.delayMinutes || 0,
      isDelayed: (nextStn.delayMinutes || 0) > 5,
      statusBanner: statusMsg || (isTerminated ? 'Train has reached destination' : 'Running On Time'),
      lastUpdated: 'Live NTES GPS Server',
      stations: liveStations,
      isCached: false,
    };
  }

  /**
   * Transforms raw RailRadar.in API response into standardized LiveTrainTrackingData
   */
  private transformRailRadarApiResponse(trainNumber: string, liveJson: any, scheduleJson?: any): LiveTrainTrackingData {
    const rawData = liveJson?.data || liveJson || {};
    const catalogTrain = findOrGenerateTrain(trainNumber);
    const resolvedTrainName = rawData.trainName || catalogTrain?.name || `Train ${trainNumber}`;
    const delayMinutes = typeof rawData.delayMinutes === 'number'
      ? rawData.delayMinutes
      : (parseInt(rawData.delayMinutes || '0', 10) || 0);

    const currentLocation = rawData.currentLocation || {};
    const nextHalt = rawData.nextHalt || {};
    const currentSpeed = currentLocation.speedKmh ?? (rawData.status === 'terminated' ? 0 : 94);

    const rawRouteList: any[] = Array.isArray(rawData.route)
      ? rawData.route
      : (Array.isArray(rawData.stations) ? rawData.stations : []);

    let stations: LiveStationItem[] = [];

    if (rawRouteList.length > 0) {
      // Find the exact active station index matching RailRadar's real-time position
      let currentStationIndex = -1;
      if (currentLocation.stationCode) {
        currentStationIndex = rawRouteList.findIndex(
          (s: any) => s.stationCode === currentLocation.stationCode
        );
      }
      if (currentStationIndex === -1 && typeof currentLocation.sequence === 'number') {
        currentStationIndex = rawRouteList.findIndex(
          (s: any) => s.sequence === currentLocation.sequence
        );
      }
      if (currentStationIndex === -1) {
        for (let i = rawRouteList.length - 1; i >= 0; i--) {
          if (rawRouteList[i].status === 'departed' || rawRouteList[i].status === 'at-station') {
            currentStationIndex = i;
            break;
          }
        }
      }
      if (currentStationIndex === -1) currentStationIndex = 0;

      stations = rawRouteList.map((st: any, idx: number) => {
        const isPassing = st.isHalt === false;
        let status: 'departed' | 'current' | 'upcoming' = 'upcoming';
        if (idx < currentStationIndex) {
          status = 'departed';
        } else if (idx === currentStationIndex) {
          status = 'current';
        } else {
          status = 'upcoming';
        }

        const schedArr = formatIsoTimeTo12h(st.scheduledArrival);
        const schedDep = formatIsoTimeTo12h(st.scheduledDeparture);
        const actArr = formatIsoTimeTo12h(st.actualArrival || st.scheduledArrival);
        const actDep = formatIsoTimeTo12h(st.actualDeparture || st.scheduledDeparture);

        const stDelay = typeof st.delayDeparture === 'number'
          ? st.delayDeparture
          : (typeof st.delayArrival === 'number' ? st.delayArrival : delayMinutes);

        return {
          stationCode: st.stationCode || '',
          stationName: st.stationName || '',
          platform: st.platform ? String(st.platform) : '1',
          distanceKm: typeof st.distance === 'number' ? Math.round(st.distance) : idx * 25,
          scheduledArrival: schedArr,
          scheduledDeparture: schedDep,
          actualArrival: actArr,
          actualDeparture: actDep,
          delayMinutes: stDelay,
          status,
          isPassing,
        };
      });
    } else {
      // Use catalog fallback stops
      stations = catalogTrain.stops.map((st, idx) => {
        return {
          stationCode: st.code,
          stationName: st.name,
          platform: st.platform || '1',
          distanceKm: st.distanceKm || idx * 50,
          scheduledArrival: st.arr,
          scheduledDeparture: st.dep,
          actualArrival: st.arr,
          actualDeparture: st.dep,
          delayMinutes,
          status: idx === 0 ? 'departed' : 'upcoming',
          isPassing: !!st.isPassing,
        };
      });
    }

    const activeStn = stations.find((s) => s.status === 'current') || stations[0];
    const currentStnName = activeStn?.stationName || currentLocation.stationName || catalogTrain?.originName || 'En Route';
    const currentStnCode = activeStn?.stationCode || currentLocation.stationCode || catalogTrain?.originCode || 'IR';
    const nextStnName = nextHalt.stationName || catalogTrain?.destName || 'Destination';
    const nextStnCode = nextHalt.stationCode || catalogTrain?.destCode || '';

    // Calculate dynamic distance to next halt
    let distanceToNext = 15;
    if (typeof nextHalt.distance === 'number' && typeof currentLocation.distanceFromOriginKm === 'number') {
      distanceToNext = Math.max(1, Math.round(nextHalt.distance - currentLocation.distanceFromOriginKm));
    } else if (typeof nextHalt.distance === 'number' && activeStn?.distanceKm) {
      distanceToNext = Math.max(1, Math.round(nextHalt.distance - activeStn.distanceKm));
    }

    const destStation = stations[stations.length - 1];
    const distanceLeft = typeof rawData.distanceLeftKm === 'number'
      ? rawData.distanceLeftKm
      : (destStation ? Math.max(0, destStation.distanceKm - (typeof currentLocation.distanceFromOriginKm === 'number' ? Math.round(currentLocation.distanceFromOriginKm) : activeStn?.distanceKm || 0)) : 180);

    const destExpectedArr = destStation?.actualArrival && destStation.actualArrival !== '--:--'
      ? destStation.actualArrival
      : (destStation?.scheduledArrival || '--:--');

    const liveSpeed = typeof currentLocation.speedKmh === 'number' && currentLocation.speedKmh > 0
      ? currentLocation.speedKmh
      : (typeof currentLocation.speedToNextStationKmph === 'number' && currentLocation.speedToNextStationKmph > 0
        ? Math.round(currentLocation.speedToNextStationKmph)
        : (rawData.status === 'terminated' ? 0 : 88));

    const statusBanner = delayMinutes > 5
      ? `Delayed by ${delayMinutes} mins (RailRadar Live)`
      : delayMinutes === 0
      ? 'Running On Time (RailRadar Live)'
      : `Running On Time (${delayMinutes}m delay)`;

    return {
      trainNumber,
      trainName: resolvedTrainName,
      currentStationName: currentStnName,
      currentStationCode: currentStnCode,
      nextStationName: nextStnName,
      nextStationCode: nextStnCode,
      distanceToNextKm: distanceToNext,
      currentSpeedKmH: liveSpeed,
      distanceLeftKm: distanceLeft,
      expectedArrivalAtDestination: destExpectedArr,
      totalDelayMinutes: delayMinutes,
      isDelayed: delayMinutes > 5,
      statusBanner,
      lastUpdated: 'RailRadar GPS Real-time',
      stations,
      isCached: false,
    };
  }

  /**
   * Transforms raw IndianRailAPI.com response into standardized LiveTrainTrackingData
   */
  private transformIndianRailApiResponse(trainNumber: string, json: any): LiveTrainTrackingData {
    const currentStn = json.CurrentStation || {};
    const route: any[] = json.TrainRoute || [];

    const catalogTrain = findOrGenerateTrain(trainNumber);
    const resolvedTrainName = catalogTrain?.name || `Express ${trainNumber}`;

    let delayMins = 0;
    if (currentStn.DelayInArrival && currentStn.DelayInArrival !== '-') {
      const match = String(currentStn.DelayInArrival).match(/\d+/);
      if (match) delayMins = parseInt(match[0], 10);
    } else if (currentStn.DelayInDeparture && currentStn.DelayInDeparture !== '-') {
      const match = String(currentStn.DelayInDeparture).match(/\d+/);
      if (match) delayMins = parseInt(match[0], 10);
    }

    const stations: LiveStationItem[] = route.map((st: any) => {
      const isDeparted = st.IsDeparted === 'true' || st.IsDeparted === '1' || st.IsDeparted === 'Departed';
      let delay = 0;
      if (st.DelayInArrival && st.DelayInArrival !== '-') {
        const m = String(st.DelayInArrival).match(/\d+/);
        if (m) delay = parseInt(m[0], 10);
      }

      return {
        stationCode: st.StationCode || '',
        stationName: st.StationName || '',
        platform: '1',
        distanceKm: parseInt(st.Distance || '0', 10) || 0,
        scheduledArrival: st.ScheduleArrival || '--:--',
        scheduledDeparture: st.ScheduleDeparture || '--:--',
        actualArrival: st.ActualArrival || '--:--',
        actualDeparture: st.ActualDeparture || '--:--',
        delayMinutes: delay,
        status: isDeparted ? 'departed' : (st.StationCode === currentStn.StationCode ? 'current' : 'upcoming'),
      };
    });

    const activeIndex = stations.findIndex((s) => s.stationCode === currentStn.StationCode);
    const nextStn = (activeIndex >= 0 && activeIndex + 1 < stations.length)
      ? stations[activeIndex + 1]
      : stations[stations.length - 1];

    const currentName = currentStn.StationName || (activeIndex >= 0 ? stations[activeIndex].stationName : 'En Route');
    const statusBanner = delayMins > 0 ? `Late by ${delayMins} mins` : 'Running On Time';

    return {
      trainNumber,
      trainName: resolvedTrainName,
      currentStationName: currentName,
      currentStationCode: currentStn.StationCode || '',
      nextStationName: nextStn?.stationName || 'Destination',
      nextStationCode: nextStn?.stationCode || '',
      currentSpeedKmH: 94,
      distanceLeftKm: 150,
      expectedArrivalAtDestination: route[route.length - 1]?.ActualArrival || '--:--',
      totalDelayMinutes: delayMins,
      isDelayed: delayMins > 5,
      statusBanner,
      lastUpdated: 'IndianRailAPI Live Server',
      stations,
      isCached: false,
    };
  }

  /**
   * Generates realistic simulated telemetry status when no API key is provided
   */
  private generateRealisticFallbackStatus(trainNumber: string): LiveTrainTrackingData {
    const train: CorridorTrain = findOrGenerateTrain(trainNumber);

    const now = new Date();
    // Calculate current IST minutes (UTC + 5:30)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffsetMs);
    const currentIstMinutes = istDate.getHours() * 60 + istDate.getMinutes();

    const liveEngineData = calculateLiveStatus(train, currentIstMinutes);

    const stationItems: LiveStationItem[] = liveEngineData.stationDetails.map((st, idx) => {
      let status: 'departed' | 'current' | 'upcoming' = 'upcoming';
      if (idx < liveEngineData.activeStopIndex) status = 'departed';
      else if (idx === liveEngineData.activeStopIndex) status = 'current';

      return {
        stationCode: st.code,
        stationName: st.name,
        platform: st.platform,
        distanceKm: st.distanceKm,
        scheduledArrival: st.scheduledArr,
        scheduledDeparture: st.scheduledDep,
        actualArrival: st.actualArr,
        actualDeparture: st.actualDep,
        delayMinutes: st.delayMinutes || st.delayAtStopMinutes || 0,
        status,
        isPassing: !!st.isPassing,
        day: st.day,
      };
    });

    const destStop = liveEngineData.stationDetails[liveEngineData.stationDetails.length - 1];

    return {
      trainNumber: train.number,
      trainName: train.name,
      currentStationName: liveEngineData.currentStationName,
      currentStationCode: liveEngineData.currentStationCode,
      nextStationName: liveEngineData.nextStationName,
      nextStationCode: liveEngineData.nextStationCode,
      currentSpeedKmH: liveEngineData.currentSpeed || 94,
      distanceLeftKm: liveEngineData.distanceRemainingKm ?? 252,
      expectedArrivalAtDestination: train.arrTime || destStop?.actualArr || '--',
      totalDelayMinutes: liveEngineData.delayMinutes,
      isDelayed: liveEngineData.isDelayed,
      statusBanner: liveEngineData.bannerStatusText,
      lastUpdated: 'Just now',
      stations: stationItems,
      isCached: false,
    };
  }

  /**
   * Fetches authentic Trains Between Stations from local proxy backend (eRail scraper),
   * with automatic fallback to dynamically seeded realistic route trains.
   */
  public async getTrainsBetweenStations(
    fromCode: string,
    toCode: string,
    forceRefresh: boolean = false
  ): Promise<TrainBetweenStation[]> {
    const normFrom = (fromCode || '').trim().toUpperCase();
    const normTo = (toCode || '').trim().toUpperCase();
    const cacheKey = `tbs_${normFrom}__${normTo}`;

    if (!forceRefresh) {
      const cached = TrainCache.get<TrainBetweenStation[]>(cacheKey);
      if (cached && cached.data && cached.data.length > 0) {
        return cached.data;
      }
    }

    // 1. Try local proxy server (port 5001) for 100% authentic real Indian Railway trains
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(`http://localhost:5001/api/trains-between-stations?from=${normFrom}&to=${normTo}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.trains) && json.trains.length > 0) {
          registerTrainsIntoCatalog(json.trains);
          TrainCache.set(cacheKey, json.trains, 10 * 60 * 1000, 'api');
          return json.trains;
        }
      }
    } catch {
      // Proxy unavailable or timed out; smoothly continue to fallback
    }

    // 2. Fallback to procedural route-seeded trains (each pair has distinct trains)
    const fallbackList = getTrainsBetweenStations(normFrom, normTo);
    TrainCache.set(cacheKey, fallbackList, 5 * 60 * 1000, 'fallback');
    return fallbackList;
  }
}

// Export Singleton Service
export const LiveTrainApi = new LiveTrainApiService();
