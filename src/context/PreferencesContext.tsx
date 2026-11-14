import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { Platform, useColorScheme, StatusBar } from 'react-native';
import { Colors } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/env';

// Universal Safe Storage (persists on native via AsyncStorage and web via localStorage)
const memoryStore: Record<string, string> = {};
export const SafeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
      return memoryStore[key] || null;
    } catch {
      return memoryStore[key] || null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore[key] = value;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      // memory fallback maintained
    }
  },
  removeItem: async (key: string): Promise<void> => {
    delete memoryStore[key];
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {}
  },
  getAllKeys: async (): Promise<string[]> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return Object.keys(window.localStorage);
      }
      const keys = await AsyncStorage.getAllKeys();
      return keys ? [...keys] : [];
    } catch {
      return Object.keys(memoryStore);
    }
  },
  multiRemove: async (keys: string[]): Promise<void> => {
    keys.forEach((k) => delete memoryStore[k]);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        keys.forEach((k) => window.localStorage.removeItem(k));
        return;
      }
      await AsyncStorage.multiRemove(keys);
    } catch {}
  },
};

export const translations = {
  en: {
    // Brand & Header
    appName: 'When is my train',
    tagline: 'IRCTC & Live GPS Tracking',
    gpsReady: 'GPS READY',
    tapToBack: 'TAP TO GO BACK',

    // Nav Tabs
    tabHome: 'Trains',
    tabLive: 'Live Status',
    tabPnr: 'PNR Status',
    tabSchedule: 'Timetable',

    // Home Screen
    fromStation: 'From Station',
    toStation: 'To Station',
    findTrains: 'FIND TRAINS',
    travelDate: 'Travel Date',
    today: 'Today',
    tomorrow: 'Tomorrow',
    swapStations: 'Swap Stations',
    recentSearches: 'Recent Searches',
    popularRoutes: 'Popular Routes',
    quickFeatures: 'Travel Features',
    spotYourTrain: 'Spot Your Train',
    trainNameOrNo: 'Train name / no.',

    // Search Results Screen
    searchResults: 'Search results',
    trainsFound: 'Trains found',
    notRunningToday: 'Not running today',
    notRunningOn: 'Not running on',
    next: 'Next',
    runsDaily: 'Runs Daily',
    fastest: 'FASTEST',
    allDates: 'All Dates',
    sortDeparture: 'Sort: Departure',
    sortFastestLabel: 'Sort: Fastest',
    sortLatest: 'Sort: Latest',
    timeOfDay: 'Time of Day',
    morning: 'Morning (5-12)',
    afternoon: 'Afternoon (12-17)',
    evening: 'Evening (17-21)',
    night: 'Night (21-5)',
    runningOnThisDate: 'Running on this date',
    clearAll: 'Clear All',
    clearFilters: 'Clear Filters',
    noTrainsFound: 'No trains match your filters',
    tryAnotherDate: 'Try selecting another date or check nearby stations',
    offlineEstimatedBanner: 'Showing estimated offline timetable. Times may vary.',
    liveSchedule: 'Live Schedule',
    trainType: 'Train Type',
    allTrainTypes: 'All Types',
    departedAt: 'Departed',
    onTime: 'On Time',
    delayedBy: 'Late',
    stops: 'stops',
    nonStop: 'Non-stop',
    sortFastest: 'Fastest',
    sortEarlyDep: 'Early Departure',
    sortLateDep: 'Late Departure',
    allClasses: 'All Classes',
    filters: 'Filters',

    // Live Tracking
    journeyTab: 'Journey Timeline',
    liveMapTab: 'Live Map',
    coachTab: 'Coach Position',
    infoTab: 'Train Info',
    journey: 'Journey',
    live_map: 'Live Map',
    coach_position: 'Coach Position',
    info: 'Info',
    speed: 'Speed',
    distanceLeft: 'Distance left',
    expectedArrival: 'Expected Arrival',
    refreshStatus: 'Refresh Status',
    currentLocation: 'Current Location',
    nextStation: 'Next Station',
    departed: 'Departed',
    arrived: 'Arrived',
    expected: 'Expected',
    currentStation: 'Current Station',
    alarm: 'Alarm',
    coach: 'Coach',
    share: 'Share',
    retry: 'Retry',
    on_time: 'On time',
    min_late: 'min late',

    // Coach Position
    engineSide: 'Engine Side',
    lastCoach: 'Last Coach',
    yourCoach: 'Your Coach',
    platformSide: 'Platform',

    // PNR Screen
    pnrTitle: 'Check PNR Status',
    pnrPlaceholder: 'Enter 10-digit PNR number',
    checkPnrBtn: 'CHECK PNR STATUS',
    chartPrepared: 'Chart Prepared',
    chartNotPrepared: 'Chart Not Prepared',
    cnf: 'CONFIRMED',
    rac: 'RAC',
    wl: 'WAITING LIST',

    // Language & Mode Modal
    welcomeTitle: 'Welcome to When is my train',
    welcomeSubtitle: 'Choose your preferred language and theme',
    selectLanguage: 'Select Language / भाषा चुनें',
    selectTheme: 'Theme Mode / थीम मोड',
    dayMode: 'Day Mode (Light)',
    nightMode: 'Night Mode (Dark)',
    continueBtn: 'CONTINUE / आगे बढ़ें',
    changeLang: 'Language',
    changeTheme: 'Theme',

    // Settings Drawer
    settingsTitle: 'Settings',
    appearance: 'Appearance',
    liveData: 'Live Data & API',
    alarms: 'Station Alarms',
    storage: 'Storage & Cache',
    helpSafety: 'Help & Safety',
    about: 'About & Community',
    timeFormat: 'Time Format',
    systemTheme: 'System Default',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    clearCache: 'Clear cached train data',
    clearHistory: 'Clear recent searches & trains',
    clearSaved: 'Clear saved trains',
    railwayHelpline: 'Railway Helplines (139)',
    reportIssue: 'Report a problem / suggest a feature',
    starGithub: 'Star the project on GitHub',
    shareApp: 'Share App',
  },
  hi: {
    // Brand & Header
    appName: 'व्हेन इज माय ट्रेन',
    tagline: 'आईआरसीटीसी व लाइव जीपीएस ट्रैकिंग',
    gpsReady: 'जीपीएस तैयार',
    tapToBack: 'वापस जाएं',

    // Nav Tabs
    tabHome: 'ट्रेनें',
    tabLive: 'लाइव स्थिति',
    tabPnr: 'पीएनआर स्थिति',
    tabSchedule: 'समय सारणी',

    // Home Screen
    fromStation: 'कहाँ से (प्रस्थान स्टेशन)',
    toStation: 'कहाँ तक (गंतव्य स्टेशन)',
    findTrains: 'ट्रेनें खोजें',
    travelDate: 'यात्रा तिथि',
    today: 'आज',
    tomorrow: 'कल',
    swapStations: 'स्टेशन बदलें',
    recentSearches: 'हाल की खोजें',
    popularRoutes: 'लोकप्रिय मार्ग',
    quickFeatures: 'यात्रा सुविधाएं',
    spotYourTrain: 'स्पॉट ट्रेन (लाइव)',
    trainNameOrNo: 'ट्रेन नाम / नंबर',

    // Search Results Screen
    searchResults: 'सर्च परिणाम',
    trainsFound: 'ट्रेनें उपलब्ध हैं',
    notRunningToday: 'आज नहीं चल रही है',
    notRunningOn: 'इस दिन नहीं चलती',
    next: 'अगली',
    runsDaily: 'रोजाना चलती है',
    fastest: 'सबसे तेज़',
    allDates: 'सभी तिथियां',
    sortDeparture: 'क्रम: प्रस्थान',
    sortFastestLabel: 'क्रम: सबसे तेज़',
    sortLatest: 'क्रम: नवीनतम',
    timeOfDay: 'समय',
    morning: 'सुबह (5-12)',
    afternoon: 'दोपहर (12-17)',
    evening: 'शाम (17-21)',
    night: 'रात (21-5)',
    runningOnThisDate: 'इस तिथि पर चलने वाली',
    clearAll: 'सभी हटाएं',
    clearFilters: 'फ़िल्टर हटाएं',
    noTrainsFound: 'फ़िल्टर के अनुसार कोई ट्रेन नहीं मिली',
    tryAnotherDate: 'कृपया कोई अन्य तिथि चुनें या नजदीकी स्टेशन देखें',
    offlineEstimatedBanner: 'अनुमानित ऑफ़लाइन समय सारणी दिखाई जा रही है। समय में अंतर हो सकता है।',
    liveSchedule: 'लाइव समय सारणी',
    trainType: 'ट्रेन का प्रकार',
    allTrainTypes: 'सभी प्रकार',
    departedAt: 'निकल चुकी',
    onTime: 'समय पर',
    delayedBy: 'देरी',
    stops: 'स्टॉप',
    nonStop: 'नॉन-स्टॉप',
    sortFastest: 'सबसे तेज',
    sortEarlyDep: 'जल्दी प्रस्थान',
    sortLateDep: 'देर से प्रस्थान',
    allClasses: 'सभी क्लास',
    filters: 'फ़िल्टर',

    // Live Tracking
    journeyTab: 'यात्रा टाइमलाइन',
    liveMapTab: 'लाइव रूट मैप',
    coachTab: 'कोच स्थिति',
    infoTab: 'ट्रेन जानकारी',
    journey: 'यात्रा',
    live_map: 'लाइव मैप',
    coach_position: 'कोच स्थिति',
    info: 'जानकारी',
    speed: 'गति',
    distanceLeft: 'शेष दूरी',
    expectedArrival: 'संभावित आगमन',
    refreshStatus: 'स्थिति रीफ्रेश करें',
    currentLocation: 'वर्तमान स्थान',
    nextStation: 'अगला स्टेशन',
    departed: 'रवाना',
    arrived: 'पहुंची',
    expected: 'संभावित',
    currentStation: 'वर्तमान स्टेशन',
    alarm: 'अलार्म',
    coach: 'कोच',
    share: 'शेयर',
    retry: 'पुनः प्रयास करें',
    on_time: 'समय पर',
    min_late: 'मिनट देरी',

    // Coach Position
    engineSide: 'इंजन की तरफ',
    lastCoach: 'आखिरी कोच',
    yourCoach: 'आपका कोच',
    platformSide: 'प्लेटफॉर्म',

    // PNR Screen
    pnrTitle: 'पीएनआर स्थिति जांचें',
    pnrPlaceholder: '10 अंकों का पीएनआर नंबर दर्ज करें',
    checkPnrBtn: 'पीएनआर स्थिति देखें',
    chartPrepared: 'चार्ट तैयार है',
    chartNotPrepared: 'चार्ट तैयार नहीं है',
    cnf: 'कन्फ़र्म (Confirmed)',
    rac: 'आरएसी (RAC)',
    wl: 'वेटिंग लिस्ट (WL)',

    // Language & Mode Modal
    welcomeTitle: 'व्हेन इज माय ट्रेन में आपका स्वागत है',
    welcomeSubtitle: 'अपनी पसंदीदा भाषा और थीम मोड चुनें',
    selectLanguage: 'भाषा चुनें / Select Language',
    selectTheme: 'थीम मोड / Theme Mode',
    dayMode: 'डे मोड (लाइट)',
    nightMode: 'नाईट मोड (डार्क)',
    continueBtn: 'आगे बढ़ें / CONTINUE',
    changeLang: 'भाषा',
    changeTheme: 'थीम',

    // Settings Drawer
    settingsTitle: 'सेटिंग्स',
    appearance: 'दिखावट',
    liveData: 'लाइव डेटा और एपीआई',
    alarms: 'स्टेशन अलार्म',
    storage: 'स्टोरेज और कैशे',
    helpSafety: 'मदद और सुरक्षा',
    about: 'के बारे में',
    timeFormat: 'समय प्रारूप',
    systemTheme: 'सिस्टम डिफ़ॉल्ट',
    lightTheme: 'लाइट',
    darkTheme: 'डार्क',
    clearCache: 'कैश डेटा साफ़ करें',
    clearHistory: 'हाल की खोजें साफ़ करें',
    clearSaved: 'सेव की गई ट्रेनें हटाएं',
    railwayHelpline: 'रेलवे हेल्पलाइन (139)',
    reportIssue: 'समस्या की रिपोर्ट करें / सुझाव दें',
    starGithub: 'GitHub पर स्टार दें',
    shareApp: 'ऐप शेयर करें',
  },
};

