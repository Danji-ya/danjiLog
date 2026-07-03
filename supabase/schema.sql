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

-- ------------------------------------------------------------
-- 2. profiles : auth.users 와 1:1, 가족 구성원 표시용
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

-- 신규 가입자가 생기면 profiles 행 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 3. records : 급수/급식 기록
-- ------------------------------------------------------------
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats (id) on delete cascade,
  type text not null check (type in ('water', 'food')),
  amount_ml integer not null check (amount_ml >= 0),
  recorded_at timestamptz not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists records_cat_id_recorded_at_idx
  on public.records (cat_id, recorded_at desc);

-- ------------------------------------------------------------
-- Row Level Security
-- 가족 구성원(로그인한 모든 사용자)은 동일한 데이터를 보고
-- 자유롭게 추가/수정/삭제할 수 있습니다. 권한 구분 없음.
-- ------------------------------------------------------------
alter table public.cats enable row level security;
alter table public.records enable row level security;
alter table public.profiles enable row level security;

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

-- records: 로그인 사용자 전체 CRUD 허용 (작성자와 무관하게 가족 모두 수정/삭제 가능)
drop policy if exists "records_select_authenticated" on public.records;
create policy "records_select_authenticated" on public.records
  for select to authenticated using (true);

drop policy if exists "records_insert_authenticated" on public.records;
create policy "records_insert_authenticated" on public.records
  for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "records_update_authenticated" on public.records;
create policy "records_update_authenticated" on public.records
  for update to authenticated using (true) with check (true);

drop policy if exists "records_delete_authenticated" on public.records;
create policy "records_delete_authenticated" on public.records
  for delete to authenticated using (true);

-- profiles: 로그인 사용자는 모든 프로필을 볼 수 있고, 자신의 프로필만 수정 가능
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ------------------------------------------------------------
-- 초기 고양이 1마리 생성 (이름은 필요에 맞게 수정하세요)
-- ------------------------------------------------------------
insert into public.cats (name)
select '단지'
where not exists (select 1 from public.cats);
