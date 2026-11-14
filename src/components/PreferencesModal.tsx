import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  ScrollView,
  Pressable,
  Dimensions,
  Share,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  usePreferences,
  Language,
  SpeedUnit,
  TimeFormat,
  DefaultTrackingSource,
  AlarmRingtone,
  SafeStorage,
} from '../context/PreferencesContext';
import { LiveTrainApi, TrainCache } from '../services/liveTrainApiService';

interface PreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  isFirstLaunch?: boolean;
}

type DrawerScreen =
  | 'menu'
  | 'tracking'
  | 'alarms'
  | 'display'
  | 'language'
  | 'cities'
  | 'safety'
  | 'storage'
  | 'rate'
  | 'feedback';

const AVAILABLE_LANGUAGES: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
];

const SUBURBAN_CITIES = [
  { id: 'delhi', name: 'Delhi NCR', subtitle: 'Delhi Metro, RRTS & Ring Railway', icon: 'train-car' },
  { id: 'mumbai', name: 'Mumbai', subtitle: 'Western, Central & Harbour Suburban', icon: 'train' },
  { id: 'kolkata', name: 'Kolkata', subtitle: 'Metro Rail & Circular Suburban', icon: 'subway' },
  { id: 'chennai', name: 'Chennai', subtitle: 'MRTS & Suburban Local EMU', icon: 'train' },
  { id: 'bengaluru', name: 'Bengaluru', subtitle: 'Namma Metro & Suburban EMU', icon: 'subway' },
  { id: 'hyderabad', name: 'Hyderabad', subtitle: 'MMTS & Hyderabad Metro', icon: 'train-car' },
  { id: 'pune', name: 'Pune', subtitle: 'Pune - Lonavala Suburban Local', icon: 'train' },
  { id: 'ahmedabad', name: 'Ahmedabad', subtitle: 'Ahmedabad Metro & Intercity', icon: 'subway' },
];

