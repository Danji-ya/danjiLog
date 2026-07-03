import { useMemo } from "react";
import { useRecords } from "@/hooks/useRecords";
import { periodRangeISO } from "@/utils/date";
import { aggregate, buildDailyStats } from "@/utils/stats";
import type { StatsPeriod } from "@/types";

export function useStats(catId: string | undefined, period: StatsPeriod) {
  const { startISO, endISO, days } = useMemo(() => periodRangeISO(period), [period]);
  const query = useRecords(catId, startISO, endISO);

  const daily = useMemo(
    () => buildDailyStats(query.data ?? [], startISO, days),
    [query.data, startISO, days]
  );

  const water = useMemo(() => aggregate(daily.map((d) => d.water)), [daily]);
  const food = useMemo(() => aggregate(daily.map((d) => d.food)), [daily]);

  return { ...query, daily, water, food };
}
