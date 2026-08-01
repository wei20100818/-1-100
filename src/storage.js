import { createDefaultStats, normalizeStats } from "./game.js";

export const STATS_STORAGE_KEY = "numberGuessGame.stats.v1";

export function loadStats(storage = getBrowserStorage()) {
  const fallback = createDefaultStats();

  if (!storage) {
    return fallback;
  }

  try {
    const raw = storage.getItem(STATS_STORAGE_KEY);
    return raw ? normalizeStats(JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}

export function saveStats(stats, storage = getBrowserStorage()) {
  const normalized = normalizeStats(stats);

  if (!storage) {
    return normalized;
  }

  try {
    storage.setItem(STATS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // localStorage 可能因隱私設定或儲存空間限制而不可用，遊戲仍可繼續。
  }

  return normalized;
}

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
