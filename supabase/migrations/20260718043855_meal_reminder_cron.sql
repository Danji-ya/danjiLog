-- ============================================================
-- 식사 알림 Cron — send-meal-reminders Edge Function을 5분마다 호출
-- pg_cron/pg_net/supabase_vault는 프로젝트에 이미 활성화되어 있음.
-- x-cron-secret 값은 이 파일에 직접 넣지 않고 Vault('cron_secret')에서 읽는다
-- (마이그레이션 파일은 git에 커밋되므로 실제 시크릿 값이 남으면 안 됨).
-- ============================================================

select cron.unschedule('meal-reminder-tick') where exists (
  select 1 from cron.job where jobname = 'meal-reminder-tick'
);

select cron.schedule(
  'meal-reminder-tick',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://bduvjclveyoorjtkaxqd.supabase.co/functions/v1/send-meal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