/**
 * Derived from translations object keys.
 * To add a new language: add a new dictionary object to translations above
 * and add its display label here.
 */
export type Language = keyof typeof translations;

export const SUPPORTED_LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = (
  Object.keys(translations) as Language[]
).map((code) => {
  if (code === 'hi') {
    return { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' };
  }
  return { code: 'en', label: 'English', nativeLabel: 'English' };
});

export type ThemeChoice = 'light' | 'dark' | 'system';
export type TimeFormat = 'auto' | '12h' | '24h';
export type AlarmTiming = '10m' | '15m' | '30m' | '5km' | '10km';

// Deprecated stubs for backwards-compatibility
export type SpeedUnit = 'kmh' | 'mph';
export type DefaultTrackingSource = 'cell' | 'gps' | 'internet';
export type AlarmRingtone = 'horn' | 'whistle' | 'chime' | 'bell';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  searchBtnGreen: string;
  searchBtnGreenDark: string;
  searchBtnGreenLight: string;
  background: string;
  surface: string;
  card: string;
  cardSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textWhite: string;
  textBlue: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  accentLight: string;
  danger: string;
  dangerLight: string;
  border: string;
  borderLight: string;
  borderBlue: string;
  activeTab: string;
  inactiveTab: string;
  isDark: boolean;
}

