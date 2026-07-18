import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPush, type PushSubscriptionRow } from "../_shared/push.ts";

type SubscriptionWithHousehold = PushSubscriptionRow & { household_id: string };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("unauthorized", { status: 401 });
  }

  const { endpoint } = await req.json().catch(() => ({ endpoint: null }));
  if (typeof endpoint !== "string" || endpoint.length === 0) {
    return new Response("endpoint required", { status: 400 });
  }

  // service_role을 쓰지 않고 호출자의 세션으로 클라이언트를 만들어야
  // 진짜 RLS가 적용된다 — service_role은 RLS를 우회하므로 그걸 쓰면 "이 endpoint가
  // 내 household 소속인지" 검증이 사실상 없는 것과 같아, 다른 household의
  // endpoint로도 테스트 push를 보낼 수 있는 인가 공백이 생긴다.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: subscription, error } = await userClient
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key, household_id")
    .eq("endpoint", endpoint)
    .maybeSingle<SubscriptionWithHousehold>();

  if (error || !subscription) {
    return new Response("subscription not found or not owned by caller", { status: 404 });
  }

  const outcome = await sendPush(subscription, {
    title: "테스트 알림",
    body: "danjiLog 식사 알림이 정상적으로 도착했어요.",
  });

  if (outcome.status === "expired") {
    await userClient.from("push_subscriptions").delete().eq("id", subscription.id);
  }

  // notification_log insert는 service_role 전용 (RLS는 select만 허용) — 별도 클라이언트로 기록.
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  await serviceClient.from("notification_log").insert({
    household_id: subscription.household_id,
    kind: "meal_reminder_test",
    attempted: 1,
    succeeded: outcome.status === "success" ? 1 : 0,
    failed: outcome.status === "success" ? 0 : 1,
    detail: { endpoint, status: outcome.status },
  });

  return Response.json({ status: outcome.status });
});
