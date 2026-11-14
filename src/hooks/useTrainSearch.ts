import { useState, useEffect, useCallback, useRef } from 'react';
import { TrainData } from '../services/trainDataService';
import { TrainBetweenStation } from '../data/trainsBetweenStations';
import { DataSource, DataErrorKind } from '../services/dataTypes';

export interface UseTrainSearchResult {
  data: TrainBetweenStation[] | null;
  status: 'loading' | 'ready' | 'error';
  source: DataSource;
  fetchedAt: number | null;
  ageSeconds: number | null;
  provider?: string;
  error?: { kind: DataErrorKind; message: string };
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function useTrainSearch(from: string, to: string): UseTrainSearchResult {
  const [data, setData] = useState<TrainBetweenStation[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [source, setSource] = useState<DataSource>('unavailable');
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [ageSeconds, setAgeSeconds] = useState<number | null>(null);
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [error, setError] = useState<{ kind: DataErrorKind; message: string } | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mountedRef = useRef(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async (force = false, isPullRefresh = false) => {
    const cleanFrom = (from || '').trim().toUpperCase();
    const cleanTo = (to || '').trim().toUpperCase();
    if (!cleanFrom || !cleanTo) return;

    if (isPullRefresh) {
      setIsRefreshing(true);
    } else if (!hasLoadedRef.current) {
      setStatus('loading');
    }

    try {
      // 1. Stale-while-revalidate: check cache first if not forced
      if (!force) {
        const cacheResult = await TrainData.searchTrains(cleanFrom, cleanTo, { force: false });
        if (!mountedRef.current) return;

        if (cacheResult.data && cacheResult.data.length > 0) {
          setData(cacheResult.data);
          setSource(cacheResult.source);
          setFetchedAt(cacheResult.fetchedAt);
          setAgeSeconds(cacheResult.ageSeconds);
          setProvider(cacheResult.provider);
          setStatus('ready');
          setError(undefined);
          hasLoadedRef.current = true;

          // If cache is still fresh, we don't need immediate background revalidation
          if (cacheResult.source === 'cache') {
            return;
          }
        }
      }

      // 2. Fetch live or background revalidate
      const liveResult = await TrainData.searchTrains(cleanFrom, cleanTo, { force });
      if (!mountedRef.current) return;

      if (liveResult.data && liveResult.data.length > 0) {
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
        setData(null);
        setSource('unavailable');
        setFetchedAt(null);
        setAgeSeconds(null);
        setStatus('error');
        setError(liveResult.error || { kind: 'not_found', message: 'No trains found' });
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (!hasLoadedRef.current) {
        setStatus('error');
        setSource('unavailable');
        setError({ kind: 'network', message: err?.message || 'Failed to search trains' });
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [from, to]);

  useEffect(() => {
    hasLoadedRef.current = false;
    loadData(false, false);
  }, [from, to, loadData]);

  const refresh = useCallback(async () => {
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
  };
}

