import dayjs, { type Dayjs } from "@/lib/dayjs";
import { formatDateKey } from "@/utils/date";

interface CalendarViewProps {
  month: Dayjs;
  selectedDate: Dayjs;
  markedDates: Set<string>;
  onSelectDate: (date: Dayjs) => void;
  onMonthChange: (month: Dayjs) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarView({
  month,
  selectedDate,
  markedDates,
  onSelectDate,
  onMonthChange,
}: CalendarViewProps) {
  const gridStart = month.startOf("month").startOf("week");
  const gridEnd = month.endOf("month").endOf("week");
  const days: Dayjs[] = [];
  for (let d = gridStart; d.isSameOrBefore(gridEnd, "day"); d = d.add(1, "day")) {
    days.push(d);
  }

  const today = dayjs();

  return (
    <div className="rounded-ios-lg bg-white p-3 shadow-card dark:bg-ios-gray-900">
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => onMonthChange(month.subtract(1, "month"))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-ios-gray-500 transition active:bg-ios-gray-100 dark:text-ios-gray-400 dark:active:bg-ios-gray-800"
          aria-label="이전 달"
        >
          ‹
        </button>
        <p className="text-base font-semibold text-ios-gray-900 dark:text-white">
          {month.format("YYYY년 M월")}
        </p>
        <button
          type="button"
          onClick={() => onMonthChange(month.add(1, "month"))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-ios-gray-500 transition active:bg-ios-gray-100 dark:text-ios-gray-400 dark:active:bg-ios-gray-800"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1.5 text-center text-xs font-medium text-ios-gray-400">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = day.isSame(month, "month");
          const isSelected = day.isSame(selectedDate, "day");
          const isToday = day.isSame(today, "day");
          const hasRecord = markedDates.has(formatDateKey(day));

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                if (!inMonth) onMonthChange(day.startOf("month"));
                onSelectDate(day);
              }}
              className="flex aspect-square flex-col items-center justify-center gap-0.5 py-0.5"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                  isSelected
                    ? "bg-ios-blue font-semibold text-white"
                    : isToday
                      ? "font-semibold text-ios-blue"
                      : inMonth
                        ? "text-ios-gray-900 dark:text-white"
                        : "text-ios-gray-300 dark:text-ios-gray-700"
                }`}
              >
                {day.date()}
              </span>
              <span
                className={`h-1 w-1 rounded-full ${
                  hasRecord && !isSelected ? "bg-ios-gray-400 dark:bg-ios-gray-600" : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
