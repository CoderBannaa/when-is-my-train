import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../context/PreferencesContext';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  accentColor?: string;
}

export function SegmentedControl<T extends string>({
  options,
  selectedId,
  onSelect,
  accentColor = '#0284C7',
}: SegmentedControlProps<T>) {
  const { isDarkMode } = usePreferences();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9',
          borderColor: isDarkMode ? '#334155' : '#E2E8F0',
        },
      ]}
    >
      {options.map((opt) => {
        const isSelected = opt.id === selectedId;
        return (
          <TouchableOpacity
            key={opt.id}
            activeOpacity={0.8}
            onPress={() => onSelect(opt.id)}
            accessible={true}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={opt.label}
            style={[
              styles.segment,
              isSelected && {
                backgroundColor: accentColor,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
          >
            {opt.icon && (
              <Ionicons
                name={opt.icon}
                size={14}
                color={
                  isSelected
                    ? '#FFFFFF'
                    : isDarkMode
                    ? '#94A3B8'
                    : '#64748B'
                }
                style={styles.icon}
              />
            )}
            <Text
              style={[
                styles.label,
                {
                  color: isSelected
                    ? '#FFFFFF'
                    : isDarkMode
                    ? '#94A3B8'
                    : '#64748B',
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    marginVertical: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 7,
    minHeight: 38,
  },
  icon: {
    marginRight: 5,
  },
  label: {
    fontSize: 13,
  },
});
