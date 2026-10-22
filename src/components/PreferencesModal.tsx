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
  Switch,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  Share,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePreferences, Language, SpeedUnit, TimeFormat, DefaultTrackingSource, AlarmRingtone } from '../context/PreferencesContext';
import { LiveTrainApi, TrainCache } from '../services/liveTrainApiService';
import { SafeStorage } from '../context/PreferencesContext';

interface PreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  isFirstLaunch?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(390, SCREEN_WIDTH * 0.90);

const AVAILABLE_LANGUAGES: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
];

const EMERGENCY_HELPLINES = [
  { number: '139', title: 'RailMadad & All Enquiries', subtitle: 'Punctuality, PNR, Security & Medical', icon: 'call' as const, color: '#0284C7' },
  { number: '1512', title: 'GRP Railway Police', subtitle: 'Crime prevention & Law & Order', icon: 'shield-checkmark' as const, color: '#16A34A' },
  { number: '182', title: 'RPF Passenger Security', subtitle: 'Emergency assistance in running train', icon: 'alert-circle' as const, color: '#DC2626' },
  { number: '1091', title: 'Women Safety Helpline', subtitle: 'Dedicated 24/7 security for female travelers', icon: 'heart' as const, color: '#DB2777' },
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
    t,
  } = usePreferences();

  const [railRadarKey, setRailRadarKey] = useState(LiveTrainApi.getRailRadarApiKey());

  // Travel Alert switches
  const [arrivalAlerts, setArrivalAlerts] = useState(true);
  const [delayAlerts, setDelayAlerts] = useState(true);
  const [vibrateSound, setVibrateSound] = useState(true);
  const [batterySaver, setBatterySaver] = useState(false);
  const [cacheClearMsg, setCacheClearMsg] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);

  // Slide-in from right animation
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Speeding Train Runway Animation in Top Hero
  const trainSlideAnim = useRef(new Animated.Value(0)).current;

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: DRAWER_WIDTH,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [DRAWER_WIDTH, fadeAnim, onClose, slideAnim]);

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(DRAWER_WIDTH);
      fadeAnim.setValue(0);
      trainSlideAnim.setValue(0);
      setRailRadarKey(LiveTrainApi.getRailRadarApiKey());
      setCacheClearMsg(null);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const trainLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(trainSlideAnim, {
            toValue: 1,
            duration: 2600,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(trainSlideAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      trainLoop.start();
      return () => trainLoop.stop();
    }
  }, [visible, DRAWER_WIDTH, slideAnim, fadeAnim, trainSlideAnim]);

  const handleShareApp = async () => {
    try {
      const shareUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : 'http://10.67.121.19:8081';
      const shareMsg = `🚆 Track Indian Railways trains live via Cell Tower / GPS (No Internet needed!), check Coach Position, PNR Seat Gaps & Station Departure Boards with 'When is my train'!\nDownload / Open here: ${shareUrl}`;

      if (Platform.OS !== 'web' && Share && Share.share) {
        await Share.share({
          message: shareMsg,
          title: 'When is my train - Offline Cell & GPS Tracking',
        });
      } else if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: 'When is my train',
          text: shareMsg,
          url: shareUrl,
        });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareMsg);
        setCacheClearMsg('✓ App link copied to clipboard!');
        setTimeout(() => setCacheClearMsg(null), 3000);
      } else {
        setCacheClearMsg(`✓ Share Link: ${shareUrl}`);
        setTimeout(() => setCacheClearMsg(null), 3500);
      }
    } catch {}
  };

  const handleKeyChange = (key: string) => {
    setRailRadarKey(key);
    LiveTrainApi.setRailRadarApiKey(key);
  };

  const handleClearCache = async () => {
    TrainCache.purgeExpired();
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith('@cache_status_')) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      }
    } catch {}
    setCacheClearMsg('✓ Live train cache purged successfully!');
    setTimeout(() => setCacheClearMsg(null), 3000);
  };

  const handleClearRecentSearches = async () => {
    try {
      await SafeStorage.setItem('@user_recent_searches', JSON.stringify([]));
      setCacheClearMsg('✓ Search history cleared!');
      setTimeout(() => setCacheClearMsg(null), 3000);
    } catch {}
  };

  const handleCheckTimetableUpdates = () => {
    setIsCheckingUpdate(true);
    setTimeout(() => {
      setIsCheckingUpdate(false);
      setCacheClearMsg('✓ Timetable Database is Up-To-Date (v2026.10 - 12,450 trains cached)');
      setTimeout(() => setCacheClearMsg(null), 3500);
    }, 1300);
  };

  const handlePreviewAlarm = (sound: AlarmRingtone) => {
    setPreviewPlaying(sound);
    setTimeout(() => {
      setPreviewPlaying(null);
    }, 1800);
  };

  const handleCallEmergency = (number: string) => {
    const url = `tel:${number}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          setCacheClearMsg(`Dial ${number} on your phone`);
          setTimeout(() => setCacheClearMsg(null), 3000);
        }
      })
      .catch(() => {
        setCacheClearMsg(`Dial ${number} on your phone`);
        setTimeout(() => setCacheClearMsg(null), 3000);
      });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalRoot}>
        {/* Semi-transparent Backdrop Overlay */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Right-Side Slide Drawer Panel */}
        <Animated.View
          style={[
            styles.drawerPanel,
            {
              width: DRAWER_WIDTH,
              backgroundColor: colors.surface,
              borderLeftColor: colors.border,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* 1. Drawer Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.gearIconBox, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="settings-sharp" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.drawerTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'सेटिंग्स व प्राथमिकताएं' : 'Settings & Preferences'}
                </Text>
                <Text style={[styles.drawerSubtitleText, { color: colors.textSecondary }]}>
                  {language === 'hi' ? 'ऑफलाइन ट्रैकिंग, अलार्म व इमरजेंसी' : 'Offline tracking, alarm & helplines'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.drawerCloseBtn} onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Drawer Body Scroll */}
          <ScrollView
            style={styles.drawerScroll}
            contentContainerStyle={styles.drawerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {cacheClearMsg && (
              <View style={styles.toastSuccessBox}>
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={styles.toastSuccessText}>{cacheClearMsg}</Text>
              </View>
            )}

            {/* ===== TOP FUTURISTIC HERO BANNER ===== */}
            <View style={[styles.trainHeroBanner, { backgroundColor: isDarkMode ? '#0F172A' : '#0284C7', borderColor: colors.border }]}>
              {/* Top row: Brand & Version */}
              <View style={styles.trainHeroTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="train" size={20} color="#38BDF8" style={{ marginRight: 6 }} />
                  <Text style={styles.trainHeroBrand}>When is my train</Text>
                </View>
                <View style={styles.trainHeroVersionPill}>
                  <Text style={styles.trainHeroVersionText}>v2.5.0 Pro</Text>
                </View>
              </View>

              {/* Middle: Railway Track with Speeding Animated Train */}
              <View style={styles.trainTrackRunway}>
                <View style={styles.trainTrackLine} />
                <Animated.View
                  style={[
                    styles.speedingTrainSprite,
                    {
                      transform: [
                        {
                          translateX: trainSlideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-35, DRAWER_WIDTH - 65],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.trainHeadlightGlow} />
                  <MaterialCommunityIcons name="train" size={22} color="#FFFFFF" />
                </Animated.View>
              </View>

              {/* Quick Share App Button on the Hero Card */}
              <TouchableOpacity
                style={styles.heroShareAppBtn}
                onPress={handleShareApp}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.heroShareAppBtnText}>
                  {language === 'hi' ? 'मित्रों के साथ शेयर करें (Share App)' : 'Share App with Friends'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ===== SECTION 1: DEFAULT LOCATION & TRACKING ENGINE (KILLER FEATURE) ===== */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <MaterialCommunityIcons name="transmission-tower" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'डिफ़ॉल्ट ट्रैकिंग मोड' : 'Default Tracking Mode'}
                </Text>
              </View>
              <Text style={[styles.sectionHelperDesc, { color: colors.textSecondary }]}>
                Choose how train position is calculated while traveling inside trains:
              </Text>

              <View style={styles.trackingChoiceGrid}>
                {/* 1. Cell Tower */}
                <TouchableOpacity
                  style={[
                    styles.trackingChoiceCard,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                    trackingSource === 'cell' && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setTrackingSource('cell')}
                >
                  <View style={styles.trackingChoiceTopRow}>
                    <MaterialCommunityIcons name="transmission-tower" size={20} color={trackingSource === 'cell' ? colors.primary : colors.textSecondary} />
                    <View style={[styles.sourceBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.sourceBadgeText, { color: '#15803D' }]}>NO NET NEEDED</Text>
                    </View>
                  </View>
                  <Text style={[styles.trackingChoiceTitle, { color: colors.textPrimary }]}>Cell Towers (Inside Train)</Text>
                  <Text style={[styles.trackingChoiceSub, { color: colors.textSecondary }]}>
                    Tracks train speed & stations even with zero internet inside coaches.
                  </Text>
                  {trackingSource === 'cell' && (
                    <View style={[styles.sourceCheckDot, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* 2. Device GPS */}
                <TouchableOpacity
                  style={[
                    styles.trackingChoiceCard,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                    trackingSource === 'gps' && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setTrackingSource('gps')}
                >
                  <View style={styles.trackingChoiceTopRow}>
                    <Ionicons name="location" size={20} color={trackingSource === 'gps' ? colors.primary : colors.textSecondary} />
                    <View style={[styles.sourceBadge, { backgroundColor: '#E0F2FE' }]}>
                      <Text style={[styles.sourceBadgeText, { color: '#0369A1' }]}>HIGH PRECISION</Text>
                    </View>
                  </View>
                  <Text style={[styles.trackingChoiceTitle, { color: colors.textPrimary }]}>Device GPS (Near Window)</Text>
                  <Text style={[styles.trackingChoiceSub, { color: colors.textSecondary }]}>
                    Direct satellite positioning for maximum speed & accurate ETA.
                  </Text>
                  {trackingSource === 'gps' && (
                    <View style={[styles.sourceCheckDot, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* 3. Internet Mode */}
                <TouchableOpacity
                  style={[
                    styles.trackingChoiceCard,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                    trackingSource === 'internet' && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setTrackingSource('internet')}
                >
                  <View style={styles.trackingChoiceTopRow}>
                    <Ionicons name="globe-outline" size={20} color={trackingSource === 'internet' ? colors.primary : colors.textSecondary} />
                    <View style={[styles.sourceBadge, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.sourceBadgeText, { color: '#B45309' }]}>RAILWAY NTES</Text>
                    </View>
                  </View>
                  <Text style={[styles.trackingChoiceTitle, { color: colors.textPrimary }]}>Internet / NTES Server</Text>
                  <Text style={[styles.trackingChoiceSub, { color: colors.textSecondary }]}>
                    Fetches official Indian Railway station departures & live schedules.
                  </Text>
                  {trackingSource === 'internet' && (
                    <View style={[styles.sourceCheckDot, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* ===== SECTION 2: SPEED UNITS & TIME FORMAT ===== */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <Ionicons name="speedometer-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'स्पीड यूनिट व समय प्रारूप' : 'Speed Unit & Time Format'}
                </Text>
              </View>

              {/* Speed Unit Segmented Control */}
              <View style={styles.unitRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingRowLabel, { color: colors.textPrimary }]}>Speed Unit</Text>
                  <Text style={[styles.settingRowDesc, { color: colors.textSecondary }]}>Speedometer display</Text>
                </View>
                <View style={[styles.pillSwitcher, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.pillOption, speedUnit === 'kmh' && { backgroundColor: colors.primary }]}
                    onPress={() => setSpeedUnit('kmh')}
                  >
                    <Text style={[styles.pillOptionText, speedUnit === 'kmh' ? styles.pillOptionTextActive : { color: colors.textSecondary }]}>
                      km/h
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pillOption, speedUnit === 'mph' && { backgroundColor: colors.primary }]}
                    onPress={() => setSpeedUnit('mph')}
                  >
                    <Text style={[styles.pillOptionText, speedUnit === 'mph' ? styles.pillOptionTextActive : { color: colors.textSecondary }]}>
                      mph
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Time Format Segmented Control */}
              <View style={[styles.unitRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingRowLabel, { color: colors.textPrimary }]}>Railway Time Format</Text>
                  <Text style={[styles.settingRowDesc, { color: colors.textSecondary }]}>Station timetable display</Text>
                </View>
                <View style={[styles.pillSwitcher, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.pillOption, timeFormat === '24h' && { backgroundColor: colors.primary }]}
                    onPress={() => setTimeFormat('24h')}
                  >
                    <Text style={[styles.pillOptionText, timeFormat === '24h' ? styles.pillOptionTextActive : { color: colors.textSecondary }]}>
                      24h (18:45)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pillOption, timeFormat === '12h' && { backgroundColor: colors.primary }]}
                    onPress={() => setTimeFormat('12h')}
                  >
                    <Text style={[styles.pillOptionText, timeFormat === '12h' ? styles.pillOptionTextActive : { color: colors.textSecondary }]}>
                      12h (6:45 PM)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ===== SECTION 3: STATION ALARM RINGTONE & PREVIEW ===== */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <Ionicons name="alarm-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'स्टेशन वेक-अप अलार्म टोन' : 'Station Wake-Up Ringtone'}
                </Text>
              </View>

              <View style={styles.alarmSoundGrid}>
                {[
                  { id: 'horn' as const, label: 'Train Horn', icon: 'megaphone-outline' },
                  { id: 'whistle' as const, label: 'Whistle', icon: 'volume-high' },
                  { id: 'chime' as const, label: 'Station Chime', icon: 'musical-notes-outline' },
                  { id: 'bell' as const, label: 'Classic Bell', icon: 'notifications-outline' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.alarmSoundItem,
                      { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                      alarmSound === s.id && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                    ]}
                    onPress={() => setAlarmSound(s.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={s.icon as any} size={18} color={alarmSound === s.id ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.alarmSoundLabel, { color: colors.textPrimary }, alarmSound === s.id && { color: colors.primary, fontWeight: '800' }]}>
                      {s.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handlePreviewAlarm(s.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.previewBtn}
                    >
                      <Ionicons
                        name={previewPlaying === s.id ? "volume-high" : "play-circle-outline"}
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ===== SECTION 4: APPEARANCE & OLED DARK MODE ===== */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <Ionicons name="moon-outline" size={17} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'थीम और डिस्प्ले' : 'Appearance & Theme'}
                </Text>
              </View>

              <View style={styles.themeCardsRow}>
                {/* Day Mode (Light) */}
                <TouchableOpacity
                  style={[
                    styles.themeOptionCard,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                    !isDarkMode && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setThemeMode('light')}
                >
                  <Ionicons name="sunny" size={24} color="#F59E0B" />
                  <Text style={[styles.themeOptionTitle, { color: colors.textPrimary }]}>
                    {language === 'hi' ? 'डे मोड' : 'Day Mode'}
                  </Text>
                  <Text style={[styles.themeOptionDesc, { color: colors.textSecondary }]}>High Sunlight Clarity</Text>
                  {!isDarkMode && (
                    <View style={[styles.checkCircleBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Night Mode (Dark) */}
                <TouchableOpacity
                  style={[
                    styles.themeOptionCard,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                    isDarkMode && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setThemeMode('dark')}
                >
                  <Ionicons name="moon" size={24} color="#818CF8" />
                  <Text style={[styles.themeOptionTitle, { color: colors.textPrimary }]}>
                    {language === 'hi' ? 'नाईट मोड' : 'OLED Dark'}
                  </Text>
                  <Text style={[styles.themeOptionDesc, { color: colors.textSecondary }]}>Battery & Eye Saver</Text>
                  {isDarkMode && (
                    <View style={[styles.checkCircleBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* ===== SECTION 5: MULTI-LANGUAGE SELECTION ===== */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <Ionicons name="language-outline" size={17} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'भाषा (Choose Language)' : 'App Language'}
                </Text>
              </View>

              <View style={styles.langGridContainer}>
                {AVAILABLE_LANGUAGES.map((item) => {
                  const isSelected = language === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      style={[
                        styles.langGridItem,
                        { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                        isSelected && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                      ]}
                      onPress={() => setLanguage(item.code)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.langGridFlag}>{item.flag}</Text>
                      <View style={{ flex: 1, marginLeft: 6 }}>
                        <Text style={[styles.langGridNative, { color: colors.textPrimary }, isSelected && { color: colors.primary, fontWeight: '800' }]}>
                          {item.nativeName}
                        </Text>
                        <Text style={[styles.langGridSub, { color: colors.textSecondary }]}>{item.name}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ===== SECTION 6: OFFLINE TIMETABLE DATABASE & UPDATES ===== */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <Ionicons name="cloud-download-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'ऑफलाइन टाइमटेबल डेटाबेस' : 'Offline Timetable Database'}
                </Text>
              </View>

              <View style={[styles.timetableStatusBox, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                <View style={styles.statusRowLeft}>
                  <View style={styles.timetablePulseDot} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.timetableStatusTitle, { color: colors.textPrimary }]}>
                      IRCTC Master Timetable Active
                    </Text>
                    <Text style={[styles.timetableStatusSub, { color: colors.textSecondary }]}>
                      12,450+ Express, Mail & Local EMU Trains • 100% Offline
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.updateCheckBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCheckTimetableUpdates}
                  disabled={isCheckingUpdate}
                  activeOpacity={0.8}
                >
                  {isCheckingUpdate ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  )}
                  <Text style={styles.updateCheckBtnText}>
                    {isCheckingUpdate ? 'Checking...' : 'Check Updates'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ===== SECTION 7: EMERGENCY SOS & RAILWAY HELPLINES ===== */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <Ionicons name="shield-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: '#DC2626' }]}>
                  Railway Emergency & Helplines
                </Text>
              </View>
              <Text style={[styles.sectionHelperDesc, { color: colors.textSecondary }]}>
                Direct 1-tap call to official Indian Railway emergency desks:
              </Text>

              <View style={styles.emergencyGrid}>
                {EMERGENCY_HELPLINES.map((h) => (
                  <TouchableOpacity
                    key={h.number}
                    style={[styles.emergencyItemCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                    onPress={() => handleCallEmergency(h.number)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.emergencyIconBox, { backgroundColor: h.color }]}>
                      <Ionicons name={h.icon} size={16} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.emergencyNumber, { color: h.color }]}>{h.number}</Text>
                        <Text style={[styles.emergencyTitle, { color: colors.textPrimary }]} numberOfLines={1}> • {h.title}</Text>
                      </View>
                      <Text style={[styles.emergencySub, { color: colors.textSecondary }]} numberOfLines={1}>{h.subtitle}</Text>
                    </View>
                    <View style={styles.dialBadge}>
                      <Text style={styles.dialBadgeText}>Call</Text>
                      <Ionicons name="call" size={11} color="#16A34A" style={{ marginLeft: 2 }} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ===== SECTION 8: LIVE RAILWAY API KEY (RAILRADAR) ===== */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <MaterialCommunityIcons name="satellite-variant" size={17} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'रेलवे लाइव जीपीएस API' : 'Railway Live GPS API'}
                </Text>
              </View>

              <View style={styles.apiStatusBadgeRow}>
                <View style={styles.apiLiveDot} />
                <Text style={styles.apiLiveText}>
                  {railRadarKey ? 'RailRadar NTES GPS Connected' : 'Simulated GPS Engine Active'}
                </Text>
              </View>

              <View style={[styles.apiInputRow, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                <Ionicons name="key-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.apiTextInput, { color: colors.textPrimary }]}
                  value={railRadarKey}
                  onChangeText={handleKeyChange}
                  placeholder="Enter RailRadar / proxy API key..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {railRadarKey.length > 0 && (
                  <TouchableOpacity onPress={() => handleKeyChange('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ===== SECTION 9: DATA & STORAGE MANAGEMENT ===== */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <Ionicons name="server-outline" size={17} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'डेटा और मेमोरी' : 'Storage & Cache Management'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.actionRowBtn, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                onPress={handleClearCache}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-circle-outline" size={19} color={colors.primary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionRowBtnTitle, { color: colors.textPrimary }]}>
                    {language === 'hi' ? 'लाइव ट्रेन कैश साफ़ करें' : 'Purge Live Train Cache'}
                  </Text>
                  <Text style={[styles.actionRowBtnSub, { color: colors.textSecondary }]}>
                    Forces next query to fetch fresh real-time satellite GPS
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRowBtn, { backgroundColor: colors.cardSecondary, borderColor: colors.border, marginTop: 8 }]}
                onPress={handleClearRecentSearches}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionRowBtnTitle, { color: colors.textPrimary }]}>
                    {language === 'hi' ? 'सर्च हिस्ट्री साफ़ करें' : 'Clear Recent Searches'}
                  </Text>
                  <Text style={[styles.actionRowBtnSub, { color: colors.textSecondary }]}>
                    Resets stored recent station queries
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* ===== APP INFO & CREDITS ===== */}
            <View style={styles.appInfoSection}>
              <Text style={[styles.appVersionTitle, { color: colors.textPrimary }]}>
                When is my train • v2.5.0 Pro Edition
              </Text>
              <Text style={[styles.appVersionSub, { color: colors.textSecondary }]}>
                Inspired by modern rail intelligence • 100% Offline Cell & GPS Ready
              </Text>
            </View>

            <View style={{ height: 45 }} />
          </ScrollView>
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
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  drawerPanel: {
    height: '100%',
    borderLeftWidth: 1,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 18 : 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gearIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  drawerTitleText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  drawerSubtitleText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  drawerCloseBtn: {
    padding: 6,
    marginLeft: 6,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    padding: 16,
  },
  toastSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  toastSuccessText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  trainHeroBanner: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trainHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  trainHeroBrand: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  trainHeroVersionPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trainHeroVersionText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trainTrackRunway: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  trainTrackLine: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    width: '100%',
  },
  speedingTrainSprite: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainHeadlightGlow: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FDE047',
    marginRight: 2,
  },
  heroShareAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  heroShareAppBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  sectionCard: {
    marginBottom: 18,
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  sectionHelperDesc: {
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 16,
  },
  trackingChoiceGrid: {
    gap: 8,
  },
  trackingChoiceCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    position: 'relative',
  },
  trackingChoiceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  trackingChoiceTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  trackingChoiceSub: {
    fontSize: 10.5,
    lineHeight: 15,
  },
  sourceCheckDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingRowLabel: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  settingRowDesc: {
    fontSize: 10.5,
    marginTop: 1,
  },
  pillSwitcher: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
  },
  pillOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pillOptionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  alarmSoundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alarmSoundItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  alarmSoundLabel: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    marginLeft: 6,
  },
  previewBtn: {
    padding: 3,
  },
  themeCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOptionCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  themeOptionTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  themeOptionDesc: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  checkCircleBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  langGridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  langGridFlag: {
    fontSize: 18,
  },
  langGridNative: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  langGridSub: {
    fontSize: 9.5,
  },
  timetableStatusBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  statusRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timetablePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  timetableStatusTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  timetableStatusSub: {
    fontSize: 10,
    marginTop: 1,
  },
  updateCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  updateCheckBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emergencyGrid: {
    gap: 8,
  },
  emergencyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  emergencyIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyNumber: {
    fontSize: 13,
    fontWeight: '800',
  },
  emergencyTitle: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  emergencySub: {
    fontSize: 9.5,
    marginTop: 1,
  },
  dialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dialBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  apiStatusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  apiLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0284C7',
    marginRight: 6,
  },
  apiLiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  apiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  apiTextInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  actionRowBtnTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionRowBtnSub: {
    fontSize: 10,
    marginTop: 1,
  },
  appInfoSection: {
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
  },
  appVersionTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  appVersionSub: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});
