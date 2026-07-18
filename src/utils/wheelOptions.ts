import type { WheelPickerOption } from "@/components/WheelPicker";

export function rangeOptions(
  start: number,
  end: number,
  step: number,
  labelFn: (v: number) => string = (v) => String(v)
): WheelPickerOption[] {
  const options: WheelPickerOption[] = [];
  for (let v = start; v <= end; v += step) {
    options.push({ value: v, label: labelFn(v) });
  }
  return options;
}

export const AMOUNT_OPTIONS = rangeOptions(0, 500, 1, (v) => `${v}`);
export const HOUR_OPTIONS = rangeOptions(0, 23, 1, (v) => v.toString().padStart(2, "0"));
export const MINUTE_OPTIONS = rangeOptions(0, 59, 1, (v) => v.toString().padStart(2, "0"));

function formatIntervalMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}분`;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

// 식사 알림 간격: 30분 단위, 최대 6시간
export const INTERVAL_OPTIONS = rangeOptions(30, 360, 30, formatIntervalMinutes);
