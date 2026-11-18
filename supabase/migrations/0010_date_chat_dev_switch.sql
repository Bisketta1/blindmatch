-- 1) Dev switch: while app_settings.demo_switch_for_everyone = 'true', EVERY user may switch into the demo accounts.
--    Turn off before launch:  update app_settings set value = 'false' where key = 'demo_switch_for_everyone';
create table public.app_settings (key text primary key, value text not null);
alter table public.app_settings enable row level security; -- no policies: only functions read it
insert into public.app_settings (key, value) values ('demo_switch_for_everyone', 'true');

create or replace function public.get_demo_accounts() returns table (id uuid, first_name text)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.id, p.first_name from profiles p
  where p.is_demo and auth.uid() is not null
    and (exists (select 1 from profiles me where me.id = auth.uid() and me.premium)
         or exists (select 1 from app_settings s where s.key = 'demo_switch_for_everyone' and s.value = 'true'))
  order by p.first_name;
$$;

-- 2) Date-day chat between the two singles (they never see each other's profile, only first names).
create function private.is_date_single(p_proposal uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from date_proposals d join matches m on m.id = d.match_id
                 where d.id = p_proposal and p_user in (m.single_a, m.single_b));
$$;

-- open from 00:00 (Stockholm) on the day of the date until 6 hours after it starts, only for a confirmed date
create function private.date_chat_open(p_proposal uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from date_proposals d where d.id = p_proposal and d.status = 'confirmed'
    and now() >= (date_trunc('day', d.starts_at at time zone 'Europe/Stockholm') at time zone 'Europe/Stockholm')
    and now() <= d.starts_at + interval '6 hours');
$$;
grant execute on function private.is_date_single(uuid, uuid), private.date_chat_open(uuid) to authenticated;

create table public.date_messages (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.date_proposals(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index date_messages_proposal on public.date_messages (proposal_id, created_at);
alter table public.date_messages enable row level security;
create policy date_messages_select on public.date_messages for select to authenticated
  using (private.is_date_single(proposal_id, auth.uid()));
create policy date_messages_insert on public.date_messages for insert to authenticated
  with check (sender_id = auth.uid() and private.is_date_single(proposal_id, auth.uid()) and private.date_chat_open(proposal_id));
alter publication supabase_realtime add table public.date_messages;

-- new function instead of changing get_my_invites(), so the migration has no DROP statement
create function public.get_my_dates()
returns table (invite_id uuid, status text, starts_at timestamptz, place text, double_date boolean,
               other_first_name text, clues jsonb, credit text, proposal_id uuid, proposal_status text, chat_open boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select i.id, i.status, d.starts_at, d.place, d.double_date, o.first_name,
    coalesce((select jsonb_agg(jsonb_build_object('prompt', pr.text_sv, 'answer', a.answer))
      from (select * from profile_answers where profile_id = o.id order by position limit 2) a
      join prompts pr on pr.id = a.prompt_id), '[]'::jsonb),
    (select string_agg(p.first_name, ' och ') from profiles p where p.id in (ca.matchmaker_id, cb.matchmaker_id)),
    d.id, d.status, private.date_chat_open(d.id)
  from date_invites i
  join date_proposals d on d.id = i.proposal_id and d.status in ('sent','confirmed')
  join matches m on m.id = d.match_id
  join claims ca on ca.id = m.claim_a join claims cb on cb.id = m.claim_b
  join profiles o on o.id = case when m.single_a = i.single_id then m.single_b else m.single_a end
  where i.single_id = auth.uid();
$$;
revoke execute on function public.get_my_dates() from public, anon;
grant execute on function public.get_my_dates() to authenticated;
