import WheelPicker from "@/components/WheelPicker";
import { HOUR_OPTIONS, MINUTE_OPTIONS } from "@/utils/wheelOptions";

export interface TimeValue {
  hour: number;
  minute: number;
}

interface TimeWheelPickerProps {
  value: TimeValue;
  onChange: (value: TimeValue) => void;
}

export default function TimeWheelPicker({ value, onChange }: TimeWheelPickerProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      <WheelPicker
        options={HOUR_OPTIONS}
        value={value.hour}
        onChange={(hour) => onChange({ ...value, hour })}
        className="w-16"
        aria-label="시"
      />
      <span className="text-xl font-semibold text-ios-gray-400 dark:text-ios-gray-600">:</span>
      <WheelPicker
        options={MINUTE_OPTIONS}
        value={value.minute}
        onChange={(minute) => onChange({ ...value, minute })}
        className="w-16"
        aria-label="분"
      />
    </div>
  );
}
