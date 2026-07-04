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
