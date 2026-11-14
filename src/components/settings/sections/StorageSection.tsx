import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SectionCard } from '../SectionCard';
import { SettingsRow } from '../SettingsRow';
import { usePreferences, SafeStorage } from '../../../context/PreferencesContext';
import { TrainData } from '../../../services/trainDataService';
import { SavedTrainsStore } from '../../../utils/savedTrainsStore';
import { STORAGE_KEYS } from '../../../config/env';

interface StorageSectionProps {
  onShowToast: (msg: string) => void;
}

export const StorageSection: React.FC<StorageSectionProps> = ({ onShowToast }) => {
  const { incrementHistoryVersion } = usePreferences();
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const count = await TrainData.clearCache();
      onShowToast(`Cleared ${count} cached items`);
    } catch {
      onShowToast('Cache cleared');
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleClearRecentHistory = async () => {
    setIsClearingHistory(true);
    try {
      // 1. Remove recent searches
      await SafeStorage.removeItem(STORAGE_KEYS.USER_RECENT_SEARCHES);
      // 2. Clear unpinned recents from saved trains store
      await SavedTrainsStore.clearUnpinnedRecents();
      // 3. Notify HomeScreen and components via historyVersion
      incrementHistoryVersion();
      onShowToast('Cleared search & recent trains history');
    } catch {
      onShowToast('History cleared');
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleClearSavedTrains = () => {
    Alert.alert(
      'Clear Saved Trains?',
      'This will remove all your starred and bookmarked trains. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await SavedTrainsStore.clearAllSaved();
              incrementHistoryVersion();
              onShowToast('Saved trains cleared');
            } catch {
              onShowToast('Could not clear saved trains');
            }
          },
        },
      ]
    );
  };

  return (
    <SectionCard title="Data & Storage" icon="trash-outline">
      {/* Clear cached train data */}
      <SettingsRow
        icon="refresh-circle-outline"
        label="Clear cached train data"
        subtitle="Removes offline train timetable and live tracking caches"
        onPress={handleClearCache}
        rightContent={isClearingCache ? <ActivityIndicator size="small" color="#0284C7" /> : undefined}
      />

      {/* Clear recent searches & recent trains */}
      <SettingsRow
        icon="time-outline"
        label="Clear search history & recents"
        subtitle="Removes recent station searches and unpinned viewed trains"
        onPress={handleClearRecentHistory}
        rightContent={isClearingHistory ? <ActivityIndicator size="small" color="#0284C7" /> : undefined}
      />

      {/* Clear saved trains */}
      <SettingsRow
        icon="bookmark-outline"
        iconColor="#EF4444"
        label="Clear saved trains"
        subtitle="Removes all starred/pinned trains"
        onPress={handleClearSavedTrains}
        isDestructive={true}
      />
    </SectionCard>
  );
};
