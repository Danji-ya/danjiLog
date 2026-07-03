import dayjs from "@/lib/dayjs";
import type { CatRecord, DailyStat } from "@/types";
import { formatDateKey } from "@/utils/date";

export function buildDailyStats(records: CatRecord[], startISO: string, days: number): DailyStat[] {
  const byDate = new Map<string, { water: number; food: number }>();

  for (let i = 0; i < days; i++) {
    const key = formatDateKey(dayjs(startISO).add(i, "day"));
    byDate.set(key, { water: 0, food: 0 });
  }

  for (const record of records) {
    const key = formatDateKey(record.recorded_at);
    const bucket = byDate.get(key);
    if (!bucket) continue;
    if (record.type === "water") bucket.water += record.amount_ml;
    else bucket.food += record.amount_ml;
  }

  return Array.from(byDate.entries()).map(([date, v]) => ({ date, ...v }));
}

export interface StatAggregate {
  avg: number;
  max: number;
  min: number;
}

export function aggregate(values: number[]): StatAggregate {
  if (values.length === 0) return { avg: 0, max: 0, min: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / values.length),
    max: Math.max(...values),
    min: Math.min(...values),
  };
}
