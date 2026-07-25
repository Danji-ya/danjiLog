import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import dayjs from "@/lib/dayjs";
import { DATE_KEY_FORMAT } from "@/utils/date";

const REFRESH_INTERVAL_MS = 60_000;

const TodayContext = createContext<string | undefined>(undefined);

export function TodayProvider({ children }: { children: ReactNode }) {
  const [todayKey, setTodayKey] = useState(() => dayjs().format(DATE_KEY_FORMAT));

  useEffect(() => {
    const update = () => setTodayKey(dayjs().format(DATE_KEY_FORMAT));
    document.addEventListener("visibilitychange", update);
    const timer = window.setInterval(update, REFRESH_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", update);
      clearInterval(timer);
    };
  }, []);

  return <TodayContext.Provider value={todayKey}>{children}</TodayContext.Provider>;
}

export function useTodayKey() {
  const todayKey = useContext(TodayContext);
  if (todayKey === undefined) throw new Error("useTodayKey는 TodayProvider 내부에서만 사용할 수 있습니다.");
  return todayKey;
}
