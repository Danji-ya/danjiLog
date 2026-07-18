import { supabase } from "@/lib/supabase";
import type { MealReminderSettings } from "@/types";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function isIOS(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export type PushSubscribeResult =
  | { status: "granted" }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "ios-not-installed" };

async function ensurePushSubscription(householdId: string): Promise<PushSubscribeResult> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { status: "unsupported" };
  }

  if (isIOS() && !isStandalone()) {
    return { status: "ios-not-installed" };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { status: "denied" };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.rpc("upsert_push_subscription", {
    p_household_id: householdId,
    p_endpoint: json.endpoint!,
    p_p256dh: json.keys!.p256dh,
    p_auth_key: json.keys!.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;

  return { status: "granted" };
}

export async function getMealReminderSettings(catId: string): Promise<MealReminderSettings | null> {
  const { data, error } = await supabase
    .from("meal_reminder_settings")
    .select("*")
    .eq("cat_id", catId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface UpdateMealReminderInput {
  catId: string;
  householdId: string;
  enabled: boolean;
  intervalMinutes: number;
}

export type UpdateMealReminderResult = { ok: true } | { ok: false; reason: Exclude<PushSubscribeResult["status"], "granted"> };

// 켜는 경우에만 기기 구독을 보장한다 — 실패하면(권한 거부/미지원/iOS 미설치) RPC를
// 아예 호출하지 않아 설정이 켜진 채로 남지 않는다. 끄는 경우는 구독 자체는
// 그대로 두고(다른 알림 기능이 재사용할 수 있으므로) 설정만 끈다.
export async function updateMealReminderSettings(input: UpdateMealReminderInput): Promise<UpdateMealReminderResult> {
  if (input.enabled) {
    const subscribeResult = await ensurePushSubscription(input.householdId);
    if (subscribeResult.status !== "granted") {
      return { ok: false, reason: subscribeResult.status };
    }
  }

  const { error } = await supabase.rpc("upsert_meal_reminder_settings", {
    p_cat_id: input.catId,
    p_enabled: input.enabled,
    p_interval_minutes: input.intervalMinutes,
  });
  if (error) throw error;

  return { ok: true };
}

export interface NotificationDiagnostics {
  supported: boolean;
  iosNotInstalled: boolean;
  serviceWorkerRegistered: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
}

export async function getNotificationDiagnostics(): Promise<NotificationDiagnostics> {
  const supported = "serviceWorker" in navigator && "PushManager" in window;
  if (!supported) {
    return {
      supported: false,
      iosNotInstalled: isIOS() && !isStandalone(),
      serviceWorkerRegistered: false,
      permission: "unsupported",
      subscribed: false,
    };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration ? await registration.pushManager.getSubscription() : null;

  return {
    supported: true,
    iosNotInstalled: isIOS() && !isStandalone(),
    serviceWorkerRegistered: Boolean(registration),
    permission: Notification.permission,
    subscribed: Boolean(subscription),
  };
}

export async function getLastNotificationCheck(householdId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("notification_log")
    .select("ran_at")
    .eq("household_id", householdId)
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.ran_at ?? null;
}
