-- =====================================================================
-- Calendario: tarea programada que dispara los avisos cada minuto
-- Pegar en: SQL Editor > New query > Run  (se hace UNA sola vez)
--
-- Antes de ejecutarlo reemplazá:
--   TU_REFERENCIA  -> la primera parte de la URL de tu proyecto
--                     (si tu URL es https://abcdwxyz.supabase.co, es abcdwxyz)
--   TU_SECRETO     -> el mismo texto que cargaste como CRON_SECRET en la función
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Si ya existía una programación anterior, se reemplaza.
select cron.unschedule('recordatorios-calendario')
where exists (select 1 from cron.job where jobname = 'recordatorios-calendario');

select cron.schedule(
  'recordatorios-calendario',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://TU_REFERENCIA.supabase.co/functions/v1/recordatorios',
    headers := '{"Content-Type":"application/json","x-cron-secret":"TU_SECRETO"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Para ver si está corriendo:  select * from cron.job_run_details order by start_time desc limit 5;
-- Para detenerla:              select cron.unschedule('recordatorios-calendario');
