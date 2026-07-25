import { useMemo } from "react";
import dayjs from "@/lib/dayjs";
import { useRecords } from "@/hooks/useRecords";
import { periodRangeISO } from "@/utils/date";
import { useTodayKey } from "@/contexts/TodayContext";
import { aggregate, buildDailyStats } from "@/utils/stats";
import type { StatsPeriod } from "@/types";

export function useStats(catId: string | undefined, period: StatsPeriod) {
  const todayKey = useTodayKey();
  const { startISO, endISO, days } = useMemo(
    () => periodRangeISO(period, dayjs(todayKey)),
    [period, todayKey]
  );
  const query = useRecords(catId, startISO, endISO);

  const daily = useMemo(
    () => buildDailyStats(query.data ?? [], startISO, days),
    [query.data, startISO, days]
  );

  const water = useMemo(() => aggregate(daily.map((d) => d.water)), [daily]);
  const food = useMemo(() => aggregate(daily.map((d) => d.food)), [daily]);

  return { ...query, daily, water, food };
}
