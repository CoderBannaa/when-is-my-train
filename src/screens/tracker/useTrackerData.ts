/**
 * useTrackerData.ts
 * Real-time custom hook connecting Live Tracker to honest TrainData service via useLiveStatus.
 */

import { useMemo } from 'react';
import { useLiveStatus } from '../../hooks/useLiveStatus';
import { buildTrackerViewModel, TrackerViewModel } from './buildTrackerViewModel';

export interface UseTrackerDataResult {
  vm: TrackerViewModel;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  isUpdatingBackground: boolean;
}

export function useTrackerData(trainNumber: string): UseTrackerDataResult {
  const {
    data,
    status,
    source,
    ageSeconds,
    provider,
    error,
    refresh,
    isRefreshing,
    isUpdatingBackground,
  } = useLiveStatus(trainNumber);

  const vm = useMemo(() => {
    return buildTrackerViewModel(data, status, source, provider, ageSeconds, error);
  }, [data, status, source, provider, ageSeconds, error]);

  return {
    vm,
    refresh,
    isRefreshing,
    isUpdatingBackground,
  };
}

