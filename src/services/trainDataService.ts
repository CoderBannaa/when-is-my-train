/**
 * TrainData Service - Honest Real-Time Data Layer
 * 
 * Provides real scraped data with honest freshness reporting and ZERO fabricated/simulated fallback data.
 * Wraps existing scrapers (eRail, RailYatri, local proxy, RailRadar official API) with:
 * - Stale-while-revalidate caching (Search: 15m fresh / 24h stale; Live: 60s fresh / 2h stale)
 * - In-flight promise de-duplication
 * - Per-provider 6s timeout + 12s overall budget
 * - One retry with 500ms backoff for network errors
 * - Circuit breaker (3 failures in 5 min -> skip for 5 min)
 * - Sanity validation (search: all fields present; live: >= 2 stations)
 */

import { Platform } from 'react-native';
import { SafeStorage } from '../context/PreferencesContext';
import { getActiveRailRadarKey, FORCE_PROVIDER_FAIL } from '../config/env';
import { LiveTrainApi, getLocalProxyBaseUrl, LiveTrainTrackingData } from './liveTrainApiService';
import { TrainBetweenStation } from '../data/trainsBetweenStations';
import { DataResult, DataSource, DataErrorKind } from './dataTypes';

// ==========================================
// CONSTANTS & TIMEOUTS
// ==========================================

const SEARCH_FRESH_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SEARCH_MAX_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours
const LIVE_FRESH_TTL_MS = 60 * 1000; // 60 seconds
const LIVE_MAX_STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

const PER_PROVIDER_TIMEOUT_MS = 6000;
const OVERALL_BUDGET_MS = 12000;
const RETRY_BACKOFF_MS = 500;

// ==========================================
// CIRCUIT BREAKER
// ==========================================

class CircuitBreaker {
  private failures: Map<string, number[]> = new Map();
  private openUntil: Map<string, number> = new Map();

  public isOpen(provider: string): boolean {
    const until = this.openUntil.get(provider);
    if (!until) return false;
    if (Date.now() < until) return true;
    this.openUntil.delete(provider);
    return false;
  }

  public recordFailure(provider: string): void {
    const now = Date.now();
    const list = (this.failures.get(provider) || []).filter(t => now - t < 5 * 60 * 1000);
    list.push(now);
    this.failures.set(provider, list);
    if (list.length >= 3) {
      this.openUntil.set(provider, now + 5 * 60 * 1000);
    }
  }

  public recordSuccess(provider: string): void {
    this.failures.delete(provider);
    this.openUntil.delete(provider);
  }

  public getCircuitStatus(provider: string): { isOpen: boolean; retryInSeconds?: number } {
    const until = this.openUntil.get(provider);
    if (until && Date.now() < until) {
      return { isOpen: true, retryInSeconds: Math.ceil((until - Date.now()) / 1000) };
    }
    return { isOpen: false };
  }
}

// ==========================================
// RATE LIMIT GUARD FOR RAILRADAR OFFICIAL API
// ==========================================

class RailRadarRateGuard {
  private remainingRequests: number = 100; // conservative default

  public updateRemaining(headers?: Headers): void {
    if (!headers) return;
    const remainingHeader = headers.get('x-ratelimit-remaining') || headers.get('x-rate-limit-remaining');
    if (remainingHeader) {
      const parsed = parseInt(remainingHeader, 10);
      if (!isNaN(parsed)) {
        this.remainingRequests = parsed;
      }
    }
  }

  public canUse(): boolean {
    // Stop if below 5 monthly requests left
    return this.remainingRequests >= 5;
  }
}

// ==========================================
// PROVIDER INTERFACES
// ==========================================

interface SearchProviderDef {
  name: 'erail' | 'proxy' | 'railradar-api' | string;
  canRun: () => boolean | Promise<boolean>;
  fetch: (from: string, to: string, signal: AbortSignal) => Promise<TrainBetweenStation[]>;
}

interface LiveProviderDef {
  name: 'railyatri' | 'proxy' | 'railradar-api' | string;
  canRun: () => boolean | Promise<boolean>;
  fetch: (trainNo: string, signal: AbortSignal) => Promise<LiveTrainTrackingData>;
}

interface StoredCacheEntry<T> {
  data: T;
  fetchedAt: number;
  provider: string;
}

// ==========================================
// MAIN TRAIN DATA SERVICE
// ==========================================

export class TrainDataService {
  private breaker = new CircuitBreaker();
  private rateGuard = new RailRadarRateGuard();

