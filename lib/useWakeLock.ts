import { useEffect } from "react";

export default function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let cancelled = false;
    let lock: WakeLockSentinel | null = null;

    const request = async () => {
      if (cancelled || document.visibilityState !== "visible" || lock) return;
      try {
        lock = await navigator.wakeLock.request("screen");
        lock.addEventListener("release", () => {
          if (!cancelled) lock = null;
        });
      } catch {
        lock = null;
      }
    };

    request();
    const onVisibility = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => {});
      lock = null;
    };
  }, [active]);
}
