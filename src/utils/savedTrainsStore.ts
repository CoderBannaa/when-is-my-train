/**
 * savedTrainsStore.ts
 * Manages the single unified "Saved & Recent" trains store.
 * Automatically migrates legacy string[] formats to structured SavedRecentTrain objects on read.
 */

import { SafeStorage } from '../context/PreferencesContext';
import { STORAGE_KEYS } from '../config/env';

export interface SavedRecentTrain {
  number: string;
  name: string;
  fromCode?: string;
  toCode?: string;
  savedAt?: number;
  lastViewedAt: number;
  isSaved: boolean;
}

export const SavedTrainsStore = {
  /**
   * Retrieves the unified list with saved trains pinned first, then by lastViewedAt descending.
   * Migrates legacy string[] data on read.
   */
  async getUnifiedList(): Promise<SavedRecentTrain[]> {
    try {
      const raw = await SafeStorage.getItem(STORAGE_KEYS.SAVED_TRAINS);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      let migrated = false;
      const list: SavedRecentTrain[] = [];

      for (const item of parsed) {
        if (typeof item === 'string') {
          // Legacy string migration
          migrated = true;
          list.push({
            number: item,
            name: `Train ${item}`,
            lastViewedAt: Date.now(),
            savedAt: Date.now(),
            isSaved: true,
          });
        } else if (item && typeof item === 'object' && item.number) {
          list.push({
            number: String(item.number),
            name: item.name || `Train ${item.number}`,
            fromCode: item.fromCode,
            toCode: item.toCode,
            savedAt: item.savedAt,
            lastViewedAt: item.lastViewedAt || Date.now(),
            isSaved: Boolean(item.isSaved),
          });
        }
      }

      if (migrated) {
        // Persist migrated format back
        await SafeStorage.setItem(STORAGE_KEYS.SAVED_TRAINS, JSON.stringify(list));
      }

      // Sort: isSaved === true pinned to top, then by lastViewedAt descending
      return list.sort((a, b) => {
        if (a.isSaved && !b.isSaved) return -1;
        if (!a.isSaved && b.isSaved) return 1;
        return (b.lastViewedAt || 0) - (a.lastViewedAt || 0);
      });
    } catch {
      return [];
    }
  },

  /**
   * Checks if a train is marked as saved/starred
   */
  async isTrainSaved(trainNumber: string): Promise<boolean> {
    const cleanNo = (trainNumber || '').trim().replace(/\D/g, '');
    const list = await this.getUnifiedList();
    const found = list.find((t) => t.number === cleanNo);
    return Boolean(found?.isSaved);
  },

  /**
   * Toggles saved/favorite status of a train
   */
  async toggleSaveTrain(
    trainNumber: string,
    trainName?: string,
    fromCode?: string,
    toCode?: string
  ): Promise<boolean> {
    const cleanNo = (trainNumber || '').trim().replace(/\D/g, '');
    if (!cleanNo) return false;

    const list = await this.getUnifiedList();
    const existingIndex = list.findIndex((t) => t.number === cleanNo);

    let nextSavedState = true;

    if (existingIndex >= 0) {
      nextSavedState = !list[existingIndex].isSaved;
      list[existingIndex].isSaved = nextSavedState;
      if (nextSavedState) {
        list[existingIndex].savedAt = Date.now();
      }
      if (trainName) list[existingIndex].name = trainName;
      if (fromCode) list[existingIndex].fromCode = fromCode;
      if (toCode) list[existingIndex].toCode = toCode;
    } else {
      list.push({
        number: cleanNo,
        name: trainName || `Train ${cleanNo}`,
        fromCode,
        toCode,
        savedAt: Date.now(),
        lastViewedAt: Date.now(),
        isSaved: true,
      });
      nextSavedState = true;
    }

    await SafeStorage.setItem(STORAGE_KEYS.SAVED_TRAINS, JSON.stringify(list));
    return nextSavedState;
  },

  /**
   * Records a train as viewed (recent)
   */
  async recordViewedTrain(
    trainOrNumber: string | Omit<SavedRecentTrain, 'lastViewedAt'>,
    trainName?: string,
    fromCode?: string,
    toCode?: string
  ): Promise<void> {
    let cleanNo = '';
    let name = trainName;
    let from = fromCode;
    let to = toCode;
    let isSaved = false;

    if (typeof trainOrNumber === 'object') {
      cleanNo = (trainOrNumber.number || '').trim().replace(/\D/g, '');
      name = trainOrNumber.name;
      from = trainOrNumber.fromCode;
      to = trainOrNumber.toCode;
      isSaved = Boolean(trainOrNumber.isSaved);
    } else {
      cleanNo = (trainOrNumber || '').trim().replace(/\D/g, '');
    }
    if (!cleanNo) return;

    const list = await this.getUnifiedList();
    const existing = list.find((t) => t.number === cleanNo);

    if (existing) {
      existing.lastViewedAt = Date.now();
      if (name && (existing.name.startsWith('Train ') || !existing.name)) existing.name = name;
      if (from) existing.fromCode = from;
      if (to) existing.toCode = to;
      if (isSaved) existing.isSaved = true;
    } else {
      list.push({
        number: cleanNo,
        name: name || `Train ${cleanNo}`,
        fromCode: from,
        toCode: to,
        lastViewedAt: Date.now(),
        isSaved,
      });
    }

    // Keep max 20 total recent/saved items
    const trimmed = list.slice(0, 20);
    await SafeStorage.setItem(STORAGE_KEYS.SAVED_TRAINS, JSON.stringify(trimmed));
  },
};
