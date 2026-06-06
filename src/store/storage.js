import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Adapter: prefer AsyncStorage, but fall back to Expo SecureStore when
// the native module for AsyncStorage is unavailable (common in Expo Go).
const StorageAdapter = {
  async getItem(key) {
    try {
      if (AsyncStorage && AsyncStorage.getItem) return await AsyncStorage.getItem(key);
    } catch (_) {}
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  async setItem(key, value) {
    try {
      if (AsyncStorage && AsyncStorage.setItem) return await AsyncStorage.setItem(key, value);
    } catch (_) {}
    try { return await SecureStore.setItemAsync(key, value); } catch { return null; }
  },
  async removeItem(key) {
    try {
      if (AsyncStorage && AsyncStorage.removeItem) return await AsyncStorage.removeItem(key);
    } catch (_) {}
    try { return await SecureStore.deleteItemAsync(key); } catch { return null; }
  },
  async multiRemove(keys) {
    try {
      if (AsyncStorage && AsyncStorage.multiRemove) return await AsyncStorage.multiRemove(keys);
    } catch (_) {}
    // SecureStore has no multiRemove, iterate
    try {
      for (const k of keys) await SecureStore.deleteItemAsync(k);
    } catch (_) {}
  },
};

const KEYS = {
  USER: 'zh_user',
  FASTING: 'zh_fasting',
  TASKS: 'zh_tasks',
  SESSIONS: 'zh_sessions',
  STREAK: 'zh_streak',
  DAILY_LOG: 'zh_daily_log',
  TASK_SESSION: 'zh_task_session', // active task countdown session
};

export const Storage = {
  // User
  async getUser() {
    try {
      const raw = await StorageAdapter.getItem(KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async saveUser(user) {
    await StorageAdapter.setItem(KEYS.USER, JSON.stringify(user));
  },

  // Fasting
  async getFasting() {
    try {
      const raw = await StorageAdapter.getItem(KEYS.FASTING);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async saveFasting(data) {
    await StorageAdapter.setItem(KEYS.FASTING, JSON.stringify(data));
  },
  async clearFasting() {
    await StorageAdapter.removeItem(KEYS.FASTING);
  },

  // Tasks (Mind)
  async getTasks() {
    try {
      const raw = await StorageAdapter.getItem(KEYS.TASKS);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },
  async saveTasks(tasks) {
    await StorageAdapter.setItem(KEYS.TASKS, JSON.stringify(tasks));
  },

  // Soul sessions
  async getSessions() {
    try {
      const raw = await StorageAdapter.getItem(KEYS.SESSIONS);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },
  async saveSessions(sessions) {
    await StorageAdapter.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  },

  // Streak & daily log
  async getDailyLog() {
    try {
      const raw = await StorageAdapter.getItem(KEYS.DAILY_LOG);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  },
  async saveDailyLog(log) {
    await StorageAdapter.setItem(KEYS.DAILY_LOG, JSON.stringify(log));
  },
  async markDayComplete(dateStr) {
    const log = await Storage.getDailyLog();
    log[dateStr] = 'complete';
    await Storage.saveDailyLog(log);
  },
  async markDayFailed(dateStr) {
    const log = await Storage.getDailyLog();
    log[dateStr] = 'failed';
    await Storage.saveDailyLog(log);
  },

  // Active task countdown session
  // Shape: { taskId, taskName, taskStartDate, countdown, totalSeconds, progressSeconds, status:'running'|'paused' }
  async getTaskSession() {
    try {
      const raw = await StorageAdapter.getItem(KEYS.TASK_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async saveTaskSession(session) {
    await StorageAdapter.setItem(KEYS.TASK_SESSION, JSON.stringify(session));
  },
  async clearTaskSession() {
    await StorageAdapter.removeItem(KEYS.TASK_SESSION);
  },

  async clearAll() {
    await StorageAdapter.multiRemove(Object.values(KEYS));
  },
};