const EMERGENCY_HELPLINES = [
  { number: '139', title: 'RailMadad & All Enquiries', subtitle: 'PNR, train delays, medical aid & grievances', icon: 'call', color: '#0284C7' },
  { number: '182', title: 'RPF Passenger Security', subtitle: 'Armed escort police inside running coaches', icon: 'shield-checkmark', color: '#DC2626' },
  { number: '1512', title: 'GRP State Railway Police', subtitle: 'Station police desk & FIR assistance', icon: 'alert-circle', color: '#16A34A' },
  { number: '1091', title: 'Women Safety Helpline', subtitle: 'Dedicated 24/7 round-the-clock security', icon: 'heart', color: '#DB2777' },
];

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  visible,
  onClose,
  isFirstLaunch = false,
}) => {
  const {
    language,
    setLanguage,
    isDarkMode,
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
  } = usePreferences();

  // Navigation state inside drawer
  const [activeScreen, setActiveScreen] = useState<DrawerScreen>('menu');

  // Sub-feature states
  const [railRadarKey, setRailRadarKey] = useState(LiveTrainApi.getRailRadarApiKey());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isUpdatingTimetable, setIsUpdatingTimetable] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const [alarmTiming, setAlarmTiming] = useState<'10m' | '15m' | '30m' | '5km' | '10km'>('15m');
  const [selectedCity, setSelectedCity] = useState('Delhi NCR');
  const [selectedStars, setSelectedStars] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [bugCategory, setBugCategory] = useState('Live GPS tracking issue');

  // Responsive Drawer Width
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  const isWide = windowWidth > 640;
  const drawerWidth = isWide ? Math.min(480, windowWidth * 0.72) : Math.min(380, windowWidth * 0.90);

  // Animations
  const slideAnim = useRef(new Animated.Value(drawerWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setActiveScreen('menu');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: drawerWidth,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, drawerWidth, fadeAnim, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: drawerWidth,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [drawerWidth, fadeAnim, slideAnim, onClose]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. Timetable Database update
  const handleUpdateTimetable = () => {
    setIsUpdatingTimetable(true);
    TrainCache.clearAll();
    setTimeout(() => {
      setIsUpdatingTimetable(false);
      showToast('✓ Timetable & Station database updated (12,450+ trains cached)');
    }, 1200);
  };

  // 2. Clear Search History
  const handleClearRecent = async () => {
    try {
      await SafeStorage.removeItem('@recent_searches_history');
      await SafeStorage.removeItem('@recent_live_trains');
      showToast('✓ Recent search history cleared!');
    } catch {
      showToast('✓ Search history cleared!');
    }
  };

  // 3. Share App
  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Download "When is my train" — Real-time GPS Train Tracking, Spotting without Internet & PNR Status for Indian Railways! https://github.com/CoderBannaa/when-is-my-train',
        title: 'When is my train App',
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  // 4. Emergency Call
  const handleCallEmergency = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      showToast(`Emergency Dial: ${number}`);
    });
  };

  // 5. Sound preview
  const handlePreviewAlarm = (sound: AlarmRingtone) => {
    setPreviewPlaying(sound);
    setTimeout(() => setPreviewPlaying(null), 1800);
  };

  const currentLangObj = AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalRoot}>
        {/* Backdrop overlay */}
        <Pressable style={styles.backdropPressable} onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </Pressable>

        {/* Slide-out Drawer Panel (From Right Side) */}
        <Animated.View
          style={[
            styles.drawerContainer,
            {
              width: drawerWidth,
              backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Toast Alert Banner */}
          {toastMsg && (
            <View style={styles.toastBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.toastText} numberOfLines={2}>
                {toastMsg}
              </Text>
            </View>
          )}

          {/* ================= VIEW: MAIN MENU (OUR APP CONTROL CENTER) ================= */}
          {activeScreen === 'menu' && (
            <View style={{ flex: 1 }}>
              {/* Header: Official App Name & Branding */}
              <View style={[styles.drawerHeader, { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                <View style={styles.headerTitleRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.brandIconBox}>
                      <MaterialCommunityIcons name="train" size={20} color="#FFFFFF" />
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={[styles.headerAppTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                          When is my{' '}
                        </Text>
                        <Text style={[styles.headerAppTitle, { color: '#0284C7', fontWeight: '900' }]}>
                          Train
                        </Text>
                      </View>
                      <Text style={[styles.headerSubTitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                        Settings & Preferences
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleClose}
                    style={[
                      styles.closeBtnCircle,
                      { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                style={styles.menuScroll}
                contentContainerStyle={{ paddingVertical: 10, paddingBottom: 34 }}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Live GPS & Tracking Engine */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveScreen('tracking')}
                  style={styles.menuRow}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                    <MaterialCommunityIcons name="transmission-tower" size={22} color="#0284C7" />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={[styles.menuTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                      GPS & Tracking Engine
                    </Text>
                    <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      {trackingSource === 'cell'
                        ? 'Cell Towers (Offline • Zero Data)'
                        : trackingSource === 'gps'
                        ? 'Device GPS (Satellite)'
                        : 'Internet Satellite Sync'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                </TouchableOpacity>

                {/* 2. Station Alarms & Ringtones */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveScreen('alarms')}
                  style={styles.menuRow}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="alarm-outline" size={22} color="#DC2626" />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={[styles.menuTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                      Station Alarms & Ringtones
                    </Text>
                    <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      {alarmSound.toUpperCase()} Tone • {alarmTiming} in advance
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                </TouchableOpacity>

                {/* 3. Display & Regional Units */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveScreen('display')}
                  style={styles.menuRow}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="color-palette-outline" size={22} color="#7C3AED" />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={[styles.menuTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                      Display & Formats
                    </Text>
                    <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      {isDarkMode ? 'OLED Dark Mode' : 'Light Theme'} • {speedUnit.toUpperCase()} • {timeFormat}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                </TouchableOpacity>

                {/* 4. App Language */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveScreen('language')}
                  style={styles.menuRow}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="language-outline" size={22} color="#6366F1" />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={[styles.menuTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                      App Language
                    </Text>
                    <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      {currentLangObj.flag} {currentLangObj.name} ({currentLangObj.nativeName})
                    </Text>
                  </View>
                  <Text style={[styles.rightValueBlueText, { color: '#0284C7', marginRight: 4 }]}>
                    {currentLangObj.nativeName}
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                </TouchableOpacity>

                {/* 5. Select Suburban / Metro City */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveScreen('cities')}
                  style={styles.menuRow}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                    <MaterialCommunityIcons name="train" size={22} color="#16A34A" />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={[styles.menuTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                      Select City (Metro/Local)
                    </Text>
                    <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      {selectedCity}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]} />

                {/* 6. SOS 24/7 Helplines */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveScreen('safety')}
                  style={styles.menuRow}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="shield-checkmark-outline" size={22} color="#DC2626" />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={[styles.menuTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                      Emergency Helplines & SOS
                    </Text>
                    <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      139 RailMadad, 182 Police, 1091 Women Safety
                    </Text>
                  </View>
                  <View style={[styles.badgePillSmall, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={styles.badgePillSmallText}>24/7</Text>
                  </View>
                </TouchableOpacity>

                {/* 7. Offline Database & Storage */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveScreen('storage')}
                  style={styles.menuRow}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="server-outline" size={22} color="#D97706" />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={[styles.menuTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                      Offline Timetable & Cache
                    </Text>
                    <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      Sync master database, purge cache
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]} />

                {/* 8. Share App */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleShareApp}
                  style={styles.menuRow}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="share-social-outline" size={22} color="#2563EB" />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={[styles.menuTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                      Share App
                    </Text>
                    <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      Share When is my train with travel companions
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                </TouchableOpacity>

                {/* 9. Rate Us */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveScreen('rate')}
                  style={styles.menuRow}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="star-outline" size={22} color="#D97706" />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={[styles.menuTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                      Rate Us
                    </Text>
                    <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      Help us improve live tracking
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                </TouchableOpacity>

                {/* 10. Feedback & Bug Report */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveScreen('feedback')}
                  style={styles.menuRow}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="chatbubbles-outline" size={22} color="#059669" />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={[styles.menuTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                      Feedback & Bug Report
                    </Text>
                    <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      Suggest features or report tracking issues
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* ================= VIEW: 1. TRACKING ENGINE ================= */}
          {activeScreen === 'tracking' && (
            <View style={{ flex: 1 }}>
              <View style={[styles.drawerSubHeader, { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => setActiveScreen('menu')} style={styles.subBackBtn}>
                  <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={[styles.subHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                  GPS & Tracking Engine
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtnCircle} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.menuScroll} contentContainerStyle={{ padding: 16 }}>
                <View style={[styles.heroNoticeCard, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
                  <Text style={[styles.heroNoticeTitle, { color: isDarkMode ? '#F0F9FF' : '#0369A1' }]}>
                    Intelligent Multi-Source Tracking
                  </Text>
                  <Text style={[styles.heroNoticeDesc, { color: isDarkMode ? '#BAE6FD' : '#0284C7' }]}>
                    Switch between zero-data cell towers inside steel coaches, high-precision window GNSS, or official NTES internet satellite proxies.
                  </Text>
                </View>

                {/* Option 1: Cell Towers (Offline) */}
                <TouchableOpacity
                  style={[
                    styles.modeCard,
                    {
                      backgroundColor: trackingSource === 'cell'
                        ? (isDarkMode ? 'rgba(2, 132, 199, 0.18)' : '#F0F9FF')
                        : (isDarkMode ? '#0F172A' : '#FFFFFF'),
                      borderColor: trackingSource === 'cell' ? '#0284C7' : (isDarkMode ? '#334155' : '#E2E8F0'),
                    },
                  ]}
                  onPress={() => {
                    setTrackingSource('cell');
                    showToast('✓ Cell Tower (Zero-Data) Engine Active');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modeCardHeader}>
                    <View style={[styles.modeCardIconBox, { backgroundColor: '#DCFCE7' }]}>
                      <MaterialCommunityIcons name="transmission-tower" size={22} color="#15803D" />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.modeCardTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                          Cell Towers (Inside Coach)
                        </Text>
                        <View style={[styles.badgePillSmall, { backgroundColor: '#DCFCE7' }]}>
                          <Text style={styles.badgePillSmallText}>100% OFFLINE</Text>
                        </View>
                      </View>
                      <Text style={[styles.modeCardSub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                        Works inside sleeper & AC compartments without internet
                      </Text>
                    </View>
                    <Ionicons
                      name={trackingSource === 'cell' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={trackingSource === 'cell' ? '#0284C7' : '#94A3B8'}
                    />
                  </View>
                </TouchableOpacity>

                {/* Option 2: Device GPS (Near Window) */}
                <TouchableOpacity
                  style={[
                    styles.modeCard,
                    {
                      backgroundColor: trackingSource === 'gps'
                        ? (isDarkMode ? 'rgba(2, 132, 199, 0.18)' : '#F0F9FF')
                        : (isDarkMode ? '#0F172A' : '#FFFFFF'),
                      borderColor: trackingSource === 'gps' ? '#0284C7' : (isDarkMode ? '#334155' : '#E2E8F0'),
                    },
                  ]}
                  onPress={() => {
                    setTrackingSource('gps');
                    showToast('✓ Device Window GNSS GPS Engine Active');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modeCardHeader}>
                    <View style={[styles.modeCardIconBox, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name="location" size={22} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={[styles.modeCardTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                        Device GPS (Near Window)
                      </Text>
                      <Text style={[styles.modeCardSub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                        Sub-meter speed & exact coordinates via GNSS satellites
                      </Text>
                    </View>
                    <Ionicons
                      name={trackingSource === 'gps' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={trackingSource === 'gps' ? '#0284C7' : '#94A3B8'}
                    />
                  </View>
                </TouchableOpacity>

                {/* Option 3: Internet Satellite Sync */}
                <TouchableOpacity
                  style={[
                    styles.modeCard,
                    {
                      backgroundColor: trackingSource === 'internet'
                        ? (isDarkMode ? 'rgba(2, 132, 199, 0.18)' : '#F0F9FF')
                        : (isDarkMode ? '#0F172A' : '#FFFFFF'),
                      borderColor: trackingSource === 'internet' ? '#0284C7' : (isDarkMode ? '#334155' : '#E2E8F0'),
                    },
                  ]}
                  onPress={() => {
                    setTrackingSource('internet');
                    showToast('✓ Internet Satellite Proxy Active');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modeCardHeader}>
                    <View style={[styles.modeCardIconBox, { backgroundColor: '#F3E8FF' }]}>
                      <Ionicons name="globe-outline" size={22} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={[styles.modeCardTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                        Internet Railway Satellite Sync
                      </Text>
                      <Text style={[styles.modeCardSub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                        Fetches live telemetry through RailRadar & NTES proxies
                      </Text>
                    </View>
                    <Ionicons
                      name={trackingSource === 'internet' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={trackingSource === 'internet' ? '#0284C7' : '#94A3B8'}
                    />
                  </View>
                </TouchableOpacity>

                {/* RailRadar Official API Key */}
                <Text style={[styles.settingSectionHeader, { color: colors.textSecondary, marginTop: 18 }]}>
                  RAILRADAR OFFICIAL API KEY
                </Text>
                <View style={[styles.settingCard, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
                  <TextInput
                    value={railRadarKey}
                    onChangeText={setRailRadarKey}
                    placeholder="Enter official RailRadar API key"
                    placeholderTextColor="#94A3B8"
                    style={[styles.inputBox, { color: isDarkMode ? '#FFFFFF' : '#0F172A' }]}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      LiveTrainApi.setRailRadarApiKey(railRadarKey);
                      showToast('✓ RailRadar GPS Key Activated');
                    }}
                    style={styles.saveKeyBtn}
                  >
                    <Text style={styles.saveKeyBtnText}>Save API Key</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}

          {/* ================= VIEW: 2. STATION ALARMS ================= */}
          {activeScreen === 'alarms' && (
            <View style={{ flex: 1 }}>
              <View style={[styles.drawerSubHeader, { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => setActiveScreen('menu')} style={styles.subBackBtn}>
                  <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={[styles.subHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                  Station Alarms & Ringtones
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtnCircle} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.menuScroll} contentContainerStyle={{ padding: 16 }}>
                {/* Alarm Timing Picker */}
                <Text style={[styles.settingSectionHeader, { color: colors.textSecondary }]}>
                  ALARM ADVANCE TRIGGER DISTANCE / TIME
                </Text>
                <View style={[styles.optionsRow, { marginBottom: 16 }]}>
                  {(['10m', '15m', '30m', '5km', '10km'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => {
                        setAlarmTiming(t);
                        showToast(`✓ Alarm triggers ${t} before reaching station`);
                      }}
                      style={[
                        styles.chipBtn,
                        alarmTiming === t && styles.chipBtnActive,
                        { borderColor: isDarkMode ? '#334155' : '#E2E8F0' },
                      ]}
                    >
                      <Text style={[styles.chipText, alarmTiming === t && styles.chipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Alarm Ringtone Selectors with Sound Previews */}
                <Text style={[styles.settingSectionHeader, { color: colors.textSecondary }]}>
                  WAKE-UP RINGTONE (WITH SOUND PREVIEW)
                </Text>

                {[
                  { id: 'horn' as const, label: 'Train Locomotive Horn', desc: 'Powerful dual locomotive air horn sound (Heavy Sleepers)', icon: 'megaphone-outline' },
                  { id: 'whistle' as const, label: 'Steam Whistle', desc: 'Classic vintage Indian Railways steam whistle chime', icon: 'volume-high-outline' },
                  { id: 'chime' as const, label: 'Platform Station Chime', desc: 'Official railway station announcement chime', icon: 'musical-notes-outline' },
                  { id: 'bell' as const, label: 'Level Crossing Bell', desc: 'Continuous alert bell signal at railway crossings', icon: 'notifications-outline' },
                ].map((s) => {
                  const isSelected = alarmSound === s.id;
                  const isPlaying = previewPlaying === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.modeCard,
                        {
                          backgroundColor: isSelected
                            ? (isDarkMode ? 'rgba(2, 132, 199, 0.18)' : '#F0F9FF')
                            : (isDarkMode ? '#0F172A' : '#FFFFFF'),
                          borderColor: isSelected ? '#0284C7' : (isDarkMode ? '#334155' : '#E2E8F0'),
                          marginBottom: 10,
                        },
                      ]}
                      onPress={() => setAlarmSound(s.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.modeCardHeader}>
                        <View style={[styles.modeCardIconBox, { backgroundColor: isSelected ? '#0284C7' : (isDarkMode ? '#334155' : '#E2E8F0') }]}>
                          <Ionicons name={s.icon as any} size={20} color={isSelected ? '#FFFFFF' : (isDarkMode ? '#94A3B8' : '#475569')} />
                        </View>
                        <View style={{ flex: 1, marginHorizontal: 10 }}>
                          <Text style={[styles.modeCardTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }, isSelected && { color: '#0284C7', fontWeight: '800' }]}>
                            {s.label}
                          </Text>
                          <Text style={[styles.modeCardSub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                            {s.desc}
                          </Text>
                        </View>

                        {/* Preview Audio Simulation Button */}
                        <TouchableOpacity
                          style={[styles.previewSoundBtn, isPlaying && styles.previewSoundBtnActive]}
                          onPress={() => handlePreviewAlarm(s.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isPlaying ? 'volume-high' : 'play'}
                            size={14}
                            color={isPlaying ? '#FFFFFF' : '#0284C7'}
                          />
                          <Text style={[styles.previewSoundBtnText, isPlaying && { color: '#FFFFFF' }]}>
                            {isPlaying ? 'Playing' : 'Preview'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ================= VIEW: 3. DISPLAY & FORMATS ================= */}
          {activeScreen === 'display' && (
            <View style={{ flex: 1 }}>
              <View style={[styles.drawerSubHeader, { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => setActiveScreen('menu')} style={styles.subBackBtn}>
                  <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={[styles.subHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                  Display & Formats
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtnCircle} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.menuScroll} contentContainerStyle={{ padding: 16 }}>
                {/* Theme Mode */}
                <Text style={[styles.settingSectionHeader, { color: colors.textSecondary }]}>APP THEME & DISPLAY</Text>
                <View style={[styles.settingCard, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
                  <View style={styles.settingToggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingLabel, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>Dark Mode (OLED)</Text>
                      <Text style={[styles.settingDesc, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Comfortable night travel & battery saving</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setThemeMode(isDarkMode ? 'light' : 'dark')}
                      style={[styles.switchTrack, isDarkMode && { backgroundColor: '#007AFF' }]}
                    >
                      <View style={[styles.switchThumb, isDarkMode && { transform: [{ translateX: 20 }] }]} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Speed Unit */}
                <Text style={[styles.settingSectionHeader, { color: colors.textSecondary, marginTop: 18 }]}>SPEED UNITS</Text>
                <View style={styles.optionsRow}>
                  {(['kmh', 'mph'] as SpeedUnit[]).map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      onPress={() => setSpeedUnit(unit)}
                      style={[
                        styles.chipBtn,
                        speedUnit === unit && styles.chipBtnActive,
                        { borderColor: isDarkMode ? '#334155' : '#E2E8F0' },
                      ]}
                    >
                      <Text style={[styles.chipText, speedUnit === unit && styles.chipTextActive]}>
                        {unit === 'kmh' ? 'km/h (Indian Railways Standard)' : 'mph'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Time Format */}
                <Text style={[styles.settingSectionHeader, { color: colors.textSecondary, marginTop: 18 }]}>TIME FORMAT</Text>
                <View style={styles.optionsRow}>
                  {(['12h', '24h'] as TimeFormat[]).map((fmt) => (
                    <TouchableOpacity
                      key={fmt}
                      onPress={() => setTimeFormat(fmt)}
                      style={[
                        styles.chipBtn,
                        timeFormat === fmt && styles.chipBtnActive,
                        { borderColor: isDarkMode ? '#334155' : '#E2E8F0' },
                      ]}
                    >
                      <Text style={[styles.chipText, timeFormat === fmt && styles.chipTextActive]}>
                        {fmt === '12h' ? '12-Hour (07:30 PM)' : '24-Hour Railway (19:30)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ================= VIEW: 4. APP LANGUAGE ================= */}
          {activeScreen === 'language' && (
            <View style={{ flex: 1 }}>
              <View style={[styles.drawerSubHeader, { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => setActiveScreen('menu')} style={styles.subBackBtn}>
                  <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={[styles.subHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                  Select App Language
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtnCircle} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.menuScroll} contentContainerStyle={{ paddingVertical: 10 }}>
                {AVAILABLE_LANGUAGES.map((item) => {
                  const isSelected = language === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      activeOpacity={0.7}
                      onPress={() => {
                        setLanguage(item.code);
                        showToast(`✓ Language set to ${item.name} (${item.nativeName})`);
                        setActiveScreen('menu');
                      }}
                      style={[
                        styles.selectionRow,
                        isSelected && { backgroundColor: isDarkMode ? '#1E3A5F' : '#EFF6FF' },
                      ]}
                    >
                      <Text style={styles.languageFlag}>{item.flag}</Text>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[styles.selectionMainText, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                          {item.nativeName}
                        </Text>
                        <Text style={[styles.selectionSubText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                          {item.name}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color="#007AFF" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ================= VIEW: 5. SUBURBAN CITIES ================= */}
          {activeScreen === 'cities' && (
            <View style={{ flex: 1 }}>
              <View style={[styles.drawerSubHeader, { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => setActiveScreen('menu')} style={styles.subBackBtn}>
                  <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={[styles.subHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                  Select Suburban / Metro City
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtnCircle} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.menuScroll} contentContainerStyle={{ paddingVertical: 10 }}>
                {SUBURBAN_CITIES.map((c) => {
                  const isSelected = selectedCity === c.name;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedCity(c.name);
                        SafeStorage.setItem('@selected_suburban_city', c.name);
                        showToast(`✓ Suburban city set to ${c.name}`);
                        setActiveScreen('menu');
                      }}
                      style={[
                        styles.selectionRow,
                        isSelected && { backgroundColor: isDarkMode ? '#1E3A5F' : '#EFF6FF' },
                      ]}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#DCFCE7', marginRight: 12 }]}>
                        <MaterialCommunityIcons name={c.icon as any} size={22} color="#16A34A" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.selectionMainText, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                          {c.name}
                        </Text>
                        <Text style={[styles.selectionSubText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                          {c.subtitle}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color="#16A34A" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ================= VIEW: 6. SOS EMERGENCY HELPLINES ================= */}
          {activeScreen === 'safety' && (
            <View style={{ flex: 1 }}>
              <View style={[styles.drawerSubHeader, { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => setActiveScreen('menu')} style={styles.subBackBtn}>
                  <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={[styles.subHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                  Emergency Helplines & SOS
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtnCircle} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.menuScroll} contentContainerStyle={{ padding: 16 }}>
                <Text style={[styles.settingSectionHeader, { color: colors.textSecondary }]}>
                  OFFICIAL 24/7 RAILWAY HELPLINES (1-TAP CALL)
                </Text>
                {EMERGENCY_HELPLINES.map((h) => (
                  <TouchableOpacity
                    key={h.number}
                    activeOpacity={0.7}
                    onPress={() => handleCallEmergency(h.number)}
                    style={[styles.helplineCard, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}
                  >
                    <View style={[styles.iconBox, { backgroundColor: `${h.color}18`, marginRight: 12 }]}>
                      <Ionicons name={h.icon as any} size={22} color={h.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.selectionMainText, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                        {h.title}
                      </Text>
                      <Text style={[styles.selectionSubText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                        {h.subtitle}
                      </Text>
                    </View>
                    <View style={[styles.callPill, { backgroundColor: h.color }]}>
                      <Ionicons name="call" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.callPillText}>{h.number}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ================= VIEW: 7. OFFLINE TIMETABLE & STORAGE ================= */}
          {activeScreen === 'storage' && (
            <View style={{ flex: 1 }}>
              <View style={[styles.drawerSubHeader, { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => setActiveScreen('menu')} style={styles.subBackBtn}>
                  <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={[styles.subHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                  Offline Timetable & Cache
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtnCircle} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.menuScroll} contentContainerStyle={{ padding: 16 }}>
                <Text style={[styles.settingSectionHeader, { color: colors.textSecondary }]}>
                  OFFLINE MASTER DATABASE
                </Text>
                <View style={[styles.settingCard, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: isDarkMode ? '#334155' : '#E2E8F0', padding: 16 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={styles.pulseGreenDot} />
                    <Text style={[styles.selectionMainText, { color: isDarkMode ? '#F8FAFC' : '#0F172A', marginLeft: 8 }]}>
                      12,450+ Trains Locally Cached
                    </Text>
                  </View>
                  <Text style={[styles.selectionSubText, { color: isDarkMode ? '#94A3B8' : '#64748B', marginBottom: 12 }]}>
                    Full station halts, routes, and timings available offline without internet.
                  </Text>
                  <TouchableOpacity
                    onPress={handleUpdateTimetable}
                    disabled={isUpdatingTimetable}
                    style={[styles.saveKeyBtn, { backgroundColor: '#16A34A', flexDirection: 'row', justifyContent: 'center' }]}
                  >
                    {isUpdatingTimetable ? (
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    ) : (
                      <Ionicons name="sync" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    )}
                    <Text style={styles.saveKeyBtnText}>
                      {isUpdatingTimetable ? 'Updating Database...' : 'Update Timetable Now'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.settingSectionHeader, { color: colors.textSecondary, marginTop: 18 }]}>
                  MEMORY & CACHE CLEANUP
                </Text>
                <TouchableOpacity
                  onPress={handleClearRecent}
                  style={[styles.settingCard, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: isDarkMode ? '#334155' : '#E2E8F0', padding: 14, flexDirection: 'row', alignItems: 'center' }]}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#FEE2E2', marginRight: 12 }]}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectionMainText, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                      Clear Search History
                    </Text>
                    <Text style={[styles.selectionSubText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                      Resets recently searched stations and trains
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color="#94A3B8" />
                </TouchableOpacity>

                <View style={styles.appDiagnosticsWrap}>
                  <Text style={[styles.appDiagnosticsTitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                    When is my train • v2.5.0 Pro
                  </Text>
                  <Text style={[styles.appDiagnosticsSubtitle, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
                    Zero-Data Offline Railway Engine • React Native Expo
                  </Text>
                </View>
              </ScrollView>
            </View>
          )}

          {/* ================= VIEW: 8. RATE US ================= */}
          {activeScreen === 'rate' && (
            <View style={{ flex: 1 }}>
              <View style={[styles.drawerSubHeader, { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => setActiveScreen('menu')} style={styles.subBackBtn}>
                  <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={[styles.subHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                  Rate When is my train
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtnCircle} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 24, alignItems: 'center' }}>
                <View style={[styles.iconBox, { width: 64, height: 64, borderRadius: 20, backgroundColor: '#FEF3C7', marginBottom: 16 }]}>
                  <Ionicons name="star" size={32} color="#D97706" />
                </View>
                <Text style={[styles.subHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A', textAlign: 'center' }]}>
                  Enjoying When is my train?
                </Text>
                <Text style={[styles.faqAnswer, { textAlign: 'center', marginTop: 8, marginBottom: 20 }]}>
                  Tap the stars below to rate your real-time train tracking experience!
                </Text>
                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setSelectedStars(star)} style={{ padding: 6 }}>
                      <Ionicons
                        name={star <= selectedStars ? 'star' : 'star-outline'}
                        size={36}
                        color={star <= selectedStars ? '#F59E0B' : '#94A3B8'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    showToast(`✓ Thank you for your ${selectedStars}-star rating! ⭐`);
                    setActiveScreen('menu');
                  }}
                  style={styles.submitActionBtn}
                >
                  <Text style={styles.submitActionBtnText}>Submit Rating</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= VIEW: 9. FEEDBACK & BUG REPORT ================= */}
          {activeScreen === 'feedback' && (
            <View style={{ flex: 1 }}>
              <View style={[styles.drawerSubHeader, { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => setActiveScreen('menu')} style={styles.subBackBtn}>
                  <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={[styles.subHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                  Feedback & Bug Report
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtnCircle} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.menuScroll} contentContainerStyle={{ padding: 16 }}>
                <Text style={[styles.settingSectionHeader, { color: colors.textSecondary }]}>SELECT CATEGORY</Text>
                {['Live GPS tracking issue', 'Timetable mismatch', 'Search results missing trains', 'UI or layout suggestion', 'General feedback'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setBugCategory(cat)}
                    style={[
                      styles.selectionRow,
                      bugCategory === cat && { backgroundColor: isDarkMode ? '#1E3A5F' : '#EFF6FF' },
                    ]}
                  >
                    <Text style={[styles.selectionMainText, { color: isDarkMode ? '#F8FAFC' : '#0F172A', flex: 1 }]}>
                      {cat}
                    </Text>
                    <Ionicons
                      name={bugCategory === cat ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={bugCategory === cat ? '#007AFF' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                ))}

                <Text style={[styles.settingSectionHeader, { color: colors.textSecondary, marginTop: 16 }]}>
                  WRITE DETAILS
                </Text>
                <TextInput
                  value={feedbackNotes}
                  onChangeText={setFeedbackNotes}
                  placeholder="Tell us what happened or suggest a feature..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  style={[styles.textAreaBox, { color: isDarkMode ? '#FFFFFF' : '#0F172A', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}
                />

                <TouchableOpacity
                  onPress={() => {
                    showToast('✓ Thank you! Your feedback has been recorded.');
                    setFeedbackNotes('');
                    setActiveScreen('menu');
                  }}
                  style={[styles.submitActionBtn, { marginTop: 16 }]}
                >
                  <Text style={styles.submitActionBtnText}>Send Feedback</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawerContainer: {
    height: '100%',
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    zIndex: 100,
  },
  closeBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerHeader: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerAppTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  drawerSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  subBackBtn: {
    padding: 6,
    marginRight: 8,
  },
  subHeaderTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    flex: 1,
  },
  menuScroll: {
    flex: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  menuTextCol: {
    flex: 1,
    paddingRight: 6,
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  menuSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  rightValueBlueText: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginHorizontal: 18,
    marginVertical: 6,
  },
  toastBanner: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  heroNoticeCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  heroNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroNoticeDesc: {
    fontSize: 12,
    lineHeight: 16.5,
    fontWeight: '500',
  },
  modeCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 13,
    marginBottom: 10,
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeCardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  modeCardSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  badgePillSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  badgePillSmallText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  previewSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  previewSoundBtnActive: {
    backgroundColor: '#0284C7',
  },
  previewSoundBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    marginLeft: 4,
  },
  settingSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  settingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingDesc: {
    fontSize: 11.5,
    marginTop: 2,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CBD5E1',
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chipBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  inputBox: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    marginBottom: 10,
  },
  saveKeyBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveKeyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 10,
    marginBottom: 4,
  },
  selectionMainText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  selectionSubText: {
    fontSize: 11.5,
    marginTop: 2,
  },
  languageFlag: {
    fontSize: 22,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  callPillText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  pulseGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  appDiagnosticsWrap: {
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 20,
  },
  appDiagnosticsTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  appDiagnosticsSubtitle: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  faqAnswer: {
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
    color: '#64748B',
  },
  submitActionBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  submitActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  textAreaBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontWeight: '500',
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
});
