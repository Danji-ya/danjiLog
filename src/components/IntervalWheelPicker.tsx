import WheelPicker from "@/components/WheelPicker";
import { INTERVAL_OPTIONS } from "@/utils/wheelOptions";

interface IntervalWheelPickerProps {
  value: number;
  onChange: (value: number) => void;
}

export default function IntervalWheelPicker({ value, onChange }: IntervalWheelPickerProps) {
  return (
    <div className="flex justify-center">
      <WheelPicker
        options={INTERVAL_OPTIONS}
        value={value}
        onChange={onChange}
        className="w-40"
        aria-label="알림 간격 선택"
      />
    </div>
  );
}
