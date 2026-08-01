import WheelPicker from "@/components/WheelPicker";
import { AMOUNT_OPTIONS } from "@/utils/wheelOptions";

interface AmountWheelPickerProps {
  value: number;
  onChange: (value: number) => void;
}

// 0 ~ 500ml, 1ml 단위 롤러
export default function AmountWheelPicker({ value, onChange }: AmountWheelPickerProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center">
      <WheelPicker
        options={AMOUNT_OPTIONS}
        value={value}
        onChange={onChange}
        className="col-start-2 w-28"
        aria-label="용량 선택"
      />
      <span className="col-start-3 pl-2 text-lg font-medium text-ios-gray-500 dark:text-ios-gray-400">
        ml
      </span>
    </div>
  );
}
