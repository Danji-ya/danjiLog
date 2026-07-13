-- ============================================================
-- danjiLog (고양이 급수급식 기록 앱) - Supabase 스키마 + RLS
-- Supabase SQL Editor에서 그대로 실행하세요.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. cats : 고양이 정보 (여러 마리 저장 가능, 현재 UI는 1번째만 사용)
-- ------------------------------------------------------------
create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  weight numeric(5, 2),
  birthday date,
  created_at timestamptz not null default now()
);

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.profiles;

-- ------------------------------------------------------------
-- 2. records : 급수/급식 기록
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
-- Row Level Security
-- 가족 구성원(로그인한 모든 사용자)은 동일한 데이터를 보고
-- 자유롭게 추가/수정/삭제할 수 있습니다. 권한 구분 없음.
-- ------------------------------------------------------------
alter table public.cats enable row level security;
alter table public.records enable row level security;

-- cats: 로그인 사용자 전체 CRUD 허용
drop policy if exists "cats_select_authenticated" on public.cats;
create policy "cats_select_authenticated" on public.cats
  for select to authenticated using (true);

drop policy if exists "cats_insert_authenticated" on public.cats;
create policy "cats_insert_authenticated" on public.cats
  for insert to authenticated with check (true);

drop policy if exists "cats_update_authenticated" on public.cats;
create policy "cats_update_authenticated" on public.cats
  for update to authenticated using (true) with check (true);

drop policy if exists "cats_delete_authenticated" on public.cats;
create policy "cats_delete_authenticated" on public.cats
  for delete to authenticated using (true);

-- records: 로그인 사용자 전체 CRUD 허용
drop policy if exists "records_select_authenticated" on public.records;
create policy "records_select_authenticated" on public.records
  for select to authenticated using (true);

drop policy if exists "records_insert_authenticated" on public.records;
create policy "records_insert_authenticated" on public.records
  for insert to authenticated with check (true);

drop policy if exists "records_update_authenticated" on public.records;
create policy "records_update_authenticated" on public.records
  for update to authenticated using (true) with check (true);

drop policy if exists "records_delete_authenticated" on public.records;
create policy "records_delete_authenticated" on public.records
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- 초기 고양이 1마리 생성 (이름은 필요에 맞게 수정하세요)
-- ------------------------------------------------------------
insert into public.cats (name)
select '단지'
where not exists (select 1 from public.cats);
