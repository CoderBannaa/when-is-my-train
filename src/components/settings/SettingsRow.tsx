import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../context/PreferencesContext';

interface SettingsRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  isDestructive?: boolean;
  accessibilityLabel?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconColor = '#0284C7',
  label,
  subtitle,
  rightContent,
  onPress,
  style,
  isDestructive = false,
  accessibilityLabel,
}) => {
  const { colors, isDarkMode } = usePreferences();

  const content = (
    <View style={[styles.row, style]}>
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={20}
            color={isDestructive ? '#EF4444' : iconColor}
          />
        </View>
      )}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.label,
            { color: isDestructive ? '#EF4444' : isDarkMode ? '#F8FAFC' : '#0F172A' },
          ]}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              { color: isDarkMode ? '#94A3B8' : '#64748B' },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightContent ? (
        <View style={styles.rightContainer}>{rightContent}</View>
      ) : onPress ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDarkMode ? '#64748B' : '#94A3B8'}
        />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        style={styles.touchable}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || label}
    >
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  touchable: {
    minHeight: 48,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  rightContainer: {
    marginLeft: 10,
    alignItems: 'flex-end',
  },
});
