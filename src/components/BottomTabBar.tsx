import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../context/PreferencesContext';

export type TabKey = 'home' | 'live' | 'pnr' | 'schedule';

interface BottomTabBarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onSelectTab }) => {
  const { colors, t } = usePreferences();

  const tabs: { key: TabKey; label: string; iconName: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'home', label: t('tabHome'), iconName: 'search-outline', activeIcon: 'search' },
    { key: 'live', label: t('tabLive'), iconName: 'navigate-outline', activeIcon: 'navigate' },
    { key: 'pnr', label: t('tabPnr'), iconName: 'receipt-outline', activeIcon: 'receipt' },
    { key: 'schedule', label: t('tabSchedule'), iconName: 'calendar-outline', activeIcon: 'calendar' },
  ];

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => onSelectTab(tab.key)}
          >
            <View style={[styles.iconWrapper, isActive && { backgroundColor: colors.primarySoft }]}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.iconName}
                size={22}
                color={isActive ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={[styles.tabLabel, { color: colors.textSecondary }, isActive && { color: colors.primary, fontWeight: '800' }]}>
              {tab.label}
            </Text>
            {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
    position: 'relative',
  },
  iconWrapper: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  activeIconWrapper: {
    backgroundColor: Colors.primarySoft,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activeTabLabel: {
    color: Colors.primary,
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});
