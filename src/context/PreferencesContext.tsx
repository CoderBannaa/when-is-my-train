import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Colors } from '../theme/colors';

import AsyncStorage from '@react-native-async-storage/async-storage';

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
    } catch {
      // fallback
    }
  },
};

export type Language = 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te' | 'gu';
export type ThemeMode = 'light' | 'dark';
export type SpeedUnit = 'kmh' | 'mph';
export type TimeFormat = '12h' | '24h';
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
  background: '#0B1120',      // Deep OLED Navy
  surface: '#1E293B',         // Dark Slate Surface
  card: '#1E293B',            // Dark Card
  cardSecondary: '#0F172A',   // Secondary Dark Card
  textPrimary: '#F8FAFC',     // Bright Off-White Text
  textSecondary: '#94A3B8',   // Light Slate
  textMuted: '#64748B',       // Muted Slate
  border: '#334155',          // Dark Border
  borderLight: '#1E293B',     // Subtle Dark Divider
  borderBlue: '#0284C7',
  isDark: true,
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
    clearAll: 'Clear all',
    clearFilters: 'Clear filters',
    noTrainsFound: 'No trains found matching filters',
    tryAnotherDate: 'Try selecting another date or check nearby stations',
    offlineEstimatedBanner: 'Showing estimated schedule (offline). Timings may not be accurate.',
    liveSchedule: 'Live schedule',
    trainType: 'Train Type',
    allTrainTypes: 'All Types',
    departedAt: 'Left',
    onTime: 'On time',
    delayedBy: 'Late',
    stops: 'Stops',
    nonStop: 'Non-stop',
    sortFastest: 'Fastest',
    sortEarlyDep: 'Early Dep.',
    sortLateDep: 'Late Dep.',
    allClasses: 'All Classes',
    filters: 'Filters',

    // Live Tracking
    journeyTab: 'Journey',
    liveMapTab: 'Live Map',
    coachTab: 'Coach Position',
    infoTab: 'Info',
    speed: 'Speed',
    distanceLeft: 'Distance Left',
    expectedArrival: 'Expected Arrival',
    refreshStatus: 'REFRESH STATUS',
    currentLocation: 'Current Location',
    nextStation: 'Next Station',
    departed: 'Departed',
    arrived: 'Arrived',
    expected: 'Expected',
    currentStation: 'Current Station',

    // Coach Position
    engineSide: 'Engine Side',
    lastCoach: 'Last Coach',
    yourCoach: 'Your Coach',
    platformSide: 'Platform',

    // PNR Screen
    pnrTitle: 'Check PNR Status',
    pnrPlaceholder: 'Enter 10-digit PNR Number',
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
  },
};

