import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import dayjs from "@/lib/dayjs";
import Sheet from "@/components/Sheet";
import IntervalWheelPicker from "@/components/IntervalWheelPicker";
import { INTERVAL_OPTIONS } from "@/utils/wheelOptions";
import { usePrimaryCat } from "@/hooks/useCats";
import {
  useLastNotificationCheck,
  useMealReminderSettings,
  useNotificationDiagnostics,
  useSendTestPush,
  useUpdateMealReminderSettings,
} from "@/hooks/useNotificationSettings";
import type { PushSubscribeResult } from "@/services/notifications";

const DEFAULT_INTERVAL_MINUTES = 240;

function intervalLabel(minutes: number): string {
  return INTERVAL_OPTIONS.find((o) => o.value === minutes)?.label ?? `${minutes}분`;
}

export default function MealReminderSection() {
  const { cat } = usePrimaryCat();
  const { data: settings } = useMealReminderSettings(cat?.id);
  const updateSettings = useUpdateMealReminderSettings();
  const sendTestPush = useSendTestPush();
  const { data: diagnostics } = useNotificationDiagnostics();
  const { data: lastCheck } = useLastNotificationCheck(cat?.household_id);

  const [intervalSheetOpen, setIntervalSheetOpen] = useState(false);
  const [pendingInterval, setPendingInterval] = useState(DEFAULT_INTERVAL_MINUTES);
  const [banner, setBanner] = useState<Exclude<PushSubscribeResult["status"], "granted"> | null>(null);

  useEffect(() => {
    if (settings) setPendingInterval(settings.interval_minutes);
  }, [settings]);

  if (!cat) return null;

  const enabled = settings?.enabled ?? false;
  const intervalMinutes = settings?.interval_minutes ?? DEFAULT_INTERVAL_MINUTES;

  const handleToggle = async () => {
    const result = await updateSettings.mutateAsync({
      catId: cat.id,
      householdId: cat.household_id,
      enabled: !enabled,
      intervalMinutes,
    });
    setBanner(result.ok ? null : result.reason);
  };

  const handleConfirmInterval = async () => {
    setIntervalSheetOpen(false);
    const result = await updateSettings.mutateAsync({
      catId: cat.id,
      householdId: cat.household_id,
      enabled,
      intervalMinutes: pendingInterval,
    });
    setBanner(result.ok ? null : result.reason);
  };

  return (
    <>
      <section className="overflow-hidden rounded-ios-lg bg-white shadow-card dark:bg-ios-gray-900">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-[15px] text-ios-gray-900 dark:text-white">식사 알림</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={handleToggle}
            disabled={updateSettings.isPending}
            className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              enabled ? "bg-ios-green" : "bg-ios-gray-300 dark:bg-ios-gray-700"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="h-px bg-ios-gray-100 dark:bg-ios-gray-800" />
        <button
          type="button"
          onClick={() => setIntervalSheetOpen(true)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <span className="text-[15px] text-ios-gray-900 dark:text-white">알림 간격</span>
          <span className="text-[15px] text-ios-gray-400">{intervalLabel(intervalMinutes)}</span>
        </button>

        {enabled && (
          <>
            <div className="h-px bg-ios-gray-100 dark:bg-ios-gray-800" />
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[15px] text-ios-gray-900 dark:text-white">다음 알림 예정</span>
              <span className="text-[15px] text-ios-gray-400">
                {settings?.next_notify_at
                  ? dayjs(settings.next_notify_at).format("M월 D일 HH:mm")
                  : "없음 (다음 식사 기록 시 예약)"}
              </span>
            </div>
          </>
        )}

        {banner && (
          <div className="border-t border-ios-gray-100 px-4 py-3 text-[13px] text-ios-red dark:border-ios-gray-800">
            {banner === "ios-not-installed"
              ? "홈 화면에 추가한 뒤 다시 시도해주세요."
              : "푸시 알림을 받으려면 기기에서 알림을 허용해주세요."}
          </div>
        )}
      </section>

      <details className="group overflow-hidden rounded-ios-lg bg-white shadow-card dark:bg-ios-gray-900">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-[15px] text-ios-gray-900 dark:text-white">
          알림 진단
          <Bell className="h-4 w-4 text-ios-gray-400 transition-transform group-open:rotate-12" />
        </summary>
        <div className="flex flex-col gap-2 border-t border-ios-gray-100 px-4 py-3 text-[13px] dark:border-ios-gray-800">
          <DiagnosticRow label="브라우저 지원" value={diagnostics?.supported ? "지원됨" : "미지원"} />
          {diagnostics?.iosNotInstalled && <DiagnosticRow label="iOS 홈 화면 설치" value="미설치" />}
          <DiagnosticRow
            label="Service Worker"
            value={diagnostics?.serviceWorkerRegistered ? "등록됨" : "미등록"}
          />
          <DiagnosticRow
            label="알림 권한"
            value={
              diagnostics?.permission === "granted"
                ? "허용"
                : diagnostics?.permission === "denied"
                  ? "차단"
                  : "미설정"
            }
          />
          <DiagnosticRow label="이 기기 구독" value={diagnostics?.subscribed ? "됨" : "안 됨"} />
          <DiagnosticRow
            label="마지막 확인"
            value={lastCheck ? dayjs(lastCheck).format("M월 D일 HH:mm") : "기록 없음"}
          />
          <button
            type="button"
            onClick={() => sendTestPush.mutate()}
            disabled={sendTestPush.isPending}
            className="mt-2 rounded-ios bg-ios-gray-100 py-2.5 text-center text-[13px] font-medium text-ios-gray-900 transition active:opacity-70 disabled:opacity-50 dark:bg-ios-gray-800 dark:text-white"
          >
            {sendTestPush.isPending
              ? "보내는 중..."
              : sendTestPush.isSuccess
                ? "테스트 알림을 보냈어요"
                : sendTestPush.isError
                  ? `실패: ${(sendTestPush.error as Error).message}`
                  : "테스트 Push 보내기"}
          </button>
        </div>
      </details>

      <Sheet open={intervalSheetOpen} onClose={() => setIntervalSheetOpen(false)} title="알림 간격">
        <div className="flex flex-col gap-5">
          <IntervalWheelPicker value={pendingInterval} onChange={setPendingInterval} />
          <button
            type="button"
            onClick={handleConfirmInterval}
            disabled={updateSettings.isPending}
            className="rounded-ios bg-ios-blue py-3.5 text-base font-semibold text-white transition active:opacity-70 disabled:opacity-50"
          >
            확인
          </button>
        </div>
      </Sheet>
    </>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ios-gray-500 dark:text-ios-gray-400">{label}</span>
      <span className="text-ios-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
