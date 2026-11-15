import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../context/PreferencesContext';

interface SectionCardProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  children,
  style,
}) => {
  const { colors, isDarkMode } = usePreferences();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          borderColor: isDarkMode ? '#334155' : '#E2E8F0',
        },
        style,
      ]}
    >
      <View style={styles.header}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color="#0284C7"
            style={styles.headerIcon}
          />
        )}
        <Text style={[styles.title, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
          {title}
        </Text>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
});

