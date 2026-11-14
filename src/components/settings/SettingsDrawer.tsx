import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../context/PreferencesContext';
import { AppearanceSection } from './sections/AppearanceSection';
import { LiveDataSection } from './sections/LiveDataSection';
import { AlarmsSection } from './sections/AlarmsSection';
import { StorageSection } from './sections/StorageSection';
import { HelpSection } from './sections/HelpSection';
import { AboutSection } from './sections/AboutSection';

interface SettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  isFirstLaunch?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 400);

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  visible,
  onClose,
  isFirstLaunch,
}) => {
  const { isDarkMode, colors } = usePreferences();
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // In-drawer toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastFade = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    Animated.timing(toastFade, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setToastMessage(null);
      });
    }, 2400);
  }, [toastFade]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlayContainer}>
        {/* Semi-transparent Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Slide-in Drawer Container */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0',
                  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                },
              ]}
            >
              <View style={styles.headerLeft}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="settings-sharp" size={18} color="#FFFFFF" />
                </View>
                <Text
                  style={[
                    styles.headerTitle,
                    { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
                  ]}
                >
                  Settings
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close settings"
                style={styles.closeBtn}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={isDarkMode ? '#F8FAFC' : '#0F172A'}
                />
              </TouchableOpacity>
            </View>

            {/* Scrollable Sections */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <AppearanceSection />
              <LiveDataSection onShowToast={showToast} />
              <AlarmsSection />
              <StorageSection onShowToast={showToast} />
              <HelpSection />
              <AboutSection />
              <View style={{ height: 40 }} />
            </ScrollView>

            {/* In-drawer Floating Toast */}
            {toastMessage && (
              <Animated.View
                style={[
                  styles.toast,
                  {
                    opacity: toastFade,
                    backgroundColor: isDarkMode ? '#38BDF8' : '#0284C7',
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.toastText}>{toastMessage}</Text>
              </Animated.View>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    shadowColor: '#000000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 16,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  scrollContent: {
    padding: 16,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
