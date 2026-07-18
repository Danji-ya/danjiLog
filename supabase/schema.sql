-- ============================================================
-- danjiLog (고양이 급수급식 기록 앱) - Supabase 스키마 + RLS
-- Supabase SQL Editor에서 그대로 실행하세요.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. households : 계정(auth.users)이 속하는 가구 단위
-- ------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. household_members : 계정 ↔ 가구 다대다 연결. role로 admin/member 구분
-- ------------------------------------------------------------
create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_id_idx on public.household_members (user_id);

-- ------------------------------------------------------------
-- 3. cats : 고양이 정보 (가구별로 여러 마리 저장 가능, 현재 UI는 1번째만 사용)
-- ------------------------------------------------------------
create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  photo_url text,
  weight numeric(5, 2),
  birthday date,
  created_at timestamptz not null default now()
);

alter table public.cats add column if not exists household_id uuid references public.households (id) on delete cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.profiles;

-- ------------------------------------------------------------
-- 4. records : 급수/급식 기록
-- ------------------------------------------------------------
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats (id) on delete cascade,
  type text not null check (type in ('water', 'food')),
  amount_ml integer not null check (amount_ml >= 0),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.records drop column if exists created_by cascade;

create index if not exists records_cat_id_recorded_at_idx
  on public.records (cat_id, recorded_at desc);

-- ------------------------------------------------------------
-- Row Level Security
-- 같은 household에 속한 계정끼리만 서로의 가구 정보/고양이/기록을
-- 조회·추가·수정·삭제할 수 있습니다. household_members의 초대(insert)와
-- 퇴출(delete)만 role = 'admin'에게 제한되고, 본인과 그 household의
-- 창립자(households.created_by)는 퇴출 대상에서 제외됩니다.
-- ------------------------------------------------------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.cats enable row level security;
alter table public.records enable row level security;

-- household_members를 참조하는 정책이 household_members 자신을 대상으로 하면
-- Postgres가 "infinite recursion detected in policy"로 막는다. 아래 두 security
-- definer 함수로 조회를 우회해서 재귀를 끊는다.
create or replace function public.my_household_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id from public.household_members where user_id = auth.uid();
$$;

revoke execute on function public.my_household_ids() from public, anon;
grant execute on function public.my_household_ids() to authenticated;

create or replace function public.is_household_admin(p_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke execute on function public.is_household_admin(uuid) from public, anon;
grant execute on function public.is_household_admin(uuid) to authenticated;

drop policy if exists "households_select_member" on public.households;
create policy "households_select_member" on public.households
  for select to authenticated using (
    id in (select public.my_household_ids())
  );

drop policy if exists "household_members_select_same_household" on public.household_members;
create policy "household_members_select_same_household" on public.household_members
  for select to authenticated using (
    household_id in (select public.my_household_ids())
  );

drop policy if exists "household_members_insert_admin" on public.household_members;
create policy "household_members_insert_admin" on public.household_members
  for insert to authenticated with check (
    public.is_household_admin(household_id)
  );

drop policy if exists "household_members_delete_admin" on public.household_members;
create policy "household_members_delete_admin" on public.household_members
  for delete to authenticated using (
    user_id <> auth.uid()
    and user_id <> (select created_by from public.households where id = household_members.household_id)
    and public.is_household_admin(household_id)
  );

-- 가구 생성/코드 가입은 household_members_insert_admin 정책을 우회해야 하므로
-- security definer 함수로 처리합니다.
create or replace function public.create_household(p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  insert into public.households (name, created_by) values (p_name, auth.uid()) returning id into v_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, auth.uid(), 'admin');

  return v_household_id;
end;
$$;

revoke execute on function public.create_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;

create or replace function public.join_household_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  select id into v_household_id from public.households where invite_code = upper(p_code);

  if v_household_id is null then
    raise exception '유효하지 않은 코드입니다';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, auth.uid(), 'member')
  on conflict do nothing;

  return v_household_id;
