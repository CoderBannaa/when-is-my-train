import React from 'react';
import { View, Text, StyleSheet, Linking, Share, Alert } from 'react-native';
import { SectionCard } from '../SectionCard';
import { SettingsRow } from '../SettingsRow';
import { usePreferences } from '../../../context/PreferencesContext';

const REPO_URL = 'https://github.com/CoderBannaa/when-is-my-train';
const ISSUES_URL = 'https://github.com/CoderBannaa/when-is-my-train/issues/new';
const APP_VERSION = '1.0.0';

export const AboutSection: React.FC = () => {
  const { isDarkMode } = usePreferences();

  const handleOpenUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Link Error', `Could not open link: ${url}`);
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: `When is my train - live train status, trains between stations and PNR for Indian Railways. ${REPO_URL}`,
      });
    } catch {}
  };

  return (
    <SectionCard title="About & Community" icon="information-circle-outline">
      {/* App Version Row */}
      <View style={styles.versionRow}>
        <Text style={[styles.appName, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
          When is my Train
        </Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v{APP_VERSION}</Text>
        </View>
      </View>

      {/* GitHub Issue */}
      <SettingsRow
        icon="bug-outline"
        label="Report a problem / suggest feature"
        subtitle="Open an issue on GitHub"
        onPress={() => handleOpenUrl(ISSUES_URL)}
      />

      {/* GitHub Repo */}
      <SettingsRow
        icon="logo-github"
        iconColor={isDarkMode ? '#F8FAFC' : '#0F172A'}
        label="Star the project on GitHub"
        subtitle="github.com/CoderBannaa/when-is-my-train"
        onPress={() => handleOpenUrl(REPO_URL)}
      />

      {/* Share App */}
      <SettingsRow
        icon="share-social-outline"
        label="Share App"
        subtitle="Share with family and fellow passengers"
        onPress={handleShareApp}
      />

      {/* Disclaimer */}
      <View
        style={[
          styles.disclaimerBox,
          {
            backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
            borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <Text style={[styles.disclaimerText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
          Unofficial app. Data from public IRCTC / NTES / RailRadar endpoints. Not affiliated with CRIS or Ministry of Railways.
        </Text>
      </View>
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#94A3B840',
    marginBottom: 4,
  },
  appName: {
    fontSize: 15,
    fontWeight: '700',
  },
  versionBadge: {
    backgroundColor: '#0284C720',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  disclaimerBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
