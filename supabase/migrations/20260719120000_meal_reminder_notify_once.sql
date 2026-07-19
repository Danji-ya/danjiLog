-- 식사(food record) 하나당 알림은 한 번만 울리게 한다.
-- notification_log를 범용 알림 로그로 정리하고, kind+dedup_key로 "한 번만"을 판정한다.
-- 식사 알림은 dedup_key에 food record id를 넣고, 재계산 시 마지막 식사가 아직
-- 안 울렸을 때만 예약한다.

-- notification_log를 특정 기능(고양이/식사)에 묶인 컬럼에서 떼어내 범용화.
-- 대상은 dedup_key(불투명 키)로 다루고, 부가 정보는 detail에 넣는다.
alter table public.notification_log
  add column if not exists dedup_key text,
  drop column if exists cat_id,
  drop column if exists failed,
  drop column if exists created_at,
  alter column kind drop default;

comment on table public.notification_log is '알림 이력 겸 종류별 1회 판정용. 임의로 지우지 말 것.';

create index if not exists notification_log_dedup_idx
  on public.notification_log (kind, dedup_key)
  where dedup_key is not null and succeeded > 0;

-- 마지막 식사 기준 다음 알림 시각. 이미 울린 식사거나 식사가 없으면 null.
create or replace function public.meal_reminder_next_at(
  p_cat_id uuid,
  p_interval_minutes int
)
returns timestamptz
language sql
security definer
set search_path = public
stable
as $$
  select case
           when exists (
             select 1 from public.notification_log l
             where l.kind = 'meal_reminder'
               and l.dedup_key = r.id::text
               and l.succeeded > 0
           )
           then null
           else r.recorded_at + (p_interval_minutes || ' minutes')::interval
         end
  from public.records r
  where r.cat_id = p_cat_id and r.type = 'food'
  order by r.recorded_at desc
  limit 1;
$$;

revoke execute on function public.meal_reminder_next_at(uuid, int) from public, anon, authenticated;

create or replace function public.recompute_meal_reminder_next_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.meal_reminder_settings s
  set next_notify_at = case
        when s.enabled then public.meal_reminder_next_at(s.cat_id, s.interval_minutes)
        else null
      end,
      updated_at = now()
  where s.cat_id in (new.cat_id, old.cat_id);

  return null;
end;
$$;

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
    case when p_enabled then public.meal_reminder_next_at(p_cat_id, p_interval_minutes) else null end
  )
  on conflict (cat_id) do update set
    enabled = excluded.enabled,
    interval_minutes = excluded.interval_minutes,
    next_notify_at = case when excluded.enabled
      then public.meal_reminder_next_at(meal_reminder_settings.cat_id, excluded.interval_minutes)
      else null end,
    updated_at = now();
end;
$$;

revoke execute on function public.upsert_meal_reminder_settings(uuid, boolean, int) from public, anon;
grant execute on function public.upsert_meal_reminder_settings(uuid, boolean, int) to authenticated;