const lightThemeColors: ThemeColors = {
  ...Colors,
  isDark: false,
};

const darkThemeColors: ThemeColors = {
  ...Colors,
  primary: '#0284C7',
  primaryDark: '#0369A1',
  primaryLight: '#38BDF8',
  primarySoft: 'rgba(2, 132, 199, 0.2)',
  background: '#0B1120', // Deep OLED Navy
  surface: '#1E293B', // Dark Slate Surface
  card: '#1E293B', // Dark Card
  cardSecondary: '#0F172A', // Secondary Dark Card
  textPrimary: '#F8FAFC', // Bright Off-White Text
  textSecondary: '#94A3B8', // Light Slate
  textMuted: '#64748B', // Muted Slate
  border: '#334155', // Dark Border
  borderLight: '#1E293B', // Subtle Dark Divider
  borderBlue: '#0284C7',
  isDark: true,
};

export interface AppPreferencesV2 {
  schemaVersion: number;
  language: Language;
  themeChoice: ThemeChoice;
  timeFormat: TimeFormat;
  defaultAlarmTiming: AlarmTiming;
  railRadarApiKey?: string;
}

const PREFS_V2_KEY = '@prefs_v2';
const DEFAULT_PREFS: AppPreferencesV2 = {
  schemaVersion: 2,
  language: 'en',
  themeChoice: 'system',
  timeFormat: 'auto',
  defaultAlarmTiming: '15m',
};

