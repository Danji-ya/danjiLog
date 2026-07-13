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

alter table public.records drop column if exists created_by;

create index if not exists records_cat_id_recorded_at_idx
  on public.records (cat_id, recorded_at desc);

-- ------------------------------------------------------------
-- household_id가 없는 기존 cats를 위한 1회성 백필.
-- household가 이미 하나라도 있으면 아무 것도 하지 않아 재실행해도 안전함.
-- ------------------------------------------------------------
do $$
declare
  v_household_id uuid;
  v_user_id uuid;
begin
  if not exists (select 1 from public.households) then
    insert into public.households (name) values (null) returning id into v_household_id;

    select id into v_user_id from auth.users order by created_at asc limit 1;

    if v_user_id is not null then
      insert into public.household_members (household_id, user_id, role)
      values (v_household_id, v_user_id, 'admin')
      on conflict do nothing;
    end if;

    update public.cats set household_id = v_household_id where household_id is null;
  end if;
end $$;

alter table public.cats alter column household_id set not null;

-- ------------------------------------------------------------
-- Row Level Security
-- 같은 household에 속한 계정끼리만 서로의 가구 정보/고양이/기록을
-- 조회·추가·수정·삭제할 수 있습니다. household_members의 초대(insert)와
-- 퇴출(delete)만 role = 'admin'에게 제한되고, 본인은 퇴출 대상에서 제외됩니다.
-- ------------------------------------------------------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.cats enable row level security;
alter table public.records enable row level security;

drop policy if exists "households_select_member" on public.households;
create policy "households_select_member" on public.households
  for select to authenticated using (
    id in (select household_id from public.household_members where user_id = auth.uid())
  );

drop policy if exists "household_members_select_same_household" on public.household_members;
create policy "household_members_select_same_household" on public.household_members
  for select to authenticated using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

drop policy if exists "household_members_insert_admin" on public.household_members;
create policy "household_members_insert_admin" on public.household_members
  for insert to authenticated with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'admin'
    )
  );

drop policy if exists "household_members_delete_admin" on public.household_members;
create policy "household_members_delete_admin" on public.household_members
  for delete to authenticated using (
    user_id <> auth.uid()
    and exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'admin'
    )
  );

drop policy if exists "cats_select_authenticated" on public.cats;
drop policy if exists "cats_insert_authenticated" on public.cats;
drop policy if exists "cats_update_authenticated" on public.cats;
drop policy if exists "cats_delete_authenticated" on public.cats;

drop policy if exists "cats_select_household" on public.cats;
create policy "cats_select_household" on public.cats
  for select to authenticated using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

drop policy if exists "cats_insert_household" on public.cats;
create policy "cats_insert_household" on public.cats
  for insert to authenticated with check (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

drop policy if exists "cats_update_household" on public.cats;
create policy "cats_update_household" on public.cats
  for update to authenticated using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  ) with check (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

drop policy if exists "cats_delete_household" on public.cats;
create policy "cats_delete_household" on public.cats
  for delete to authenticated using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
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
      where household_id in (select household_id from public.household_members where user_id = auth.uid())
    )
  );

drop policy if exists "records_insert_household" on public.records;
create policy "records_insert_household" on public.records
  for insert to authenticated with check (
    cat_id in (
      select id from public.cats
      where household_id in (select household_id from public.household_members where user_id = auth.uid())
    )
  );

drop policy if exists "records_update_household" on public.records;
create policy "records_update_household" on public.records
  for update to authenticated using (
    cat_id in (
      select id from public.cats
      where household_id in (select household_id from public.household_members where user_id = auth.uid())
    )
  ) with check (
    cat_id in (
      select id from public.cats
      where household_id in (select household_id from public.household_members where user_id = auth.uid())
    )
  );

drop policy if exists "records_delete_household" on public.records;
create policy "records_delete_household" on public.records
  for delete to authenticated using (
    cat_id in (
      select id from public.cats
      where household_id in (select household_id from public.household_members where user_id = auth.uid())
    )
  );
