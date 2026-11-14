import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../SectionCard';
import { usePreferences } from '../../../context/PreferencesContext';
import { TrainData } from '../../../services/trainDataService';

interface LiveDataSectionProps {
  onShowToast: (msg: string) => void;
}

export const LiveDataSection: React.FC<LiveDataSectionProps> = ({ onShowToast }) => {
  const { railRadarApiKey, setRailRadarApiKey, isDarkMode } = usePreferences();
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Health data from TrainData singleton
  const health = TrainData.getHealth();

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    setRailRadarApiKey(trimmed);
    setKeyInput('');
    setIsEditing(false);
    onShowToast('Key saved on this device');
  };

  const handleRemoveKey = () => {
    setRailRadarApiKey('');
    setKeyInput('');
    setIsEditing(false);
    onShowToast('Key removed');
  };

  const getMaskedKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 4) return '••••' + key;
    return '••••••••' + key.slice(-4);
  };

  return (
    <SectionCard title="Live Data & API" icon="server-outline">
      {/* RailRadar API Key */}
      <View style={styles.subBlock}>
        <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
          RailRadar API Key
        </Text>

        {railRadarApiKey && !isEditing ? (
          <View
            style={[
              styles.savedKeyBox,
              {
                backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                borderColor: isDarkMode ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.savedKeyLeft}>
              <Ionicons name="key" size={16} color="#0284C7" style={{ marginRight: 8 }} />
              <Text
                style={[
                  styles.maskedKeyText,
                  { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
                ]}
              >
                {getMaskedKey(railRadarApiKey)}
              </Text>
            </View>
            <View style={styles.savedKeyActions}>
              <TouchableOpacity
                onPress={() => {
                  setKeyInput(railRadarApiKey);
                  setIsEditing(true);
                }}
                style={styles.actionBtnSmall}
              >
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRemoveKey}
                style={[styles.actionBtnSmall, { marginLeft: 8 }]}
              >
                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                  borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
                ]}
                placeholder="Enter API key"
                placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                value={keyInput}
                onChangeText={setKeyInput}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowKey(!showKey)}
                style={styles.eyeBtn}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={showKey ? 'Hide key' : 'Show key'}
              >
                <Ionicons
                  name={showKey ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={isDarkMode ? '#94A3B8' : '#64748B'}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={handleSaveKey}
                disabled={!keyInput.trim()}
                style={[
                  styles.saveBtn,
                  { opacity: keyInput.trim() ? 1 : 0.5 },
                ]}
              >
                <Text style={styles.saveBtnText}>Save Key</Text>
              </TouchableOpacity>
              {isEditing && (
                <TouchableOpacity
                  onPress={() => {
                    setIsEditing(false);
                    setKeyInput('');
                  }}
                  style={styles.cancelBtn}
                >
                  <Text style={[styles.cancelBtnText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <Text style={[styles.hintText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
          Optional. Free key from railradar.in for higher rate limits.
        </Text>
      </View>

      {/* Data Sources Health Card */}
      <View
        style={[
          styles.healthCard,
          {
            backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9',
            borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <Text style={[styles.healthTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
          Provider Fallback Chains
        </Text>

        {/* Search Chain */}
        <View style={styles.chainRow}>
          <Text style={[styles.chainLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            Search: Direct (eRail) → Proxy → RailRadar API
          </Text>
        </View>

        {/* Live Chain */}
        <View style={styles.chainRow}>
          <Text style={[styles.chainLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            Live: RailYatri Scraper → Proxy → RailRadar API
          </Text>
        </View>

        {/* Live Providers Health Status */}
        <View style={styles.statusList}>
          {health.liveProviders.map((p, idx) => (
            <View key={idx} style={styles.statusItem}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: p.status === 'OK' ? '#16A34A' : '#EF4444' },
                ]}
              />
              <Text style={[styles.providerName, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                {p.name}:
              </Text>
              <Text
                style={[
                  styles.providerStatus,
                  { color: p.status === 'OK' ? '#16A34A' : '#EF4444' },
                ]}
              >
                {' '}{p.status}
              </Text>
            </View>
          ))}
        </View>

        {health.lastSuccessfulProvider && (
          <Text style={[styles.lastSuccessText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
            Last successful: {health.lastSuccessfulProvider}
            {health.lastSuccessTimestamp
              ? ` (${Math.round((Date.now() - health.lastSuccessTimestamp) / 1000)}s ago)`
              : ''}
          </Text>
        )}
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
  savedKeyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  savedKeyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  maskedKeyText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  savedKeyActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnSmall: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 42,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
  healthCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  healthTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chainRow: {
    marginBottom: 4,
  },
  chainLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#94A3B840',
    gap: 4,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  providerName: {
    fontSize: 12,
    fontWeight: '600',
  },
  providerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastSuccessText: {
    fontSize: 11,
    marginTop: 6,
  },
});
