import { useEffect, useState } from "react";
import { Droplet, Soup } from "lucide-react";
import dayjs from "@/lib/dayjs";
import Sheet from "@/components/Sheet";
import TimeWheelPicker, { type TimeValue } from "@/components/TimeWheelPicker";
import AmountWheelPicker from "@/components/AmountWheelPicker";
import { useCreateRecord, useDeleteRecord, useUpdateRecord } from "@/hooks/useRecords";
import { useAuth } from "@/contexts/AuthContext";
import type { CatRecord, RecordType } from "@/types";

interface AddRecordModalProps {
  open: boolean;
  onClose: () => void;
  catId: string;
  editingRecord?: CatRecord | null;
  /** 기록을 추가할 기준 날짜(YYYY-MM-DD). 캘린더에서 과거 날짜로 추가할 때 사용. 기본값: 오늘 */
  targetDate?: string;
}

const TYPE_META: Record<RecordType, { label: string; icon: typeof Droplet; color: string }> = {
  water: { label: "물", icon: Droplet, color: "bg-water" },
  food: { label: "식사", icon: Soup, color: "bg-food" },
};

function nowToTimeValue(): TimeValue {
  const now = dayjs();
  return { hour: now.hour(), minute: now.minute() };
}

export default function AddRecordModal({
  open,
  onClose,
  catId,
  editingRecord,
  targetDate,
}: AddRecordModalProps) {
  const [step, setStep] = useState<"type" | "picker">("type");
  const [type, setType] = useState<RecordType | null>(null);
  const [time, setTime] = useState<TimeValue>(nowToTimeValue());
  const [amount, setAmount] = useState(30);

  const { user } = useAuth();
  const createRecord = useCreateRecord();
  const updateRecord = useUpdateRecord();
  const deleteRecord = useDeleteRecord();

  const isEditing = Boolean(editingRecord);
  const isSaving = createRecord.isPending || updateRecord.isPending;

  useEffect(() => {
    if (!open) return;
    if (editingRecord) {
      const recorded = dayjs(editingRecord.recorded_at);
      setType(editingRecord.type);
      setTime({ hour: recorded.hour(), minute: recorded.minute() });
      setAmount(editingRecord.amount_ml);
      setStep("picker");
    } else {
      setType(null);
      setTime(nowToTimeValue());
      setAmount(30);
      setStep("type");
    }
  }, [open, editingRecord]);

  const handleSelectType = (selected: RecordType) => {
    setType(selected);
    setStep("picker");
  };

  const handleConfirm = async () => {
    if (!type || !user) return;
    const baseDay = editingRecord
      ? dayjs(editingRecord.recorded_at)
      : targetDate
        ? dayjs(targetDate)
        : dayjs();
    const recordedAt = baseDay
      .hour(time.hour)
      .minute(time.minute)
      .second(0)
      .millisecond(0)
      .toISOString();

    if (isEditing && editingRecord) {
      await updateRecord.mutateAsync({ id: editingRecord.id, type, amountMl: amount, recordedAt });
    } else {
      await createRecord.mutateAsync({ catId, type, amountMl: amount, recordedAt });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!editingRecord) return;
    await deleteRecord.mutateAsync(editingRecord.id);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={step === "type" ? "무엇을 기록할까요?" : TYPE_META[type ?? "water"].label + " 기록"}
    >
      {step === "type" && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          {(Object.keys(TYPE_META) as RecordType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleSelectType(t)}
              className="flex flex-col items-center gap-2 rounded-ios-lg bg-ios-gray-100 py-6 transition active:scale-95 dark:bg-ios-gray-800"
            >
              {(() => {
                const Icon = TYPE_META[t].icon;
                return <Icon className="h-9 w-9 text-ios-gray-700 dark:text-ios-gray-300" />;
              })()}
              <span className="text-base font-semibold text-ios-gray-900 dark:text-white">
                {TYPE_META[t].label}
              </span>
            </button>
          ))}
        </div>
      )}

      {step === "picker" && type && (
        <div className="flex flex-col gap-5">
          <div className="flex justify-center gap-2">
            {(Object.keys(TYPE_META) as RecordType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  type === t
                    ? `${TYPE_META[t].color} text-white`
                    : "bg-ios-gray-100 text-ios-gray-500 dark:bg-ios-gray-800 dark:text-ios-gray-400"
                }`}
              >
                {(() => {
                  const Icon = TYPE_META[t].icon;
                  return <Icon className="h-4 w-4" />;
                })()}
                {TYPE_META[t].label}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-1 text-center text-xs font-medium text-ios-gray-500 dark:text-ios-gray-400">
              시간
            </p>
            <TimeWheelPicker value={time} onChange={setTime} />
          </div>

          <div>
            <p className="mb-1 text-center text-xs font-medium text-ios-gray-500 dark:text-ios-gray-400">
              용량
            </p>
            <AmountWheelPicker value={amount} onChange={setAmount} />
          </div>

          <div className="flex gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteRecord.isPending}
                className="rounded-ios bg-ios-gray-100 px-5 py-3.5 text-base font-semibold text-ios-red transition active:opacity-70 disabled:opacity-50 dark:bg-ios-gray-800"
              >
                삭제
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
              className="flex-1 rounded-ios bg-ios-blue py-3.5 text-base font-semibold text-white transition active:opacity-70 disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "확인"}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
