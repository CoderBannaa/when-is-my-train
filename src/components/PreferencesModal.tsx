import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePreferences, Language, ThemeMode } from '../context/PreferencesContext';

interface PreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  isFirstLaunch?: boolean;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  visible,
  onClose,
  isFirstLaunch = false,
}) => {
  const { language, setLanguage, isDarkMode, setThemeMode, colors, t } = usePreferences();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {isFirstLaunch ? t('welcomeTitle') : t('selectLanguage')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('welcomeSubtitle')}
              </Text>
            </View>
            {!isFirstLaunch && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Section 1: Language Selection (English vs हिन्दी) */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              🌐 {t('selectLanguage')}
            </Text>
            <View style={styles.optionsRow}>
              {/* English Pill */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  language === 'en' && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                ]}
                activeOpacity={0.8}
                onPress={() => setLanguage('en')}
              >
                <Text style={styles.flagIcon}>🇬🇧</Text>
                <Text style={[styles.optionMainText, { color: colors.textPrimary }]}>English</Text>
                <Text style={[styles.optionSubText, { color: colors.textSecondary }]}>Default</Text>
                {language === 'en' && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Hindi Pill */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  language === 'hi' && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                ]}
                activeOpacity={0.8}
                onPress={() => setLanguage('hi')}
              >
                <Text style={styles.flagIcon}>🇮🇳</Text>
                <Text style={[styles.optionMainText, { color: colors.textPrimary }]}>हिन्दी</Text>
                <Text style={[styles.optionSubText, { color: colors.textSecondary }]}>Hindi</Text>
                {language === 'hi' && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 2: Theme Selection (Day Mode vs Night Mode) */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              🌓 {t('selectTheme')}
            </Text>
            <View style={styles.optionsRow}>
              {/* Day Mode (Light) */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  !isDarkMode && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                ]}
                activeOpacity={0.8}
                onPress={() => setThemeMode('light')}
              >
                <Ionicons name="sunny" size={26} color="#F59E0B" />
                <Text style={[styles.optionMainText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'डे मोड' : 'Day Mode'}
                </Text>
                <Text style={[styles.optionSubText, { color: colors.textSecondary }]}>Light</Text>
                {!isDarkMode && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Night Mode (Dark) */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  isDarkMode && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                ]}
                activeOpacity={0.8}
                onPress={() => setThemeMode('dark')}
              >
                <Ionicons name="moon" size={26} color="#818CF8" />
                <Text style={[styles.optionMainText, { color: colors.textPrimary }]}>
                  {language === 'hi' ? 'नाईट मोड' : 'Night Mode'}
                </Text>
                <Text style={[styles.optionSubText, { color: colors.textSecondary }]}>Dark (OLED)</Text>
                {isDarkMode && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Save / Continue Button */}
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: colors.searchBtnGreen }]}
            activeOpacity={0.85}
            onPress={onClose}
          >
            <Text style={styles.continueBtnText}>{t('continueBtn')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  flagIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  optionMainText: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  optionSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  checkCircle: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    elevation: 3,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
