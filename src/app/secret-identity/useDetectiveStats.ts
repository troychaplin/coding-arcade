"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const KEY = "arcade:secret-identity:stats";
const EVENT = "arcade:detective-stats-change";

export type DetectiveStats = {
  score: number;
  streak: number;
  bestStreak: number;
  solved: number;
};

const EMPTY: DetectiveStats = { score: 0, streak: 0, bestStreak: 0, solved: 0 };

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function write(stats: DetectiveStats) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // Storage blocked — score just won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Detective Score & Win Streak, saved in localStorage. */
export function useDetectiveStats() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");

  const stats = useMemo<DetectiveStats>(() => {
    try {
      return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
    } catch {
      return EMPTY;
    }
  }, [raw]);

  const recordWin = useCallback(
    (points: number) => {
      const streak = stats.streak + 1;
      write({
        score: stats.score + points,
        streak,
        bestStreak: Math.max(stats.bestStreak, streak),
        solved: stats.solved + 1,
      });
    },
    [stats],
  );

  const recordLoss = useCallback(() => write({ ...stats, streak: 0 }), [stats]);

  return { stats, recordWin, recordLoss };
}
