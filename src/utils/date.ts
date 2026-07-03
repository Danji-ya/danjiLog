import dayjs from "@/lib/dayjs";
import type { StatsPeriod } from "@/types";

export const DATE_KEY_FORMAT = "YYYY-MM-DD";

export function dayRangeISO(date: dayjs.Dayjs) {
  return {
    startISO: date.startOf("day").toISOString(),
    endISO: date.startOf("day").add(1, "day").toISOString(),
  };
}

export function periodRangeISO(period: StatsPeriod, anchor: dayjs.Dayjs = dayjs()) {
  const end = anchor.startOf("day").add(1, "day");
  const days = period === "today" ? 1 : period === "7d" ? 7 : 30;
  const start = anchor.startOf("day").subtract(days - 1, "day");
  return { startISO: start.toISOString(), endISO: end.toISOString(), days };
}

export function formatTime(iso: string) {
  return dayjs(iso).format("HH:mm");
}

export function formatDateKey(iso: string | dayjs.Dayjs) {
  return dayjs(iso).format(DATE_KEY_FORMAT);
}

export function formatDisplayDate(iso: string | dayjs.Dayjs) {
  return dayjs(iso).format("YYYY년 M월 D일 (ddd)");
}
