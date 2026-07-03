import WheelPicker from "@/components/WheelPicker";
import { AMOUNT_OPTIONS } from "@/utils/wheelOptions";

interface AmountWheelPickerProps {
  value: number;
  onChange: (value: number) => void;
}

// 0 ~ 500ml, 5ml 단위 롤러
export default function AmountWheelPicker({ value, onChange }: AmountWheelPickerProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <WheelPicker
        options={AMOUNT_OPTIONS}
        value={value}
        onChange={onChange}
        className="w-28"
        aria-label="용량 선택"
      />
      <span className="text-lg font-medium text-ios-gray-500 dark:text-ios-gray-400">ml</span>
    </div>
  );
}
