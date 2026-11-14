import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { usePreferences } from '../context/PreferencesContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  onNotificationPress?: () => void;
  onOpenPreferences?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = "When is my train", 
  subtitle = "IRCTC & Live GPS Tracking",
  showBack = false,
  onBack,
  onOpenPreferences,
}) => {
  const { isDarkMode } = usePreferences();

  return (
    <View style={[styles.headerContainer, { backgroundColor: isDarkMode ? '#0F172A' : Colors.primary }]}>
      <View style={styles.leftSection}>
        {showBack ? (
          <View style={styles.childHeaderRow}>
            <TouchableOpacity 
              style={styles.backBtn} 
              activeOpacity={0.7} 
              onPress={onBack}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.childTitleWrapper}>
              <Text style={styles.childTitle} numberOfLines={1}>{title}</Text>
              {subtitle ? (
                <Text style={styles.childSubtitle} numberOfLines={1}>{subtitle}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          /* Stylish Mobile Branding: Sleek Train Badge + Styled Two-Tone Typography */
          <View style={styles.brandContainer}>
            <View style={styles.brandIconWrapper}>
              <MaterialCommunityIcons name="train" size={21} color="#FFFFFF" />
            </View>
            <View style={styles.brandTextCol}>
              <View style={styles.titleRow}>
                <Text style={styles.brandPrefix}>When is my </Text>
                <Text style={styles.brandSuffix}>Train</Text>
              </View>
              <View style={styles.liveTagRow}>
                <View style={styles.liveHeaderDot} />
                <Text style={styles.brandLiveTag}>LIVE GPS & IRCTC</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.rightSection}>
        {/* Settings Button */}
        {onOpenPreferences && (
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={onOpenPreferences}
          >
            <Ionicons name="settings-sharp" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 34 : 14,
    paddingBottom: 13,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  childHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  childTitleWrapper: {
    justifyContent: 'center',
    flex: 1,
  },
  childTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  childSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#BAE6FD',
    marginTop: 1,
    letterSpacing: 0.3,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandPrefix: {
    fontSize: 18.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.94)',
    letterSpacing: -0.2,
  },
  brandSuffix: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  brandLiveTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#BAE6FD',
    letterSpacing: 0.8,
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  liveHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginRight: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
});