end;
$$;

revoke execute on function public.join_household_by_code(text) from public, anon;
grant execute on function public.join_household_by_code(text) to authenticated;

drop policy if exists "cats_select_authenticated" on public.cats;
drop policy if exists "cats_insert_authenticated" on public.cats;
drop policy if exists "cats_update_authenticated" on public.cats;
drop policy if exists "cats_delete_authenticated" on public.cats;

drop policy if exists "cats_select_household" on public.cats;
create policy "cats_select_household" on public.cats
  for select to authenticated using (
    household_id in (select public.my_household_ids())
  );

drop policy if exists "cats_insert_household" on public.cats;
create policy "cats_insert_household" on public.cats
  for insert to authenticated with check (
    household_id in (select public.my_household_ids())
  );

drop policy if exists "cats_update_household" on public.cats;
create policy "cats_update_household" on public.cats
  for update to authenticated using (
    household_id in (select public.my_household_ids())
  ) with check (
    household_id in (select public.my_household_ids())
  );

drop policy if exists "cats_delete_household" on public.cats;
create policy "cats_delete_household" on public.cats
  for delete to authenticated using (
    household_id in (select public.my_household_ids())
  );

drop policy if exists "records_select_authenticated" on public.records;
drop policy if exists "records_insert_authenticated" on public.records;
drop policy if exists "records_update_authenticated" on public.records;
drop policy if exists "records_delete_authenticated" on public.records;

drop policy if exists "records_select_household" on public.records;
create policy "records_select_household" on public.records
  for select to authenticated using (
    cat_id in (
      select id from public.cats
      where household_id in (select public.my_household_ids())
    )
  );

drop policy if exists "records_insert_household" on public.records;
create policy "records_insert_household" on public.records
  for insert to authenticated with check (
    cat_id in (
      select id from public.cats
      where household_id in (select public.my_household_ids())
    )
  );

drop policy if exists "records_update_household" on public.records;
create policy "records_update_household" on public.records
  for update to authenticated using (
    cat_id in (
      select id from public.cats
      where household_id in (select public.my_household_ids())
    )
  ) with check (
    cat_id in (
      select id from public.cats
      where household_id in (select public.my_household_ids())
    )
  );

drop policy if exists "records_delete_household" on public.records;
create policy "records_delete_household" on public.records
  for delete to authenticated using (
    cat_id in (
      select id from public.cats
      where household_id in (select public.my_household_ids())
    )
  );

-- ------------------------------------------------------------
-- 식사 알림(Web Push) — docs/notification-*.md 참고
-- ------------------------------------------------------------

-- 5. push_subscriptions : 기기별 Web Push 구독
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

-- 6. meal_reminder_settings : cat당 1행. next_notify_at은 트리거/RPC 전용 캐시 필드라
-- 클라이언트 직접 insert/update는 막고 select만 허용한다.
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

-- 7. notification_log : 진단 전용 (사용자 노출 이력 아님)
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

-- food 기록 전용 부분 인덱스 — MAX(recorded_at) WHERE cat_id=? AND type='food'를
-- 인덱스 첫 행 조회만으로 처리하기 위함 (records_meal_reminder_recompute 트리거가 사용).
create index if not exists records_cat_food_recorded_at_idx
  on public.records (cat_id, recorded_at desc)
  where type = 'food';

-- next_notify_at 재계산 트리거 (records INSERT/UPDATE/DELETE 전부 감시)
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
-- INSERT엔 OLD가 없음). 그래서 이벤트별로 트리거를 3개로 쪼갠다.
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

-- RPC: upsert_push_subscription — household_id는 클라이언트가 명시하고 서버는 소속만 검증
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

-- RPC: upsert_meal_reminder_settings — next_notify_at은 쓰기 시점에 상관 서브쿼리로 라이브 계산
-- (트리거와 동일 방식, 미리 계산해두면 트리거와 TOCTOU 경합이 생김)
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
