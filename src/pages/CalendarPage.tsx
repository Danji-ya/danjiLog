import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { usePrimaryCat } from "@/hooks/useCats";
import { useRecords } from "@/hooks/useRecords";
import CalendarView from "@/components/CalendarView";
import RecordList from "@/components/RecordList";
import AddRecordModal from "@/components/AddRecordModal";
import PullToRefresh from "@/components/PullToRefresh";
import { formatDateKey, formatDisplayDate } from "@/utils/date";
import type { CatRecord } from "@/types";

export default function CalendarPage() {
  const { cat, refetch: refetchCat } = usePrimaryCat();
  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const [selectedDate, setSelectedDate] = useState(() => dayjs());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CatRecord | null>(null);

  const monthRange = useMemo(() => {
    const start = month.startOf("month").startOf("week");
    const end = month.endOf("month").endOf("week").add(1, "day");
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, [month]);

  const { data: monthRecords = [], refetch: refetchRecords } = useRecords(
    cat?.id,
    monthRange.startISO,
    monthRange.endISO
  );

  const markedDates = useMemo(() => {
    const set = new Set<string>();
    for (const r of monthRecords) set.add(formatDateKey(r.recorded_at));
    return set;
  }, [monthRecords]);

  const selectedDayRecords = useMemo(() => {
    const key = formatDateKey(selectedDate);
    return monthRecords.filter((r) => formatDateKey(r.recorded_at) === key);
  }, [monthRecords, selectedDate]);

  const openAdd = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  const openEdit = (record: CatRecord) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  if (!cat) return null;

  return (
    <PullToRefresh onRefresh={async () => { await Promise.all([refetchCat(), refetchRecords()]); }}>
      <div className="flex flex-col gap-5 px-4 pb-28 pt-4">
        <header>
          <h1 className="text-2xl font-bold text-ios-gray-900 dark:text-white">캘린더</h1>
        </header>

        <CalendarView
          month={month}
          selectedDate={selectedDate}
          markedDates={markedDates}
          onSelectDate={setSelectedDate}
          onMonthChange={setMonth}
        />

        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400">
            {formatDisplayDate(selectedDate)}
          </h2>
          <RecordList records={selectedDayRecords} onSelect={openEdit} emptyMessage="이 날은 기록이 없어요" />
        </section>

        <button
          type="button"
          onClick={openAdd}
          aria-label="기록 추가"
          className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-ios-blue text-white shadow-lg transition active:scale-90"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>

        <AddRecordModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          catId={cat.id}
          editingRecord={editingRecord}
          targetDate={formatDateKey(selectedDate)}
        />
      </div>
    </PullToRefresh>
  );
}