  // In-flight request de-duplication
  private inFlightSearch: Map<string, Promise<DataResult<TrainBetweenStation[]>>> = new Map();
  private inFlightLive: Map<string, Promise<DataResult<LiveTrainTrackingData>>> = new Map();

  // In-memory hot cache
  private memoryCache: Map<string, StoredCacheEntry<any>> = new Map();

  // --------------------------------------------------------
  // PROVIDER CHAINS
  // --------------------------------------------------------

  // Search providers in order:
  // 1. Native direct eRail
  // 2. Local proxy
  // 3. Web direct eRail
  // 4. RailRadar official API (if key configured & rate limit >= 5)
  private searchProviders: SearchProviderDef[] = [
    {
      name: 'erail',
      canRun: () => Platform.OS !== 'web',
      fetch: async (from, to, signal) => {
        // Direct mobile eRail fetch
        return await this.fetchWithTimeoutSignal(
          () => LiveTrainApi.fetchDirectErailTrains(from, to),
          signal
        );
      },
    },
    {
      name: 'proxy',
      canRun: () => true,
      fetch: async (from, to, signal) => {
        const baseUrl = getLocalProxyBaseUrl();
        const url = `${baseUrl}/api/trains-between-stations?from=${from}&to=${to}`;
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(`Proxy error status ${res.status}`);
        const json = await res.json();
        if (!json || !json.success || !Array.isArray(json.trains)) {
          throw new Error('Invalid JSON format from proxy');
        }
        return json.trains;
      },
    },
    {
      name: 'erail',
      canRun: () => Platform.OS === 'web',
      fetch: async (from, to, signal) => {
        return await this.fetchWithTimeoutSignal(
          () => LiveTrainApi.fetchDirectErailTrains(from, to),
          signal
        );
      },
    },
    {
      name: 'railradar-api',
      canRun: async () => {
        const key = await getActiveRailRadarKey();
        return Boolean(key && key.trim().length > 0 && this.rateGuard.canUse());
      },
      fetch: async (from, to, signal) => {
        const key = await getActiveRailRadarKey();
        if (!key) throw new Error('No RailRadar API key configured');
        const url = `https://api.railradar.in/v1/trains/between?from=${from}&to=${to}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
          signal,
        });
        this.rateGuard.updateRemaining(res.headers);
        if (!res.ok) throw new Error(`RailRadar API error status ${res.status}`);
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) return json.data;
        throw new Error('Invalid data from RailRadar API');
      },
    },
  ];

  // Live status providers in order:
  // 1. Direct RailYatri scrape (fetchDirectRailRadarLive reads RailYatri)
  // 2. Local proxy
  // 3. RailRadar official API (if key configured & rate limit >= 5)
  private liveProviders: LiveProviderDef[] = [
    {
      name: 'railyatri',
      canRun: () => Platform.OS !== 'web',
      fetch: async (trainNo, signal) => {
        return await this.fetchWithTimeoutSignal(
          () => LiveTrainApi.fetchDirectRailRadarLive(trainNo),
          signal
        );
      },
    },
    {
      name: 'proxy',
      canRun: () => true,
      fetch: async (trainNo, signal) => {
        const baseUrl = getLocalProxyBaseUrl();
        const url = `${baseUrl}/api/live-train/${trainNo}`;
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(`Proxy error status ${res.status}`);
        const json = await res.json();
        if (!json || (!json.success && !json.stations)) {
          throw new Error('Invalid live train response from proxy');
        }
        return json;
      },
    },
    {
      name: 'railyatri',
      canRun: () => Platform.OS === 'web',
      fetch: async (trainNo, signal) => {
        return await this.fetchWithTimeoutSignal(
          () => LiveTrainApi.fetchDirectRailRadarLive(trainNo),
          signal
        );
      },
    },
    {
      name: 'railradar-api',
      canRun: async () => {
        const key = await getActiveRailRadarKey();
        return Boolean(key && key.trim().length > 0 && this.rateGuard.canUse());
      },
      fetch: async (trainNo, signal) => {
        const key = await getActiveRailRadarKey();
        if (!key) throw new Error('No RailRadar API key configured');
        const url = `https://api.railradar.in/v1/trains/${trainNo}/live`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
          signal,
        });
        this.rateGuard.updateRemaining(res.headers);
        if (!res.ok) throw new Error(`RailRadar API status ${res.status}`);
        const json = await res.json();
        if (!json || (!json.success && !json.data)) throw new Error('Invalid RailRadar response');
        return LiveTrainApi.transformRailRadarApiResponse(trainNo, json);
      },
    },
  ];

  // Helper for methods that don't take external signals directly
  private async fetchWithTimeoutSignal<T>(fn: () => Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) {
      throw new Error('Aborted');
    }
    return new Promise<T>((resolve, reject) => {
      const abortHandler = () => reject(new Error('Aborted'));
      signal.addEventListener('abort', abortHandler);
      fn()
        .then(res => {
          signal.removeEventListener('abort', abortHandler);
          resolve(res);
        })
        .catch(err => {
          signal.removeEventListener('abort', abortHandler);
          reject(err);
        });
    });
  }

  // --------------------------------------------------------
  // SANITY VALIDATION
  // --------------------------------------------------------

  private validateSearchTrains(trains: any[]): TrainBetweenStation[] {
    if (!Array.isArray(trains)) {
      throw { kind: 'parse', message: 'Expected array of trains' };
    }
    for (const t of trains) {
      if (!t.number || !t.name || !t.depTime || !t.arrTime) {
        throw { kind: 'parse', message: `Invalid train format: missing required fields for ${t.number || 'unknown'}` };
      }
    }
    return trains as TrainBetweenStation[];
  }

  private validateLiveStatus(data: any): LiveTrainTrackingData {
    if (!data || !Array.isArray(data.stations) || data.stations.length < 2) {
      throw { kind: 'parse', message: 'Live tracking result must contain at least 2 stations' };
    }
    return data as LiveTrainTrackingData;
  }

  // --------------------------------------------------------
  // CACHE PERSISTENCE HELPERS
  // --------------------------------------------------------

  private async getCachedEntry<T>(key: string): Promise<StoredCacheEntry<T> | null> {
    // 1. Memory check
    const mem = this.memoryCache.get(key);
    if (mem) return mem as StoredCacheEntry<T>;

    // 2. Storage check
    try {
      const raw = await SafeStorage.getItem(`@td_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data && parsed.fetchedAt) {
          this.memoryCache.set(key, parsed);
          return parsed as StoredCacheEntry<T>;
        }
      }
    } catch {}
    return null;
  }

  private async setCachedEntry<T>(key: string, data: T, provider: string): Promise<void> {
    const entry: StoredCacheEntry<T> = {
      data,
      fetchedAt: Date.now(),
      provider,
    };
    this.memoryCache.set(key, entry);
    try {
      await SafeStorage.setItem(`@td_${key}`, JSON.stringify(entry));
    } catch {}
  }

  // --------------------------------------------------------
  // SEARCH TRAINS
  // --------------------------------------------------------

  public async searchTrains(
    from: string,
    to: string,
    opts?: { force?: boolean }
  ): Promise<DataResult<TrainBetweenStation[]>> {
    const normFrom = (from || '').trim().toUpperCase();
    const normTo = (to || '').trim().toUpperCase();
    const cacheKey = `search_${normFrom}_${normTo}`;

    // De-duplication check: if identical search is already in flight, reuse promise
    const existing = this.inFlightSearch.get(cacheKey);
    if (existing) {
      return existing;
    }

    const promise = this.executeSearch(normFrom, normTo, cacheKey, opts);
    this.inFlightSearch.set(cacheKey, promise);

    try {
      return await promise;
    } finally {
      this.inFlightSearch.delete(cacheKey);
    }
  }

  private async executeSearch(
    from: string,
    to: string,
    cacheKey: string,
    opts?: { force?: boolean }
  ): Promise<DataResult<TrainBetweenStation[]>> {
    const startTime = Date.now();

    // 1. Check cache (unless force is requested)
    if (!opts?.force) {
      const cached = await this.getCachedEntry<TrainBetweenStation[]>(cacheKey);
      if (cached) {
        const age = Date.now() - cached.fetchedAt;
        if (age < SEARCH_FRESH_TTL_MS) {
          this.logDev(cacheKey, cached.provider, Date.now() - startTime, 'cache');
          return {
            data: cached.data,
            source: 'cache',
            fetchedAt: cached.fetchedAt,
            ageSeconds: Math.round(age / 1000),
            provider: cached.provider,
          };
        }
      }
    }

    // Dev force fail flag check
    if (FORCE_PROVIDER_FAIL) {
      return await this.handleSearchFailure(
        cacheKey,
        { kind: 'network', message: 'Simulated failure via EXPO_PUBLIC_FORCE_PROVIDER_FAIL' },
        startTime
      );
    }

    // 2. Iterate provider chain within overall 12s budget
    let lastError: { kind: DataErrorKind; message: string } = {
      kind: 'not_found',
      message: 'No available providers found',
    };

    for (const provider of this.searchProviders) {
      // Check overall budget
      const elapsed = Date.now() - startTime;
      if (elapsed >= OVERALL_BUDGET_MS) {
        lastError = { kind: 'timeout', message: 'Overall 12s search budget exceeded' };
        break;
      }

      // Check circuit breaker
      if (this.breaker.isOpen(provider.name)) {
        continue;
      }

      // Check canRun
      try {
        const runnable = await provider.canRun();
        if (!runnable) continue;
      } catch {
        continue;
      }

      // Attempt fetch with per-provider timeout & 1 network retry
      const result = await this.runProviderWithRetry(
        provider.name,
        async (signal) => {
          const raw = await provider.fetch(from, to, signal);
          return this.validateSearchTrains(raw);
        },
        OVERALL_BUDGET_MS - elapsed
      );

      if (result.success && result.data) {
        this.breaker.recordSuccess(provider.name);
        await this.setCachedEntry(cacheKey, result.data, provider.name);
        this.logDev(cacheKey, provider.name, Date.now() - startTime, 'live');
        return {
          data: result.data,
          source: 'live',
          fetchedAt: Date.now(),
          ageSeconds: 0,
          provider: provider.name,
        };
      } else if (result.error) {
        this.breaker.recordFailure(provider.name);
        lastError = result.error;
      }
    }

    // 3. All providers failed -> Return stale or unavailable
    return await this.handleSearchFailure(cacheKey, lastError, startTime);
  }

  private async handleSearchFailure(
    cacheKey: string,
    error: { kind: DataErrorKind; message: string },
    startTime: number
  ): Promise<DataResult<TrainBetweenStation[]>> {
    const cached = await this.getCachedEntry<TrainBetweenStation[]>(cacheKey);
    if (cached) {
      const age = Date.now() - cached.fetchedAt;
      if (age < SEARCH_MAX_STALE_MS) {
        this.logDev(cacheKey, cached.provider, Date.now() - startTime, 'stale');
        return {
          data: cached.data,
          source: 'stale',
          fetchedAt: cached.fetchedAt,
          ageSeconds: Math.round(age / 1000),
          provider: cached.provider,
          error,
        };
      }
    }

    this.logDev(cacheKey, 'none', Date.now() - startTime, 'unavailable');
    return {
      data: null,
      source: 'unavailable',
      fetchedAt: null,
      ageSeconds: null,
      error,
    };
  }

  // --------------------------------------------------------
  // GET LIVE STATUS
  // --------------------------------------------------------

  public async getLiveStatus(
    trainNumber: string,
    opts?: { force?: boolean }
  ): Promise<DataResult<LiveTrainTrackingData>> {
    const cleanTrainNo = (trainNumber || '').trim().replace(/\D/g, '');
    const cacheKey = `live_${cleanTrainNo}`;

    // De-duplication check: if identical live request is in flight, reuse promise
    const existing = this.inFlightLive.get(cacheKey);
    if (existing) {
      return existing;
    }

    const promise = this.executeLiveStatus(cleanTrainNo, cacheKey, opts);
    this.inFlightLive.set(cacheKey, promise);

    try {
      return await promise;
    } finally {
      this.inFlightLive.delete(cacheKey);
    }
  }

  private async executeLiveStatus(
    cleanTrainNo: string,
    cacheKey: string,
    opts?: { force?: boolean }
  ): Promise<DataResult<LiveTrainTrackingData>> {
    const startTime = Date.now();

    // 1. Check cache (unless force is requested)
    if (!opts?.force) {
      const cached = await this.getCachedEntry<LiveTrainTrackingData>(cacheKey);
      if (cached) {
        const age = Date.now() - cached.fetchedAt;
        if (age < LIVE_FRESH_TTL_MS) {
          this.logDev(cacheKey, cached.provider, Date.now() - startTime, 'cache');
          return {
            data: cached.data,
            source: 'cache',
            fetchedAt: cached.fetchedAt,
            ageSeconds: Math.round(age / 1000),
            provider: cached.provider,
          };
        }
      }
    }

    // Dev force fail flag check
    if (FORCE_PROVIDER_FAIL) {
      return await this.handleLiveFailure(
        cacheKey,
        { kind: 'network', message: 'Simulated failure via EXPO_PUBLIC_FORCE_PROVIDER_FAIL' },
        startTime
      );
    }

    // 2. Iterate provider chain within overall 12s budget
    let lastError: { kind: DataErrorKind; message: string } = {
      kind: 'not_found',
      message: 'No available live providers found',
    };

    for (const provider of this.liveProviders) {
      // Check overall budget
      const elapsed = Date.now() - startTime;
      if (elapsed >= OVERALL_BUDGET_MS) {
        lastError = { kind: 'timeout', message: 'Overall 12s live status budget exceeded' };
        break;
      }

      // Check circuit breaker
      if (this.breaker.isOpen(provider.name)) {
        continue;
      }

      // Check canRun
      try {
        const runnable = await provider.canRun();
        if (!runnable) continue;
      } catch {
        continue;
      }

      // Attempt fetch with per-provider timeout & 1 network retry
      const result = await this.runProviderWithRetry(
        provider.name,
        async (signal) => {
          const raw = await provider.fetch(cleanTrainNo, signal);
          return this.validateLiveStatus(raw);
        },
        OVERALL_BUDGET_MS - elapsed
      );

      if (result.success && result.data) {
        this.breaker.recordSuccess(provider.name);
        await this.setCachedEntry(cacheKey, result.data, provider.name);
        this.logDev(cacheKey, provider.name, Date.now() - startTime, 'live');
        return {
          data: result.data,
          source: 'live',
          fetchedAt: Date.now(),
          ageSeconds: 0,
          provider: provider.name,
        };
      } else if (result.error) {
        this.breaker.recordFailure(provider.name);
        lastError = result.error;
      }
    }

    // 3. All providers failed -> Return stale or unavailable
    return await this.handleLiveFailure(cacheKey, lastError, startTime);
  }

  private async handleLiveFailure(
    cacheKey: string,
    error: { kind: DataErrorKind; message: string },
    startTime: number
  ): Promise<DataResult<LiveTrainTrackingData>> {
    const cached = await this.getCachedEntry<LiveTrainTrackingData>(cacheKey);
    if (cached) {
      const age = Date.now() - cached.fetchedAt;
      if (age < LIVE_MAX_STALE_MS) {
        this.logDev(cacheKey, cached.provider, Date.now() - startTime, 'stale');
        return {
          data: cached.data,
          source: 'stale',
          fetchedAt: cached.fetchedAt,
          ageSeconds: Math.round(age / 1000),
          provider: cached.provider,
          error,
        };
      }
    }

    this.logDev(cacheKey, 'none', Date.now() - startTime, 'unavailable');
    return {
      data: null,
      source: 'unavailable',
      fetchedAt: null,
      ageSeconds: null,
      error,
    };
  }

  // --------------------------------------------------------
  // PROVIDER RUNNER WITH 6S TIMEOUT & 1 NETWORK RETRY
  // --------------------------------------------------------

  private async runProviderWithRetry<T>(
    providerName: string,
    fn: (signal: AbortSignal) => Promise<T>,
    remainingBudgetMs: number
  ): Promise<{ success: boolean; data?: T; error?: { kind: DataErrorKind; message: string } }> {
    const timeoutMs = Math.min(PER_PROVIDER_TIMEOUT_MS, Math.max(1000, remainingBudgetMs));

    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const data = await fn(controller.signal);
        clearTimeout(timer);
        return { success: true, data };
      } catch (err: any) {
        clearTimeout(timer);

        // Sanity parse error (do NOT retry)
        if (err && err.kind === 'parse') {
          return {
            success: false,
            error: { kind: 'parse', message: err.message || 'Data parse error' },
          };
        }

        const isAbort = controller.signal.aborted || err?.name === 'AbortError';
        const isNetwork =
          isAbort ||
          err?.message?.toLowerCase().includes('network') ||
          err?.message?.toLowerCase().includes('fetch failed') ||
          err?.message?.toLowerCase().includes('timeout');

        // Blocked / 403 / 429
        if (err?.message?.includes('403') || err?.message?.includes('blocked')) {
          return {
            success: false,
            error: { kind: 'blocked', message: `Provider ${providerName} blocked access` },
          };
        }

        // Only retry on network/timeout error, exactly once with 500ms backoff
        if (attempt === 0 && isNetwork && remainingBudgetMs > timeoutMs + RETRY_BACKOFF_MS) {
          await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
          continue;
        }

        const kind: DataErrorKind = isAbort ? 'timeout' : isNetwork ? 'network' : 'parse';
        return {
          success: false,
          error: {
            kind,
            message: err?.message || `Provider ${providerName} failed`,
          },
        };
      }
    }

    return {
      success: false,
      error: { kind: 'network', message: `Provider ${providerName} failed after retry` },
    };
  }

  // --------------------------------------------------------
  // DEV STRUCTURED LOGGING
  // --------------------------------------------------------

  private logDev(key: string, provider: string, ms: number, source: DataSource): void {
    if (__DEV__) {
      console.info(`[TrainData] ${key} | provider: ${provider} | ${ms}ms | source: ${source}`);
    }
  }
}

// Export singleton
export const TrainData = new TrainDataService();

