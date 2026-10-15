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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePreferences } from '../context/PreferencesContext';
import { LiveTrainApi, TrainCache } from '../services/liveTrainApiService';
import { SafeStorage } from '../context/PreferencesContext';

interface PreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  isFirstLaunch?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(380, SCREEN_WIDTH * 0.88);

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  visible,
  onClose,
  isFirstLaunch = false,
}) => {
  const { language, setLanguage, isDarkMode, setThemeMode, colors, t } = usePreferences();
  const [railRadarKey, setRailRadarKey] = useState(LiveTrainApi.getRailRadarApiKey());

  // Travel Alert switches
  const [arrivalAlerts, setArrivalAlerts] = useState(true);
  const [delayAlerts, setDelayAlerts] = useState(true);
  const [vibrateSound, setVibrateSound] = useState(true);
  const [cacheClearMsg, setCacheClearMsg] = useState<string | null>(null);

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
      const shareMsg = `🚆 Track any Indian Railway train live with real-time GPS, coach position, delay alerts, and offline schedule with 'When Is My Train'!\nOpen here: ${shareUrl}`;

      if (Platform.OS !== 'web' && Share && Share.share) {
        await Share.share({
          message: shareMsg,
          title: 'When Is My Train - Live GPS Tracking',
        });
      } else if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: 'When Is My Train',
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
                  {language === 'hi' ? 'सेटिंग्स' : 'Settings'}
                </Text>
                <Text style={[styles.drawerSubtitleText, { color: colors.textSecondary }]}>
                  {language === 'hi' ? 'अनुभव और प्राथमिकताएं' : 'Customise preferences'}
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

            {/* ===== TOP 1-INCH HERO BANNER: SPEEDING TRAIN & VERSION (MAST ANIMATION) ===== */}
            <View style={[styles.trainHeroBanner, { backgroundColor: isDarkMode ? '#0F172A' : '#005A9C', borderColor: colors.border }]}>
              {/* Top row: Brand & Version */}
              <View style={styles.trainHeroTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="train" size={20} color="#38BDF8" style={{ marginRight: 6 }} />
                  <Text style={styles.trainHeroBrand}>When is my train</Text>
                </View>
                <View style={styles.trainHeroVersionPill}>
                  <Text style={styles.trainHeroVersionText}>v2.4.0 Express</Text>
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
                  {language === 'hi' ? 'ऐप शेयर करें (Share App)' : 'Share App with Friends'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* SECTION 1: APPEARANCE & DARK MODE */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <Ionicons name="moon-outline" size={17} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'डिस्प्ले और थीम' : 'Appearance & Theme'}
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
                    {language === 'hi' ? 'डे मोड' : 'Light Mode'}
                  </Text>
                  <Text style={[styles.themeOptionDesc, { color: colors.textSecondary }]}>Daytime</Text>
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
                    {language === 'hi' ? 'नाईट मोड' : 'Dark Mode'}
                  </Text>
                  <Text style={[styles.themeOptionDesc, { color: colors.textSecondary }]}>OLED Saver</Text>
                  {isDarkMode && (
                    <View style={[styles.checkCircleBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* SECTION 2: LANGUAGE SELECTION */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <Ionicons name="language-outline" size={17} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'भाषा (Language)' : 'App Language'}
                </Text>
              </View>

              <View style={styles.langCardsRow}>
                {/* English */}
                <TouchableOpacity
                  style={[
                    styles.langCardItem,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                    language === 'en' && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setLanguage('en')}
                >
                  <Text style={styles.flagEmoji}>🇬🇧</Text>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.langNameText, { color: colors.textPrimary }]}>English</Text>
                    <Text style={[styles.langSubText, { color: colors.textSecondary }]}>Default</Text>
                  </View>
                  {language === 'en' && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>

                {/* Hindi */}
                <TouchableOpacity
                  style={[
                    styles.langCardItem,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                    language === 'hi' && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setLanguage('hi')}
                >
                  <Text style={styles.flagEmoji}>🇮🇳</Text>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.langNameText, { color: colors.textPrimary }]}>हिन्दी</Text>
                    <Text style={[styles.langSubText, { color: colors.textSecondary }]}>Hindi</Text>
                  </View>
                  {language === 'hi' && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* SECTION 3: SHARE APP CARD (PROMINENT SHARING SECTION) */}
            <View style={[styles.sectionCard, styles.shareAppCard, { borderColor: isDarkMode ? '#0284C7' : '#BAE6FD', backgroundColor: isDarkMode ? '#0F172A' : '#F0F9FF' }]}>
              <View style={styles.shareCardHeader}>
                <View style={[styles.shareIconCircle, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E0F2FE' }]}>
                  <Ionicons name="share-social-outline" size={20} color="#007AFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.shareCardTitle, { color: colors.textPrimary }]}>
                    {language === 'hi' ? 'यात्रियों के साथ ऐप शेयर करें' : 'Share with Co-Passengers'}
                  </Text>
                  <Text style={[styles.shareCardDesc, { color: colors.textSecondary }]}>
                    {language === 'hi' ? 'लाइव ट्रेन ट्रैकिंग व कोच पोज़ीशन शेयर करें' : 'Help friends track live trains & delays'}
                  </Text>
                </View>
              </View>

              <View style={styles.shareCardBtnRow}>
                <TouchableOpacity
                  style={styles.shareActionPrimaryBtn}
                  onPress={handleShareApp}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.shareActionPrimaryBtnText}>
                    {language === 'hi' ? 'शेयर करें (Share)' : 'Share App'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shareActionSecondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={handleShareApp}
                  activeOpacity={0.75}
                >
                  <Ionicons name="copy-outline" size={15} color={colors.primary} style={{ marginRight: 5 }} />
                  <Text style={[styles.shareActionSecondaryBtnText, { color: colors.primary }]}>
                    {language === 'hi' ? 'कॉपी लिंक' : 'Copy Link'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SECTION 4: TRAVEL ALERTS & NOTIFICATIONS */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <Ionicons name="notifications-outline" size={17} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'अलर्ट और सूचनाएं' : 'Alerts & Notifications'}
                </Text>
              </View>

              <View style={[styles.settingRowItem, { borderBottomColor: colors.borderLight }]}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.settingRowLabel, { color: colors.textPrimary }]}>
                    {language === 'hi' ? 'स्टेशन आगमन अलार्म (15 मिनट पूर्व)' : 'Arrival Alert (15 min prior)'}
                  </Text>
                  <Text style={[styles.settingRowDesc, { color: colors.textSecondary }]}>
                    {language === 'hi' ? 'पहुंचने से पहले रिंग करेगा' : 'Wake-up ring before destination'}
                  </Text>
                </View>
                <Switch
                  value={arrivalAlerts}
                  onValueChange={setArrivalAlerts}
                  trackColor={{ false: '#64748B', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.settingRowItem, { borderBottomColor: colors.borderLight }]}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.settingRowLabel, { color: colors.textPrimary }]}>
                    {language === 'hi' ? 'लाइव देरी और डायवर्जन अलर्ट' : 'Train Delay Alerts'}
                  </Text>
                  <Text style={[styles.settingRowDesc, { color: colors.textSecondary }]}>
                    {language === 'hi' ? '15+ मिनट देरी होने पर सूचना' : 'Notifies if delay exceeds 15 mins'}
                  </Text>
                </View>
                <Switch
                  value={delayAlerts}
                  onValueChange={setDelayAlerts}
                  trackColor={{ false: '#64748B', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingRowItem}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.settingRowLabel, { color: colors.textPrimary }]}>
                    {language === 'hi' ? 'वाइब्रेशन और साउंड' : 'Vibrate & High Sound'}
                  </Text>
                  <Text style={[styles.settingRowDesc, { color: colors.textSecondary }]}>
                    {language === 'hi' ? 'स्टेशन पर लाउड रिंग' : 'Loud alarm even in silent mode'}
                  </Text>
                </View>
                <Switch
                  value={vibrateSound}
                  onValueChange={setVibrateSound}
                  trackColor={{ false: '#64748B', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* SECTION 4: RAILWAY API (RAILRADAR) */}
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

              <Text style={[styles.apiHelpHint, { color: colors.textSecondary }]}>
                {language === 'hi'
                  ? 'अपनी RailRadar.in API key डालें या डिफ़ॉल्ट प्रयोग करें:'
                  : 'RailRadar.in API key for real-time tracking:'}
              </Text>

              <View style={[styles.apiInputRow, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                <Ionicons name="key-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.apiTextInput, { color: colors.textPrimary }]}
                  value={railRadarKey}
                  onChangeText={handleKeyChange}
                  placeholder="rg_07900dce088c4..."
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

            {/* SECTION 5: DATA & STORAGE MANAGEMENT */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderLine}>
                <Ionicons name="server-outline" size={17} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'डेटा और मेमोरी' : 'Storage & Cache'}
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
                    {language === 'hi' ? '10-मिनट लाइव ट्रेन कैश साफ़ करें' : 'Purge Live Train Cache'}
                  </Text>
                  <Text style={[styles.actionRowBtnSub, { color: colors.textSecondary }]}>
                    {language === 'hi' ? 'ताज़ा डेटा तुरंत फ़ेच करने के लिए' : 'Forces next query to fetch fresh GPS'}
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
                    {language === 'hi' ? 'स्टोर किए गए हालिया स्टेशन रीसेट' : 'Resets stored station searches'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* SECTION 6: APP INFO */}
            <View style={styles.appInfoSection}>
              <Text style={[styles.appVersionTitle, { color: colors.textPrimary }]}>
                When is my train • v2.4.0
              </Text>
              <Text style={[styles.appVersionSub, { color: colors.textSecondary }]}>
                CRIS & IRCTC Corridor Edition • 100% Offline Ready
              </Text>
            </View>

            <View style={{ height: 40 }} />
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
    fontSize: 16.5,
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
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  toastSuccessText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.1,
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
  langCardsRow: {
    flexDirection: 'column',
    gap: 8,
  },
  langCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  flagEmoji: {
    fontSize: 22,
  },
  langNameText: {
    fontSize: 13,
    fontWeight: '800',
  },
  langSubText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  settingRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  settingRowLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  settingRowDesc: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  apiStatusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  apiLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  apiLiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  apiHelpHint: {
    fontSize: 10.5,
    marginBottom: 6,
  },
  apiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  apiTextInput: {
    flex: 1,
    fontSize: 11.5,
    paddingVertical: 0,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionRowBtnTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRowBtnSub: {
    fontSize: 10,
    marginTop: 1,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  appVersionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  appVersionSub: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  // Top 1-Inch Train Hero Banner & Animation
  trainHeroBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  trainHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trainHeroBrand: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  trainHeroVersionPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  trainHeroVersionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.3,
  },
  trainTrackRunway: {
    height: 30,
    position: 'relative',
    justifyContent: 'center',
    marginVertical: 6,
  },
  trainTrackLine: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 1,
  },
  speedingTrainSprite: {
    position: 'absolute',
    top: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainHeadlightGlow: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FDE047',
    marginRight: 2,
    shadowColor: '#FDE047',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  heroShareAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  heroShareAppBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  // Share App Section Card
  shareAppCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  shareCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  shareCardDesc: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  shareCardBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  shareActionPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareActionPrimaryBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shareActionSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareActionSecondaryBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});