function safeParsePrefs(raw: string | null): AppPreferencesV2 {
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        schemaVersion: parsed.schemaVersion || 2,
        language: parsed.language in translations ? parsed.language : 'en',
        themeChoice: ['light', 'dark', 'system'].includes(parsed.themeChoice) ? parsed.themeChoice : 'system',
        timeFormat: ['auto', '12h', '24h'].includes(parsed.timeFormat) ? parsed.timeFormat : 'auto',
        defaultAlarmTiming: ['10m', '15m', '30m', '5km', '10km'].includes(parsed.defaultAlarmTiming)
          ? parsed.defaultAlarmTiming
          : '15m',
        railRadarApiKey: parsed.railRadarApiKey || undefined,
      };
    }
  } catch {}
  return DEFAULT_PREFS;
}

interface PreferencesContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  themeChoice: ThemeChoice;
  setThemeChoice: (choice: ThemeChoice) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  timeFormat: TimeFormat;
  setTimeFormat: (fmt: TimeFormat) => void;
  defaultAlarmTiming: AlarmTiming;
  setDefaultAlarmTiming: (timing: AlarmTiming) => void;
  railRadarApiKey: string;
  setRailRadarApiKey: (key: string) => Promise<void>;
  historyVersion: number;
  incrementHistoryVersion: () => void;
  colors: ThemeColors;
  t: (key: keyof typeof translations.en) => string;
  showWelcomeModal: boolean;
  setShowWelcomeModal: (show: boolean) => void;

  // Backward compatible stubs
  speedUnit: SpeedUnit;
  setSpeedUnit: (unit: SpeedUnit) => void;
  trackingSource: DefaultTrackingSource;
  setTrackingSource: (source: DefaultTrackingSource) => void;
  alarmSound: AlarmRingtone;
  setAlarmSound: (sound: AlarmRingtone) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Render immediate defaults without blocking splash
  const [language, setLanguageState] = useState<Language>(DEFAULT_PREFS.language);
  const [themeChoice, setThemeChoiceState] = useState<ThemeChoice>(DEFAULT_PREFS.themeChoice);
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(DEFAULT_PREFS.timeFormat);
  const [defaultAlarmTiming, setDefaultAlarmTimingState] = useState<AlarmTiming>(DEFAULT_PREFS.defaultAlarmTiming);
  const [railRadarApiKey, setRailRadarApiKeyState] = useState<string>('');
  const [historyVersion, setHistoryVersion] = useState<number>(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);

  // System color scheme hook
  const systemScheme = useColorScheme();

  // Load and migrate on mount
  useEffect(() => {
    (async () => {
      try {
        const v2Raw = await SafeStorage.getItem(PREFS_V2_KEY);
        if (v2Raw) {
          const prefs = safeParsePrefs(v2Raw);
          setLanguageState(prefs.language);
          setThemeChoiceState(prefs.themeChoice);
          setTimeFormatState(prefs.timeFormat);
          setDefaultAlarmTimingState(prefs.defaultAlarmTiming);
          if (prefs.railRadarApiKey) setRailRadarApiKeyState(prefs.railRadarApiKey);
          return;
        }

        // Migration from legacy keys
        const legacyLang = await SafeStorage.getItem('@train_app_lang');
        const legacyTheme = await SafeStorage.getItem('@train_app_theme');
        const legacyTimeFmt = await SafeStorage.getItem('@pref_time_format');
        const legacyApiKey = await SafeStorage.getItem(STORAGE_KEYS.RAILRADAR_API_KEY);

        const migrated: AppPreferencesV2 = {
          schemaVersion: 2,
          language: legacyLang && legacyLang in translations ? (legacyLang as Language) : 'en',
          themeChoice: legacyTheme === 'dark' || legacyTheme === 'light' ? legacyTheme : 'system',
          timeFormat: legacyTimeFmt === '12h' || legacyTimeFmt === '24h' ? legacyTimeFmt : 'auto',
          defaultAlarmTiming: '15m',
          railRadarApiKey: legacyApiKey || undefined,
        };

        setLanguageState(migrated.language);
        setThemeChoiceState(migrated.themeChoice);
        setTimeFormatState(migrated.timeFormat);
        setDefaultAlarmTimingState(migrated.defaultAlarmTiming);
        if (migrated.railRadarApiKey) setRailRadarApiKeyState(migrated.railRadarApiKey);

        // Save v2
        await SafeStorage.setItem(PREFS_V2_KEY, JSON.stringify(migrated));
      } catch {}
    })();
  }, []);

  const savePreferences = useCallback(async (updates: Partial<AppPreferencesV2>) => {
    try {
      const v2Raw = await SafeStorage.getItem(PREFS_V2_KEY);
      const current = safeParsePrefs(v2Raw);
      const next: AppPreferencesV2 = { ...current, ...updates };
      await SafeStorage.setItem(PREFS_V2_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    savePreferences({ language: lang });
  }, [savePreferences]);

  const setThemeChoice = useCallback((choice: ThemeChoice) => {
    setThemeChoiceState(choice);
    savePreferences({ themeChoice: choice });
  }, [savePreferences]);

  const setThemeMode = useCallback((mode: 'light' | 'dark') => {
    setThemeChoice(mode);
  }, [setThemeChoice]);

  const setTimeFormat = useCallback((fmt: TimeFormat) => {
    setTimeFormatState(fmt);
    savePreferences({ timeFormat: fmt });
  }, [savePreferences]);

  const setDefaultAlarmTiming = useCallback((timing: AlarmTiming) => {
    setDefaultAlarmTimingState(timing);
    savePreferences({ defaultAlarmTiming: timing });
  }, [savePreferences]);

  const setRailRadarApiKey = useCallback(async (key: string) => {
    const trimmed = (key || '').trim();
    setRailRadarApiKeyState(trimmed);
    await savePreferences({ railRadarApiKey: trimmed });
    if (trimmed) {
      await SafeStorage.setItem(STORAGE_KEYS.RAILRADAR_API_KEY, trimmed);
    } else {
      await SafeStorage.removeItem(STORAGE_KEYS.RAILRADAR_API_KEY);
    }
  }, [savePreferences]);

  const incrementHistoryVersion = useCallback(() => {
    setHistoryVersion((v) => v + 1);
  }, []);

  // Derived isDarkMode from themeChoice + systemScheme
  const isDarkMode = useMemo(() => {
    if (themeChoice === 'system') {
      return systemScheme === 'dark';
    }
    return themeChoice === 'dark';
  }, [themeChoice, systemScheme]);

  const toggleTheme = useCallback(() => {
    const next = isDarkMode ? 'light' : 'dark';
    setThemeChoice(next);
  }, [isDarkMode, setThemeChoice]);

  const colors = useMemo(() => {
    return isDarkMode ? darkThemeColors : lightThemeColors;
  }, [isDarkMode]);

  // Derived typed t function with English fallback and zero casts
  const t = useCallback((key: keyof typeof translations.en): string => {
    const dict = translations[language] || translations.en;
    return dict[key] || translations.en[key] || String(key);
  }, [language]);

  // Deprecated stubs
  const speedUnit: SpeedUnit = 'kmh';
  const setSpeedUnit = useCallback(() => {}, []);
  const trackingSource: DefaultTrackingSource = 'cell';
  const setTrackingSource = useCallback(() => {}, []);
  const alarmSound: AlarmRingtone = 'horn';
  const setAlarmSound = useCallback(() => {}, []);

  const contextValue = useMemo<PreferencesContextType>(() => ({
    language,
    setLanguage,
    themeChoice,
    setThemeChoice,
    isDarkMode,
    toggleTheme,
    setThemeMode,
    timeFormat,
    setTimeFormat,
    defaultAlarmTiming,
    setDefaultAlarmTiming,
    railRadarApiKey,
    setRailRadarApiKey,
    historyVersion,
    incrementHistoryVersion,
    colors,
    t,
    showWelcomeModal,
    setShowWelcomeModal,
    speedUnit,
    setSpeedUnit,
    trackingSource,
    setTrackingSource,
    alarmSound,
    setAlarmSound,
  }), [
    language,
    setLanguage,
    themeChoice,
    setThemeChoice,
    isDarkMode,
    toggleTheme,
    setThemeMode,
    timeFormat,
    setTimeFormat,
    defaultAlarmTiming,
    setDefaultAlarmTiming,
    railRadarApiKey,
    setRailRadarApiKey,
    historyVersion,
    incrementHistoryVersion,
    colors,
    t,
    showWelcomeModal,
    speedUnit,
    setSpeedUnit,
    trackingSource,
    setTrackingSource,
    alarmSound,
    setAlarmSound,
  ]);

  return (
    <PreferencesContext.Provider value={contextValue}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
