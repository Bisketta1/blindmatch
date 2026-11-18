-- Dev switch: while app_settings.date_chat_always_open = 'true', the date chat is open for any confirmed date (for testing).
-- Turn off before launch:  update app_settings set value = 'false' where key = 'date_chat_always_open';
insert into public.app_settings (key, value) values ('date_chat_always_open', 'true') on conflict (key) do nothing;

create or replace function private.date_chat_open(p_proposal uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from date_proposals d where d.id = p_proposal and d.status = 'confirmed'
    and (
      exists (select 1 from app_settings s where s.key = 'date_chat_always_open' and s.value = 'true')
      or (now() >= (date_trunc('day', d.starts_at at time zone 'Europe/Stockholm') at time zone 'Europe/Stockholm')
          and now() <= d.starts_at + interval '6 hours')));
$$;
