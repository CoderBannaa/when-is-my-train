import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../SectionCard';
import { SegmentedControl } from '../SegmentedControl';
import {
  usePreferences,
  ThemeChoice,
  TimeFormat,
  SUPPORTED_LANGUAGES,
  Language,
} from '../../../context/PreferencesContext';

export const AppearanceSection: React.FC = () => {
  const {
    themeChoice,
    setThemeChoice,
    language,
    setLanguage,
    timeFormat,
    setTimeFormat,
    isDarkMode,
  } = usePreferences();

  const themeOptions = [
    { id: 'system' as ThemeChoice, label: 'System', icon: 'phone-portrait-outline' as const },
    { id: 'light' as ThemeChoice, label: 'Light', icon: 'sunny-outline' as const },
    { id: 'dark' as ThemeChoice, label: 'Dark', icon: 'moon-outline' as const },
  ];

  const timeOptions = [
    { id: 'auto' as TimeFormat, label: 'Auto' },
    { id: '12h' as TimeFormat, label: '12h' },
    { id: '24h' as TimeFormat, label: '24h' },
  ];

  return (
    <SectionCard title="Appearance & Regional" icon="color-palette-outline">
      {/* Theme */}
      <View style={styles.subBlock}>
        <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
          Theme
        </Text>
        <SegmentedControl
          options={themeOptions}
          selectedId={themeChoice}
          onSelect={setThemeChoice}
        />
        <Text style={[styles.hintText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
          {themeChoice === 'system'
            ? 'Follows device light/dark appearance.'
            : themeChoice === 'dark'
            ? 'Dark theme always active.'
            : 'Light theme always active.'}
        </Text>
      </View>

      {/* Language */}
      <View style={styles.subBlock}>
        <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
          Language
        </Text>
        <View style={styles.langGrid}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                activeOpacity={0.75}
                onPress={() => setLanguage(lang.code as Language)}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${lang.label} (${lang.nativeLabel})`}
                style={[
                  styles.langPill,
                  {
                    backgroundColor: isSelected
                      ? '#0284C7'
                      : isDarkMode
                      ? '#0F172A'
                      : '#F1F5F9',
                    borderColor: isSelected
                      ? '#0284C7'
                      : isDarkMode
                      ? '#334155'
                      : '#E2E8F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.langName,
                    {
                      color: isSelected
                        ? '#FFFFFF'
                        : isDarkMode
                        ? '#F8FAFC'
                        : '#0F172A',
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {lang.label}
                </Text>
                <Text
                  style={[
                    styles.langNative,
                    {
                      color: isSelected
                        ? '#E0F2FE'
                        : isDarkMode
                        ? '#94A3B8'
                        : '#64748B',
                    },
                  ]}
                >
                  {lang.nativeLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Time Format */}
      <View style={[styles.subBlock, { marginBottom: 0 }]}>
        <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
          Time Format
        </Text>
        <SegmentedControl
          options={timeOptions}
          selectedId={timeFormat}
          onSelect={setTimeFormat}
        />
        <Text style={[styles.hintText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
          {timeFormat === 'auto'
            ? 'Auto: 12-hour for search results, 24-hour for live tracker.'
            : timeFormat === '12h'
            ? 'All times displayed in 12-hour AM/PM format.'
            : 'All times displayed in 24-hour railway format.'}
        </Text>
      </View>
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  subBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  hintText: {
    fontSize: 11,
    marginTop: 5,
    lineHeight: 15,
  },
  langGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  langPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  langName: {
    fontSize: 14,
  },
  langNative: {
    fontSize: 11,
    marginTop: 2,
  },
});
