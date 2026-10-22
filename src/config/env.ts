// Configuration for API endpoints and proxy services
// API keys are read from environment variables or user input, NEVER hardcoded in the codebase.

import { SafeStorage } from '../context/PreferencesContext';

export interface ApiConfig {
  baseUrl: string;
  railRadarApiKey: string;
  rapidApiKey: string;
  pnrHost: string;
  liveTrainHost: string;
}

// In Expo, EXPO_PUBLIC_* variables are exposed to the client
const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const ENV_RAILRADAR_KEY = process.env.EXPO_PUBLIC_RAILRADAR_API_KEY || '';
const ENV_RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY || '';

export const API_CONFIG: ApiConfig = {
  baseUrl: ENV_BASE_URL,
  railRadarApiKey: ENV_RAILRADAR_KEY,
  rapidApiKey: ENV_RAPIDAPI_KEY,
  pnrHost: 'irctc-indian-railway-pnr-status.p.rapidapi.com',
  liveTrainHost: 'indian-railway-irctc.p.rapidapi.com',
};

export const STORAGE_KEYS = {
  RAILRADAR_API_KEY: '@railradar_api_key',
  RAPIDAPI_KEY: '@rapidapi_key',
  API_BASE_URL: '@api_base_url',
  USER_RECENT_SEARCHES: '@user_recent_searches',
  SAVED_TRAINS: '@saved_trains',
};

/**
 * Retrieves the currently active RailRadar API key (user-configured in settings or from env)
 */
export async function getActiveRailRadarKey(): Promise<string> {
  try {
    const saved = await SafeStorage.getItem(STORAGE_KEYS.RAILRADAR_API_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  } catch {
    // fallback to env
  }
  return API_CONFIG.railRadarApiKey;
}

/**
 * Saves a user-provided RailRadar API key to persistent storage
 */
export async function setActiveRailRadarKey(key: string): Promise<void> {
  const cleanKey = key.trim();
  API_CONFIG.railRadarApiKey = cleanKey;
  await SafeStorage.setItem(STORAGE_KEYS.RAILRADAR_API_KEY, cleanKey);
}

/**
 * Checks if a real external API key is active
 */
export function hasActiveApiKey(): boolean {
  return Boolean(API_CONFIG.railRadarApiKey || API_CONFIG.rapidApiKey || API_CONFIG.baseUrl);
}
