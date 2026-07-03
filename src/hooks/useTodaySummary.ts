import { useMemo } from "react";
import dayjs from "@/lib/dayjs";
import { dayRangeISO } from "@/utils/date";
import { useRecords } from "@/hooks/useRecords";

export function useTodaySummary(catId: string | undefined) {
  const { startISO, endISO } = useMemo(() => dayRangeISO(dayjs()), []);
  const query = useRecords(catId, startISO, endISO);

  const summary = useMemo(() => {
    const records = query.data ?? [];
    const water = records.filter((r) => r.type === "water").reduce((sum, r) => sum + r.amount_ml, 0);
    const food = records.filter((r) => r.type === "food").reduce((sum, r) => sum + r.amount_ml, 0);
    return { water, food, records };
  }, [query.data]);

  return { ...query, ...summary };
}
