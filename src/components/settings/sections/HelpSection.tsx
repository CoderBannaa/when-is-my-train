import React from 'react';
import { Linking, Alert } from 'react-native';
import { SectionCard } from '../SectionCard';
import { SettingsRow } from '../SettingsRow';

export const HelpSection: React.FC = () => {
  const handleCall = async (purpose: string) => {
    const url = 'tel:139';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Helpline 139', `Please dial 139 directly for ${purpose}.`);
      }
    } catch {
      Alert.alert('Helpline 139', `Please dial 139 directly for ${purpose}.`);
    }
  };

  return (
    <SectionCard title="Help & Support" icon="call-outline">
      <SettingsRow
        icon="call"
        iconColor="#16A34A"
        label="Railway Helpline (139)"
        subtitle="General passenger enquiry & train PNR status"
        onPress={() => handleCall('General Enquiry')}
      />
      <SettingsRow
        icon="medkit"
        iconColor="#EF4444"
        label="Medical Emergency (139)"
        subtitle="Prompt medical assistance onboard trains and stations"
        onPress={() => handleCall('Medical Emergency')}
      />
      <SettingsRow
        icon="shield-checkmark"
        iconColor="#0284C7"
        label="Security & RPF (139)"
        subtitle="Railway Protection Force emergency support"
        onPress={() => handleCall('Security & RPF')}
      />
    </SectionCard>
  );
};
