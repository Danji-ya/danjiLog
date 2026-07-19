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
  claimed_meal_id: string | null;
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
    // due 대상을 FOR UPDATE로 잠그고 next_notify_at을 null로 선점한다(겹친 tick의 이중 발송 방지).
    // 알림 대상 식사 id는 dedup 기록용으로 함께 캡처한다(정규 텍스트로).
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
      left join lateral (
        select r.id
        from public.records r
        where r.cat_id = d.cat_id and r.type = 'food'
        order by r.recorded_at desc
        limit 1
      ) lm on true
      where s.id = d.id
      returning
        s.id as settings_id,
        s.cat_id,
        c.household_id,
        c.name as cat_name,
        d.interval_minutes,
        d.next_notify_at as claimed_next_notify_at,
        lm.id::text as claimed_meal_id
    `;

    let totalAttempted = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;

    for (const row of claimed) {
      // 대상 하나의 처리를 try/catch로 감싸 예외도 "전부 실패"로 취급, 조용한 유실을 막는다.
      try {
        const subscriptions = await sql<SubscriptionRow[]>`
          select id, endpoint, p256dh, auth_key
          from public.push_subscriptions
          where household_id = ${row.household_id}
        `;

        const payload = {
          title: `${row.cat_name} 밥 줄 시간이에요`,
          body: `마지막 식사로부터 약 ${formatElapsed(row.interval_minutes)} 지났어요.`,
        };

        let succeeded = 0;
        const expiredIds: string[] = [];
        const deliveries: Array<{ endpoint: string; status: string }> = [];

        for (const sub of subscriptions) {
          const outcome = await sendPush(sub, payload);
          deliveries.push({ endpoint: sub.endpoint, status: outcome.status });
          if (outcome.status === "success") {
            succeeded += 1;
          } else if (outcome.status === "expired") {
            expiredIds.push(sub.id);
          }
        }

        if (expiredIds.length > 0) {
          await sql`delete from public.push_subscriptions where id in ${sql(expiredIds)}`;
        }

        // 구독이 있는데 전부 실패한 경우에만 next_notify_at을 복구해 다음 tick에 재시도한다.
        // 구독이 0건이면 알릴 대상이 없으니 재시도 없이 소진한다(무의미한 로그 반복 방지).
        if (succeeded === 0 && subscriptions.length > 0) {
          await sql`
            update public.meal_reminder_settings
            set next_notify_at = ${row.claimed_next_notify_at}
            where id = ${row.settings_id}
              and next_notify_at is null
          `;
        }

        totalAttempted += subscriptions.length;
        totalSucceeded += succeeded;
        totalFailed += subscriptions.length - succeeded;

        await sql`
          insert into public.notification_log (household_id, kind, dedup_key, attempted, succeeded, detail)
          values (
            ${row.household_id}, 'meal_reminder', ${row.claimed_meal_id},
            ${subscriptions.length}, ${succeeded},
            ${sql.json({ cat_id: row.cat_id, deliveries })}
          )
        `;
      } catch (err) {
        await sql`
          update public.meal_reminder_settings
          set next_notify_at = ${row.claimed_next_notify_at}
          where id = ${row.settings_id}
            and next_notify_at is null
        `;
        await sql`
          insert into public.notification_log (household_id, kind, dedup_key, attempted, succeeded, detail)
          values (
            ${row.household_id}, 'meal_reminder', ${row.claimed_meal_id},
            0, 0, ${sql.json({ cat_id: row.cat_id, error: String(err) })}
          )
        `;
      }
    }

    // dedup의 진실은 succeeded>0 행이므로, 진단용 실패/무발송(succeeded=0) 행만 오래된 것부터 정리.
    await sql`delete from public.notification_log where succeeded = 0 and ran_at < now() - interval '30 days'`;

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
