import postgres from "npm:postgres@3";
import { sendPush } from "../_shared/push.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const DB_URL = Deno.env.get("SUPABASE_DB_URL")!;

interface ClaimedRow {
  settings_id: string;
  cat_id: string;
  household_id: string;
  cat_name: string;
  interval_minutes: number;
  claimed_next_notify_at: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

function formatElapsed(intervalMinutes: number): string {
  if (intervalMinutes < 60) return `${intervalMinutes}분`;
  const hours = Math.floor(intervalMinutes / 60);
  const minutes = intervalMinutes % 60;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const sql = postgres(DB_URL, { max: 1 });

  try {
    // 조회와 동시에 next_notify_at을 null로 리셋(선점)한다 — 겹쳐 실행되는 tick이
    // 같은 대상을 두 번 집어가지 못하게 FOR UPDATE로 잠근 뒤 SET하기 전 값을
    // claimed_next_notify_at으로 따로 담아둔다(UPDATE...RETURNING은 갱신 이후 값을
    // 반환하므로, SET 이전 값이 필요하면 이렇게 CTE에서 미리 캡처해야 한다).
    const claimed = await sql<ClaimedRow[]>`
      with due as (
        select s.id, s.cat_id, s.next_notify_at, s.interval_minutes
        from public.meal_reminder_settings s
        where s.enabled
          and s.next_notify_at is not null
          and s.next_notify_at <= now()
        for update of s
      )
      update public.meal_reminder_settings s
      set next_notify_at = null
      from due d
      join public.cats c on c.id = d.cat_id
      where s.id = d.id
      returning
        s.id as settings_id,
        s.cat_id,
        c.household_id,
        c.name as cat_name,
        d.interval_minutes,
        d.next_notify_at as claimed_next_notify_at
    `;

    let totalAttempted = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;

    for (const row of claimed) {
      // 대상 하나(household 하나)의 전체 처리를 try/catch로 감싸 JS 예외도
      // "전부 실패"와 동일하게 취급한다 — 그렇지 않으면 예외 발생 시 선점만 되고
      // 복구가 안 돼 알림이 조용히 유실된다.
      try {
        const subscriptions = await sql<SubscriptionRow[]>`
          select id, endpoint, p256dh, auth_key
          from public.push_subscriptions
          where household_id = ${row.household_id}
        `;

        totalAttempted += subscriptions.length;

        const payload = {
          title: `${row.cat_name} 밥 줄 시간이에요`,
          body: `마지막 식사로부터 약 ${formatElapsed(row.interval_minutes)} 지났어요.`,
        };

        let succeeded = 0;
        const expiredIds: string[] = [];
        const detail: Array<{ endpoint: string; status: string }> = [];

        for (const sub of subscriptions) {
          const outcome = await sendPush(sub, payload);
          detail.push({ endpoint: sub.endpoint, status: outcome.status });
          if (outcome.status === "success") {
            succeeded += 1;
          } else if (outcome.status === "expired") {
            expiredIds.push(sub.id);
          }
        }

        if (expiredIds.length > 0) {
          await sql`delete from public.push_subscriptions where id in ${sql(expiredIds)}`;
        }

        // 성공이 1건이라도 있으면 그대로 소진(null 유지). 전부 실패(구독 0건 포함)면
        // 복구한다 — 단, 선점 이후 트리거/RPC가 이미 갱신했다면 덮어쓰지 않도록 가드.
        if (succeeded === 0) {
          await sql`
            update public.meal_reminder_settings
            set next_notify_at = ${row.claimed_next_notify_at}
            where id = ${row.settings_id}
              and next_notify_at is null
          `;
        }

        totalSucceeded += succeeded;
        totalFailed += subscriptions.length - succeeded;

        await sql`
          insert into public.notification_log
            (household_id, cat_id, kind, attempted, succeeded, failed, detail)
          values
            (${row.household_id}, ${row.cat_id}, 'meal_reminder', ${subscriptions.length}, ${succeeded}, ${subscriptions.length - succeeded}, ${sql.json(detail)})
        `;
      } catch (err) {
        // 예외도 "전부 실패"로 취급해 복구를 시도한다 (가드 조건은 동일하게 유지).
        await sql`
          update public.meal_reminder_settings
          set next_notify_at = ${row.claimed_next_notify_at}
          where id = ${row.settings_id}
            and next_notify_at is null
        `;
        await sql`
          insert into public.notification_log
            (household_id, cat_id, kind, attempted, succeeded, failed, detail)
          values
            (${row.household_id}, ${row.cat_id}, 'meal_reminder', 0, 0, 0, ${sql.json({ error: String(err) })})
        `;
      }
    }

    // 진단 전용 로그가 무한히 쌓이지 않도록 매 실행마다 30일 이상 지난 행 정리.
    await sql`delete from public.notification_log where ran_at < now() - interval '30 days'`;

    return Response.json({
      claimed: claimed.length,
      attempted: totalAttempted,
      succeeded: totalSucceeded,
      failed: totalFailed,
    });
  } finally {
    await sql.end();
  }
});
