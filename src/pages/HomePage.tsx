import { useState } from "react";
import { Cat, Plus } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { usePrimaryCat } from "@/hooks/useCats";
import { useTodaySummary } from "@/hooks/useTodaySummary";
import TodaySummary from "@/components/TodaySummary";
import RecordList from "@/components/RecordList";
import AddRecordModal from "@/components/AddRecordModal";
import PullToRefresh from "@/components/PullToRefresh";
import type { CatRecord } from "@/types";

export default function HomePage() {
  const { cat, isLoading: catLoading, refetch: refetchCat } = usePrimaryCat();
  const {
    water,
    food,
    records,
    isLoading: recordsLoading,
    dataUpdatedAt,
    refetch: refetchSummary,
  } = useTodaySummary(cat?.id);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CatRecord | null>(null);

  const openAdd = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  const openEdit = (record: CatRecord) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  if (catLoading) {
    return (
      <div className="flex h-full items-center justify-center py-24 text-ios-gray-400">
        불러오는 중...
      </div>
    );
  }

  if (!cat) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center text-ios-gray-500">
        <Cat className="h-9 w-9 text-ios-gray-400" />
        <p className="text-sm">등록된 고양이가 없어요.</p>
        <p className="text-xs text-ios-gray-400">Supabase에서 cats 테이블에 고양이를 추가해주세요.</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => { await Promise.all([refetchCat(), refetchSummary()]); }}>
      <div className="flex flex-col gap-5 px-4 pb-28 pt-4">
        <header>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ios-gray-500 dark:text-ios-gray-400">
              {dayjs().format("YYYY년 M월 D일 (ddd)")}
            </p>
            {dataUpdatedAt > 0 && (
              <p className="text-xs text-ios-gray-400 dark:text-ios-gray-500">
                {dayjs(dataUpdatedAt).format("HH:mm")} 업데이트
              </p>
            )}
          </div>
          <h1 className="text-2xl font-bold text-ios-gray-900 dark:text-white">{cat.name}</h1>
        </header>

        <TodaySummary water={water} food={food} loading={recordsLoading} />

        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400">
            오늘 기록
          </h2>
          <RecordList records={records} onSelect={openEdit} />
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
        />
      </div>
    </PullToRefresh>
  );
}