interface PreferencesContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  speedUnit: SpeedUnit;
  setSpeedUnit: (unit: SpeedUnit) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (fmt: TimeFormat) => void;
  trackingSource: DefaultTrackingSource;
  setTrackingSource: (source: DefaultTrackingSource) => void;
  alarmSound: AlarmRingtone;
  setAlarmSound: (sound: AlarmRingtone) => void;
  colors: ThemeColors;
  t: (key: keyof typeof translations.en) => string;
  showWelcomeModal: boolean;
  setShowWelcomeModal: (show: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const PREF_LANG_KEY = '@train_app_lang';
const PREF_THEME_KEY = '@train_app_theme';
const PREF_FIRST_LAUNCH_KEY = '@train_app_first_launch';
const PREF_SPEED_KEY = '@pref_speed_unit';
const PREF_TIME_FMT_KEY = '@pref_time_format';
const PREF_TRACK_SRC_KEY = '@pref_tracking_source';
const PREF_ALARM_SND_KEY = '@pref_alarm_sound';

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
  const [speedUnit, setSpeedUnitState] = useState<SpeedUnit>('kmh');
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>('24h');
  const [trackingSource, setTrackingSourceState] = useState<DefaultTrackingSource>('cell');
  const [alarmSound, setAlarmSoundState] = useState<AlarmRingtone>('horn');

  // Load saved preferences on startup
  useEffect(() => {
    (async () => {
      try {
        const savedLang = await SafeStorage.getItem(PREF_LANG_KEY);
        const savedTheme = await SafeStorage.getItem(PREF_THEME_KEY);
        const hasLaunched = await SafeStorage.getItem(PREF_FIRST_LAUNCH_KEY);
        const savedSpeed = await SafeStorage.getItem(PREF_SPEED_KEY);
        const savedTimeFmt = await SafeStorage.getItem(PREF_TIME_FMT_KEY);
        const savedTrackSrc = await SafeStorage.getItem(PREF_TRACK_SRC_KEY);
        const savedAlarmSnd = await SafeStorage.getItem(PREF_ALARM_SND_KEY);

        if (savedLang) {
          setLanguageState(savedLang as Language);
        }
        if (savedTheme === 'dark') {
          setIsDarkMode(true);
        }
        if (savedSpeed === 'kmh' || savedSpeed === 'mph') {
          setSpeedUnitState(savedSpeed);
        }
        if (savedTimeFmt === '12h' || savedTimeFmt === '24h') {
          setTimeFormatState(savedTimeFmt);
        }
        if (savedTrackSrc === 'cell' || savedTrackSrc === 'gps' || savedTrackSrc === 'internet') {
          setTrackingSourceState(savedTrackSrc);
        }
        if (savedAlarmSnd === 'horn' || savedAlarmSnd === 'whistle' || savedAlarmSnd === 'chime' || savedAlarmSnd === 'bell') {
          setAlarmSoundState(savedAlarmSnd);
        }
        // Ensure first launch is flagged without blocking screen with popup
        if (!hasLaunched) {
          await SafeStorage.setItem(PREF_FIRST_LAUNCH_KEY, 'true');
        }
      } catch {
        // Fallback default
      }
    })();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    SafeStorage.setItem(PREF_LANG_KEY, lang).catch(() => {});
  };

  const setThemeMode = (mode: ThemeMode) => {
    const dark = mode === 'dark';
    setIsDarkMode(dark);
    SafeStorage.setItem(PREF_THEME_KEY, mode).catch(() => {});
  };

  const setSpeedUnit = (unit: SpeedUnit) => {
    setSpeedUnitState(unit);
    SafeStorage.setItem(PREF_SPEED_KEY, unit).catch(() => {});
  };

  const setTimeFormat = (fmt: TimeFormat) => {
    setTimeFormatState(fmt);
    SafeStorage.setItem(PREF_TIME_FMT_KEY, fmt).catch(() => {});
  };

  const setTrackingSource = (source: DefaultTrackingSource) => {
    setTrackingSourceState(source);
    SafeStorage.setItem(PREF_TRACK_SRC_KEY, source).catch(() => {});
  };

  const setAlarmSound = (sound: AlarmRingtone) => {
    setAlarmSoundState(sound);
    SafeStorage.setItem(PREF_ALARM_SND_KEY, sound).catch(() => {});
  };

  const toggleTheme = () => {
    setThemeMode(isDarkMode ? 'light' : 'dark');
  };

  const dismissWelcomeModal = (show: boolean) => {
    setShowWelcomeModal(show);
    if (!show) {
      SafeStorage.setItem(PREF_FIRST_LAUNCH_KEY, 'true').catch(() => {});
    }
  };

  const colors = useMemo(() => {
    return isDarkMode ? darkThemeColors : lightThemeColors;
  }, [isDarkMode]);

  const t = (key: keyof typeof translations.en): string => {
    const dict = translations[language as 'en' | 'hi'] || translations.en;
    return (dict as any)[key] || translations.en[key] || String(key);
  };

  return (
    <PreferencesContext.Provider
      value={{
        language,
        setLanguage,
        isDarkMode,
        toggleTheme,
        setThemeMode,
        speedUnit,
        setSpeedUnit,
        timeFormat,
        setTimeFormat,
        trackingSource,
        setTrackingSource,
        alarmSound,
        setAlarmSound,
        colors,
        t,
        showWelcomeModal,
        setShowWelcomeModal: dismissWelcomeModal,
      }}
    >
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
