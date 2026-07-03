import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import dayjs from "@/lib/dayjs";
import type { DailyStat, StatsPeriod } from "@/types";

interface StatsChartProps {
  data: DailyStat[];
  metric: "water" | "food";
  period: StatsPeriod;
}

const METRIC_VAR: Record<StatsChartProps["metric"], string> = {
  water: "var(--chart-water)",
  food: "var(--chart-food)",
};

function tickFormatter(date: string, period: StatsPeriod) {
  if (period === "today") return dayjs(date).format("M/D");
  if (period === "7d") return dayjs(date).format("ddd");
  return dayjs(date).format("M/D");
}

function CustomTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: { payload: DailyStat }[];
  metric: "water" | "food";
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-ios bg-white px-3 py-2 text-xs shadow-card ring-1 ring-black/5 dark:bg-ios-gray-800 dark:ring-white/10">
      <p className="mb-0.5 font-medium text-ios-gray-500 dark:text-ios-gray-400">
        {dayjs(point.date).format("M월 D일 (ddd)")}
      </p>
      <p className="font-semibold text-ios-gray-900 dark:text-white">{point[metric]}ml</p>
    </div>
  );
}

export default function StatsChart({ data, metric, period }: StatsChartProps) {
  const interval = period === "30d" ? 4 : 0;

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => tickFormatter(d, period)}
            interval={interval}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip metric={metric} />} cursor={{ fill: "rgba(128,128,128,0.08)" }} />
          <Bar dataKey={metric} fill={METRIC_VAR[metric]} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
