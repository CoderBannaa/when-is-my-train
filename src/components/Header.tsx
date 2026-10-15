import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  onNotificationPress,
  onOpenPreferences,
}) => {
  const { language, setLanguage, isDarkMode, toggleTheme, t } = usePreferences();

  const handleToggleLang = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  return (
    <View style={[styles.headerContainer, { backgroundColor: isDarkMode ? '#0F172A' : Colors.primary }]}>
      <View style={styles.leftSection}>
        {showBack ? (
          <TouchableOpacity 
            style={styles.backBtn} 
            activeOpacity={0.7} 
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="train" size={24} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.titleWrapper}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {showBack ? t('tapToBack') : subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Settings Button */}
        {onOpenPreferences && (
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={onOpenPreferences}
          >
            <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleWrapper: {
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  langPillBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  alertDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FACC15',
  },
});
