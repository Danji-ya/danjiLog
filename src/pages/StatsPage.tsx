import { useState } from "react";
import { Droplet, Soup } from "lucide-react";
import { usePrimaryCat } from "@/hooks/useCats";
import { useStats } from "@/hooks/useStats";
import StatsChart from "@/components/StatsChart";
import PullToRefresh from "@/components/PullToRefresh";
import type { StatsPeriod } from "@/types";
import type { StatAggregate } from "@/utils/stats";

const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
];

function AggregateRow({ aggregate }: { aggregate: StatAggregate }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-ios-gray-100 border-t border-ios-gray-100 dark:divide-ios-gray-800 dark:border-ios-gray-800">
      {[
        { label: "평균", value: aggregate.avg },
        { label: "최대", value: aggregate.max },
        { label: "최소", value: aggregate.min },
      ].map((item) => (
        <div key={item.label} className="px-2 py-3 text-center">
          <p className="text-xs text-ios-gray-500 dark:text-ios-gray-400">{item.label}</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-ios-gray-900 dark:text-white">
            {item.value}ml
          </p>
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const { cat, refetch: refetchCat } = usePrimaryCat();
  const [period, setPeriod] = useState<StatsPeriod>("7d");
  const { daily, water, food, isLoading, refetch: refetchStats } = useStats(cat?.id, period);

  return (
    <PullToRefresh onRefresh={async () => { await Promise.all([refetchCat(), refetchStats()]); }}>
      <div className="flex flex-col gap-5 px-4 pb-28 pt-4">
        <header>
          <h1 className="text-2xl font-bold text-ios-gray-900 dark:text-white">통계</h1>
        </header>

        <div className="flex rounded-ios bg-ios-gray-200 p-1 dark:bg-ios-gray-800">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={`flex-1 rounded-[10px] py-2 text-sm font-medium transition-colors ${
                period === opt.value
                  ? "bg-white text-ios-gray-900 shadow-card dark:bg-ios-gray-700 dark:text-white"
                  : "text-ios-gray-600 dark:text-ios-gray-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-ios-gray-400">불러오는 중...</div>
        ) : (
          <>
            <section className="overflow-hidden rounded-ios-lg bg-white shadow-card dark:bg-ios-gray-900">
              <div className="flex items-center gap-1.5 px-4 pt-4 text-sm font-semibold text-ios-gray-900 dark:text-white">
                <Droplet className="h-4 w-4" />
                <span>하루 음수량</span>
              </div>
              <div className="px-2 pt-2">
                <StatsChart data={daily} metric="water" period={period} />
              </div>
              <AggregateRow aggregate={water} />
            </section>

            <section className="overflow-hidden rounded-ios-lg bg-white shadow-card dark:bg-ios-gray-900">
              <div className="flex items-center gap-1.5 px-4 pt-4 text-sm font-semibold text-ios-gray-900 dark:text-white">
                <Soup className="h-4 w-4" />
                <span>하루 식사량</span>
              </div>
              <div className="px-2 pt-2">
                <StatsChart data={daily} metric="food" period={period} />
              </div>
              <AggregateRow aggregate={food} />
            </section>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
