import { Droplet, Soup } from "lucide-react";

interface TodaySummaryProps {
  water: number;
  food: number;
  loading?: boolean;
}

export default function TodaySummary({ water, food, loading }: TodaySummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-ios-lg bg-white p-4 shadow-card dark:bg-ios-gray-900">
        <div className="flex items-center gap-1.5 text-sm text-ios-gray-500 dark:text-ios-gray-400">
          <Droplet className="h-4 w-4" />
          <span>오늘 물</span>
        </div>
        <p className="mt-1.5 text-2xl font-bold tabular-nums text-water">
          {loading ? "-" : water}
          <span className="ml-0.5 text-base font-medium text-ios-gray-400">ml</span>
        </p>
      </div>
      <div className="rounded-ios-lg bg-white p-4 shadow-card dark:bg-ios-gray-900">
        <div className="flex items-center gap-1.5 text-sm text-ios-gray-500 dark:text-ios-gray-400">
          <Soup className="h-4 w-4" />
          <span>오늘 식사</span>
        </div>
        <p className="mt-1.5 text-2xl font-bold tabular-nums text-food">
          {loading ? "-" : food}
          <span className="ml-0.5 text-base font-medium text-ios-gray-400">ml</span>
        </p>
      </div>
    </div>
  );
}
