import { useCallback } from "react";

// iOS Safari(PWA)는 Vibration API를 지원하지 않는 경우가 많아 조용히 무시됩니다.
export function useHaptic() {
  const tap = useCallback((durationMs = 8) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(durationMs);
    }
  }, []);

  const success = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([10, 40, 10]);
    }
  }, []);

  return { tap, success };
}
