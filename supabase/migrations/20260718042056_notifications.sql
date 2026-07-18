-- ============================================================
-- 식사 알림(Web Push) 기능 — 테이블 + RLS + 트리거 + RPC
-- 설계 근거: docs/notification-architecture.md, docs/notification-db.md
-- ============================================================

-- ------------------------------------------------------------
-- 1. push_subscriptions : 기기별 Web Push 구독 (범용, household당 여러 행)
-- ------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_household_id_idx
  on public.push_subscriptions (household_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_household" on public.push_subscriptions;
create policy "push_subscriptions_select_household" on public.push_subscriptions
  for select to authenticated using (
    household_id in (select public.my_household_ids())
  );

drop policy if exists "push_subscriptions_insert_household" on public.push_subscriptions;
create policy "push_subscriptions_insert_household" on public.push_subscriptions
  for insert to authenticated with check (
    household_id in (select public.my_household_ids())
  );

drop policy if exists "push_subscriptions_update_household" on public.push_subscriptions;
create policy "push_subscriptions_update_household" on public.push_subscriptions
  for update to authenticated using (
    household_id in (select public.my_household_ids())
  ) with check (
    household_id in (select public.my_household_ids())
  );

drop policy if exists "push_subscriptions_delete_household" on public.push_subscriptions;
create policy "push_subscriptions_delete_household" on public.push_subscriptions
  for delete to authenticated using (
    household_id in (select public.my_household_ids())
  );

-- ------------------------------------------------------------
-- 2. meal_reminder_settings : cat당 1행, household 공유 알림 설정
-- next_notify_at은 records 트리거 + upsert_meal_reminder_settings RPC로만 갱신되는
-- 캐시 필드라, 클라이언트 직접 쓰기(insert/update)는 의도적으로 막는다 — select만 허용.
-- ------------------------------------------------------------
create table if not exists public.meal_reminder_settings (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid unique not null references public.cats (id) on delete cascade,
  enabled boolean not null default false,
  interval_minutes int not null check (interval_minutes > 0),
  next_notify_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_reminder_settings_due_idx
  on public.meal_reminder_settings (next_notify_at)
  where enabled and next_notify_at is not null;

alter table public.meal_reminder_settings enable row level security;

drop policy if exists "meal_reminder_settings_select_household" on public.meal_reminder_settings;
create policy "meal_reminder_settings_select_household" on public.meal_reminder_settings
  for select to authenticated using (
    cat_id in (select id from public.cats where household_id in (select public.my_household_ids()))
  );

-- ------------------------------------------------------------
-- 3. notification_log : 진단 전용 (사용자 노출 이력 아님)
-- ------------------------------------------------------------
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  cat_id uuid references public.cats (id) on delete set null,
  kind text not null default 'meal_reminder',
  ran_at timestamptz not null default now(),
  attempted int not null default 0,
  succeeded int not null default 0,
  failed int not null default 0,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notification_log_household_ran_at_idx
  on public.notification_log (household_id, ran_at desc);

alter table public.notification_log enable row level security;

drop policy if exists "notification_log_select_household" on public.notification_log;
create policy "notification_log_select_household" on public.notification_log
  for select to authenticated using (
    household_id in (select public.my_household_ids())
  );

-- ------------------------------------------------------------
-- 4. records 테이블 변경 — food 전용 부분 인덱스
-- MAX(recorded_at) WHERE cat_id=? AND type='food'를 인덱스 첫 행 조회만으로 처리.
-- ------------------------------------------------------------
create index if not exists records_cat_food_recorded_at_idx
  on public.records (cat_id, recorded_at desc)
  where type = 'food';

-- ------------------------------------------------------------
-- 5. next_notify_at 재계산 트리거 (records INSERT/UPDATE/DELETE)
-- ------------------------------------------------------------
create or replace function public.recompute_meal_reminder_next_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.meal_reminder_settings s
  set next_notify_at = case
        when s.enabled then (
          select max(recorded_at) + (s.interval_minutes || ' minutes')::interval
          from public.records
          where cat_id = s.cat_id and type = 'food'
        )
        else null
      end,
      updated_at = now()
  where s.cat_id in (new.cat_id, old.cat_id);

  return null; -- AFTER 트리거라 반환값은 무시됨
end;
$$;

-- Postgres는 INSERT/UPDATE/DELETE를 한 트리거로 묶으면 WHEN 절에서 NEW/OLD 중
-- 그 이벤트에 존재하지 않는 쪽을 참조하는 것 자체를 금지한다(DELETE엔 NEW가 없고,
-- INSERT엔 OLD가 없음 — "DELETE trigger's WHEN condition cannot reference NEW values").
-- 그래서 이벤트별로 트리거를 3개로 쪼개 각자 유효한 쪽만 참조한다.
drop trigger if exists records_meal_reminder_recompute on public.records;
drop trigger if exists records_meal_reminder_recompute_ins on public.records;
drop trigger if exists records_meal_reminder_recompute_upd on public.records;
drop trigger if exists records_meal_reminder_recompute_del on public.records;

create trigger records_meal_reminder_recompute_ins
  after insert on public.records
  for each row
  when (new.type = 'food')
  execute function public.recompute_meal_reminder_next_notify();

create trigger records_meal_reminder_recompute_upd
  after update on public.records
  for each row
  when (new.type = 'food' or old.type = 'food')
  execute function public.recompute_meal_reminder_next_notify();

create trigger records_meal_reminder_recompute_del
  after delete on public.records
  for each row
  when (old.type = 'food')
  execute function public.recompute_meal_reminder_next_notify();

revoke execute on function public.recompute_meal_reminder_next_notify() from public, anon, authenticated;

-- ------------------------------------------------------------
-- 6. RPC: upsert_push_subscription
-- household_id는 클라이언트가 명시적으로 넘기고, 서버는 소속만 검증한다.
-- ------------------------------------------------------------
create or replace function public.upsert_push_subscription(
  p_household_id uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth_key text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_household_id not in (select public.my_household_ids()) then
    raise exception '해당 household 소속이 아닙니다';
  end if;

  insert into public.push_subscriptions (household_id, endpoint, p256dh, auth_key, user_agent, last_seen_at)
  values (p_household_id, p_endpoint, p_p256dh, p_auth_key, p_user_agent, now())
  on conflict (endpoint) do update set
    household_id = excluded.household_id,
    p256dh = excluded.p256dh,
    auth_key = excluded.auth_key,
    user_agent = excluded.user_agent,
    last_seen_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.upsert_push_subscription(uuid, text, text, text, text) from public, anon;
grant execute on function public.upsert_push_subscription(uuid, text, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 7. RPC: upsert_meal_reminder_settings
-- next_notify_at은 VALUES/SET 안의 상관 서브쿼리로 쓰기 시점에 라이브 계산한다
-- (트리거와 동일한 방식 — 미리 계산해두면 트리거와의 TOCTOU 경합이 생김).
-- ------------------------------------------------------------
create or replace function public.upsert_meal_reminder_settings(
  p_cat_id uuid,
  p_enabled boolean,
  p_interval_minutes int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_cat_id not in (select id from public.cats where household_id in (select public.my_household_ids())) then
    raise exception '권한이 없는 고양이입니다';
  end if;

  insert into public.meal_reminder_settings (cat_id, enabled, interval_minutes, next_notify_at)
  values (
    p_cat_id,
    p_enabled,
    p_interval_minutes,
    case when p_enabled then (
      select max(recorded_at) + (p_interval_minutes || ' minutes')::interval
      from public.records
      where cat_id = p_cat_id and type = 'food'
    ) else null end
  )
  on conflict (cat_id) do update set
    enabled = excluded.enabled,
    interval_minutes = excluded.interval_minutes,
    next_notify_at = case when excluded.enabled then (
      select max(recorded_at) + (excluded.interval_minutes || ' minutes')::interval
      from public.records
      where cat_id = meal_reminder_settings.cat_id and type = 'food'
    ) else null end,
    updated_at = now();
end;
$$;

revoke execute on function public.upsert_meal_reminder_settings(uuid, boolean, int) from public, anon;
grant execute on function public.upsert_meal_reminder_settings(uuid, boolean, int) to authenticated;
