import { ChevronRight, Droplet, PawPrint, Soup } from "lucide-react";
import { formatTime } from "@/utils/date";
import type { CatRecord } from "@/types";

interface RecordListProps {
  records: CatRecord[];
  onSelect: (record: CatRecord) => void;
  emptyMessage?: string;
}

const TYPE_META = {
  water: { label: "물", icon: Droplet },
  food: { label: "식사", icon: Soup },
} as const;

export default function RecordList({ records, onSelect, emptyMessage = "아직 기록이 없어요" }: RecordListProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <PawPrint className="h-9 w-9 text-ios-gray-300 dark:text-ios-gray-600" />
        <p className="text-sm text-ios-gray-500 dark:text-ios-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  const sorted = [...records].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));

  return (
    <ul className="overflow-hidden rounded-ios-lg bg-white shadow-card dark:bg-ios-gray-900">
      {sorted.map((record, idx) => {
        const meta = TYPE_META[record.type];
        return (
          <li key={record.id}>
            <button
              type="button"
              onClick={() => onSelect(record)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-ios-gray-100 dark:active:bg-ios-gray-800"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-gray-100 dark:bg-ios-gray-800">
                <meta.icon className="h-[18px] w-[18px] text-ios-gray-600 dark:text-ios-gray-300" />
              </span>
              <span className="w-14 shrink-0 tabular-nums text-sm text-ios-gray-500 dark:text-ios-gray-400">
                {formatTime(record.recorded_at)}
              </span>
              <span className="flex-1 text-[15px] text-ios-gray-900 dark:text-white">{meta.label}</span>
              <span className="text-[15px] font-semibold tabular-nums text-ios-gray-900 dark:text-white">
                {record.amount_ml}ml
              </span>
              <ChevronRight className="h-4 w-4 text-ios-gray-300 dark:text-ios-gray-600" />
            </button>
            {idx < sorted.length - 1 && (
              <div className="ml-[4.25rem] h-px bg-ios-gray-100 dark:bg-ios-gray-800" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
