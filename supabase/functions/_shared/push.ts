import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

export type PushOutcome =
  | { status: "success" }
  | { status: "expired" } // 404/410 — subscription is dead, caller should delete it
  | { status: "skip" }; // 429/5xx/network/400/401/403 — transient or key mismatch, don't delete

export async function sendPush(
  subscription: PushSubscriptionRow,
  payload: Record<string, unknown>,
): Promise<PushOutcome> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
      },
      JSON.stringify(payload),
    );
    return { status: "success" };
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      return { status: "expired" };
    }
    // 400/401/403 (VAPID mismatch/bad payload), 429, 5xx, network errors — skip only, don't delete
    return { status: "skip" };
  }
}
