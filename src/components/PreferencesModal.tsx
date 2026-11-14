import React from 'react';
import { SettingsDrawer } from './settings/SettingsDrawer';

interface PreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  isFirstLaunch?: boolean;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = (props) => {
  return <SettingsDrawer {...props} />;
};

export default PreferencesModal;
