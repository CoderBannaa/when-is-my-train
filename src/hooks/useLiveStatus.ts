import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { TrainData } from '../services/trainDataService';
import { LiveTrainTrackingData } from '../services/liveTrainApiService';
import { DataSource, DataErrorKind } from '../services/dataTypes';
import { parseTimeToMinutes } from '../utils/trainTime';

export interface UseLiveStatusResult {
  data: LiveTrainTrackingData | null;
  status: 'loading' | 'ready' | 'error';
  source: DataSource;
  fetchedAt: number | null;
  ageSeconds: number | null;
  provider?: string;
  error?: { kind: DataErrorKind; message: string };
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  isUpdatingBackground: boolean;
}

/**
 * Calculates adaptive refresh interval based on live train position:
 * - 30s (+/- 5s) if within 5 min of scheduled arrival at station
 * - 5m (+/- 5s) if next station is > 40 min away
 * - 2m (+/- 5s) by default
 */
function calculateAdaptiveIntervalMs(data: LiveTrainTrackingData | null): number {
  if (!data || !data.stations || data.stations.length === 0) {
    return 120 * 1000; // 2 min default
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find next upcoming station
  const nextStn = data.stations.find((s) => s.status === 'upcoming');
  const currStn = data.stations.find((s) => s.status === 'current');

  if (currStn && currStn.scheduledArrival) {
    const arrMin = parseTimeToMinutes(currStn.scheduledArrival);
    const diff = Math.abs(arrMin - currentMinutes);
    if (diff <= 5) {
      // 30 seconds interval around arrival
      return 30 * 1000;
    }
  }

  if (nextStn && nextStn.scheduledArrival) {
    const nextArrMin = parseTimeToMinutes(nextStn.scheduledArrival);
    const diff = nextArrMin - currentMinutes;
    if (diff > 40) {
      // 5 min interval when next station is far
      return 300 * 1000;
    }
    if (diff <= 5 && diff >= -5) {
      // 30 seconds interval
      return 30 * 1000;
    }
  }

  // 2 min default
  return 120 * 1000;
}

export function useLiveStatus(trainNo: string): UseLiveStatusResult {
  const [data, setData] = useState<LiveTrainTrackingData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [source, setSource] = useState<DataSource>('unavailable');
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [ageSeconds, setAgeSeconds] = useState<number | null>(null);
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [error, setError] = useState<{ kind: DataErrorKind; message: string } | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingBackground, setIsUpdatingBackground] = useState(false);

  const mountedRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const lastManualRefreshRef = useRef<number>(0);
  const timerRef = useRef<any>(null);
  const latestDataRef = useRef<LiveTrainTrackingData | null>(null);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const loadData = useCallback(async (force = false, isManual = false) => {
    const cleanTrainNo = (trainNo || '').trim().replace(/\D/g, '');
    if (!cleanTrainNo) return;

    if (isManual) {
      setIsRefreshing(true);
    } else if (hasLoadedRef.current) {
      setIsUpdatingBackground(true);
    } else {
      setStatus('loading');
    }

    try {
      // 1. If not forcing, attempt cache lookup first to show cached data instantly
      if (!force) {
        const cacheResult = await TrainData.getLiveStatus(cleanTrainNo, { force: false });
        if (!mountedRef.current) return;

        if (cacheResult.data && cacheResult.data.stations?.length > 0) {
          setData(cacheResult.data);
          setSource(cacheResult.source);
          setFetchedAt(cacheResult.fetchedAt);
          setAgeSeconds(cacheResult.ageSeconds);
          setProvider(cacheResult.provider);
          setStatus('ready');
          setError(undefined);
          hasLoadedRef.current = true;

          // If cache is fresh (< 60s), avoid background refetch
          if (cacheResult.source === 'cache') {
            return;
          }
        }
      }

      // 2. Fetch live or background revalidate
      const liveResult = await TrainData.getLiveStatus(cleanTrainNo, { force });
      if (!mountedRef.current) return;

      if (liveResult.data && liveResult.data.stations?.length > 0) {
        setData(liveResult.data);
        setSource(liveResult.source);
        setFetchedAt(liveResult.fetchedAt);
        setAgeSeconds(liveResult.ageSeconds);
        setProvider(liveResult.provider);
        setStatus('ready');
        setError(liveResult.error);
        hasLoadedRef.current = true;
      } else if (liveResult.source === 'stale' && liveResult.data) {
        setData(liveResult.data);
        setSource('stale');
        setFetchedAt(liveResult.fetchedAt);
        setAgeSeconds(liveResult.ageSeconds);
        setProvider(liveResult.provider);
        setStatus('ready');
        setError(liveResult.error);
        hasLoadedRef.current = true;
      } else {
        if (!hasLoadedRef.current) {
          setData(null);
          setSource('unavailable');
          setFetchedAt(null);
          setAgeSeconds(null);
          setStatus('error');
          setError(liveResult.error || { kind: 'not_found', message: 'Train status unavailable' });
        }
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (!hasLoadedRef.current) {
        setStatus('error');
        setSource('unavailable');
        setError({ kind: 'network', message: err?.message || 'Failed to fetch live status' });
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
        setIsUpdatingBackground(false);
      }
    }
  }, [trainNo]);

  // Adaptive interval scheduler with +/- 5s jitter
  const scheduleNextPoll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!mountedRef.current) return;

    const baseMs = calculateAdaptiveIntervalMs(latestDataRef.current);
    const jitterMs = Math.round((Math.random() * 10 - 5) * 1000); // +/- 5 seconds
    const intervalMs = Math.max(15000, baseMs + jitterMs);

    timerRef.current = setTimeout(async () => {
      if (AppState.currentState === 'active' && mountedRef.current) {
        await loadData(false, false);
      }
      scheduleNextPoll();
    }, intervalMs);
  }, [loadData]);

  // Initial load & timer setup
  useEffect(() => {
    hasLoadedRef.current = false;
    loadData(false, false).then(() => {
      scheduleNextPoll();
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trainNo, loadData, scheduleNextPoll]);

  // AppState listener: pause when backgrounded, refresh immediately when foregrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        loadData(false, false);
        scheduleNextPoll();
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadData, scheduleNextPoll]);

  // Manual pull-to-refresh throttled to once per 20 seconds
  const refresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastManualRefreshRef.current < 20000) {
      return;
    }
    lastManualRefreshRef.current = now;
    await loadData(true, true);
  }, [loadData]);

  return {
    data,
    status,
    source,
    fetchedAt,
    ageSeconds,
    provider,
    error,
    refresh,
    isRefreshing,
    isUpdatingBackground,
  };
}

