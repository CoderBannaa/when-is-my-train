/**
 * alarmStore.ts
 * Foreground station wake-up alarm persistence and state manager.
 * Persists one active alarm per train via SafeStorage.
 */

import { SafeStorage } from '../context/PreferencesContext';

export type AlarmMode = '10m' | '15m' | '30m' | '5km' | '10km';

export interface SavedAlarm {
  trainNumber: string;
  stationCode: string;
  stationName: string;
  mode: AlarmMode;
  createdAt: number;
  fired?: boolean;
}

const STORAGE_KEY_ACTIVE_ALARMS = '@active_alarms';

export const AlarmStore = {
  /**
   * Retrieves all currently registered alarms
   */
  async getAllAlarms(): Promise<Record<string, SavedAlarm>> {
    try {
      const raw = await SafeStorage.getItem(STORAGE_KEY_ACTIVE_ALARMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {}
    return {};
  },

  /**
   * Retrieves active alarm for a specific train
   */
  async getAlarmForTrain(trainNumber: string): Promise<SavedAlarm | null> {
    const cleanNo = (trainNumber || '').trim().replace(/\D/g, '');
    if (!cleanNo) return null;
    const all = await this.getAllAlarms();
    return all[cleanNo] || null;
  },

  /**
   * Sets or replaces active alarm for a train
   */
  async saveAlarm(alarm: SavedAlarm): Promise<void> {
    const cleanNo = (alarm.trainNumber || '').trim().replace(/\D/g, '');
    if (!cleanNo) return;
    const all = await this.getAllAlarms();
    all[cleanNo] = {
      ...alarm,
      trainNumber: cleanNo,
      createdAt: alarm.createdAt || Date.now(),
      fired: false,
    };
    await SafeStorage.setItem(STORAGE_KEY_ACTIVE_ALARMS, JSON.stringify(all));
  },

  /**
   * Clears/cancels active alarm for a train
   */
  async clearAlarm(trainNumber: string): Promise<void> {
    const cleanNo = (trainNumber || '').trim().replace(/\D/g, '');
    if (!cleanNo) return;
    const all = await this.getAllAlarms();
    if (all[cleanNo]) {
      delete all[cleanNo];
      await SafeStorage.setItem(STORAGE_KEY_ACTIVE_ALARMS, JSON.stringify(all));
    }
  },

  /**
   * Marks an alarm as fired so it doesn't trigger repeatedly
   */
  async markAlarmFired(trainNumber: string): Promise<void> {
    const cleanNo = (trainNumber || '').trim().replace(/\D/g, '');
    if (!cleanNo) return;
    const all = await this.getAllAlarms();
    if (all[cleanNo]) {
      all[cleanNo].fired = true;
      await SafeStorage.setItem(STORAGE_KEY_ACTIVE_ALARMS, JSON.stringify(all));
    }
  },
};

