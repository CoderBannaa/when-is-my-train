export type DataSource = 'live' | 'cache' | 'stale' | 'unavailable';

export type DataErrorKind = 'network' | 'timeout' | 'parse' | 'blocked' | 'not_found';

export interface DataResult<T> {
  data: T | null;
  source: DataSource;
  fetchedAt: number | null;
  ageSeconds: number | null;
  provider?: 'erail' | 'railyatri' | 'proxy' | 'railradar-api' | string;
  error?: {
    kind: DataErrorKind;
    message: string;
  };
}

