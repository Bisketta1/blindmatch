-- Reschedule: either single proposes a new time on a confirmed date, the other single accepts or declines.
-- Rules (council 2026-11-26): one pending proposal per date, max 2 accepted changes and 3 proposals per date, only while the old start
-- is more than 2 h away, new time 2 h to 21 days from now, expires at the earlier of 24 h and 2 h before the old start (lazy, no cron).
alter table public.messages add column kind text not null default 'text' check (kind in ('text', 'system'));
alter table public.date_messages add column kind text not null default 'text' check (kind in ('text', 'system'));

create table public.date_reschedules (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.date_proposals(id) on delete cascade,
  proposed_by uuid not null references public.profiles(id) on delete cascade,
  old_starts_at timestamptz not null,
  new_starts_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz not null
);
create unique index date_reschedules_one_pending on public.date_reschedules (proposal_id) where status = 'pending';
alter table public.date_reschedules enable row level security; -- no policies: RPCs only

create function private.fmt_time(t timestamptz) returns text language sql stable as $$
  select to_char(t at time zone 'Europe/Stockholm', 'YYYY-MM-DD "kl" HH24:MI');
$$;

create function private.reschedule_note(p_proposal uuid, p_by uuid, p_text text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare d date_proposals%rowtype;
begin
  select * into d from date_proposals where id = p_proposal;
  insert into messages (match_id, sender_id, body, kind) values (d.match_id, p_by, p_text, 'system');
  insert into date_messages (proposal_id, sender_id, body, kind) values (p_proposal, p_by, p_text, 'system');
end $$;

create function private.expire_reschedules(p_proposal uuid) returns void
language sql security definer set search_path = public, pg_temp as $$
  update date_reschedules r set status = 'expired', responded_at = now()
  where r.proposal_id = p_proposal and r.status = 'pending'
    and (r.expires_at < now() or exists (select 1 from date_proposals d where d.id = r.proposal_id and d.starts_at - interval '2 hours' < now()));
$$;

create function public.propose_reschedule(p_proposal uuid, p_new_starts timestamptz) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); d date_proposals%rowtype; acc int; tot int; rid uuid; nm text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into d from date_proposals where id = p_proposal and status = 'confirmed' for update;
  if not found then raise exception 'no such date'; end if;
  if not private.is_date_single(p_proposal, me) then raise exception 'not allowed'; end if;
  perform private.expire_reschedules(p_proposal);
  if d.starts_at < now() + interval '2 hours' then raise exception 'too late to reschedule'; end if;
  if p_new_starts < now() + interval '2 hours' then raise exception 'new time too soon'; end if;
  if p_new_starts > now() + interval '21 days' then raise exception 'new time too far away'; end if;
  if abs(extract(epoch from (p_new_starts - d.starts_at))) < 300 then raise exception 'same time'; end if;
  select count(*) filter (where status = 'accepted'), count(*) filter (where status <> 'cancelled') into acc, tot
    from date_reschedules where proposal_id = p_proposal;
  if acc >= 2 or tot >= 3 then raise exception 'reschedule limit reached'; end if;
  insert into date_reschedules (proposal_id, proposed_by, old_starts_at, new_starts_at, expires_at)
    values (p_proposal, me, d.starts_at, p_new_starts, least(now() + interval '24 hours', d.starts_at - interval '2 hours'))
    returning id into rid;
  select first_name into nm from profiles where id = me;
  perform private.reschedule_note(p_proposal, me, nm || ' föreslog en ny tid: ' || private.fmt_time(p_new_starts) || ' (nu ' || private.fmt_time(d.starts_at) || ')');
  return rid;
end $$;

create function public.respond_reschedule(p_id uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); r date_reschedules%rowtype; d date_proposals%rowtype; nm text;
begin
  select * into r from date_reschedules where id = p_id for update;
  if not found then raise exception 'no such proposal'; end if;
  select * into d from date_proposals where id = r.proposal_id and status = 'confirmed' for update;
  if not found then raise exception 'no such date'; end if;
  if not private.is_date_single(d.id, me) or me = r.proposed_by then raise exception 'not allowed'; end if;
  if r.status <> 'pending' then raise exception 'not pending'; end if;
  if r.expires_at < now() or d.starts_at < now() + interval '2 hours' or r.new_starts_at < now() + interval '1 hour' then
    update date_reschedules set status = 'expired', responded_at = now() where id = r.id;
    return 'expired';
  end if;
  select first_name into nm from profiles where id = me;
  if p_accept then
    update date_proposals set starts_at = r.new_starts_at where id = d.id;
    update date_reschedules set status = 'accepted', responded_at = now() where id = r.id;
    perform private.reschedule_note(d.id, me, nm || ' tackade ja. Ny tid: ' || private.fmt_time(r.new_starts_at));
    return 'accepted';
  end if;
  update date_reschedules set status = 'declined', responded_at = now() where id = r.id;
  perform private.reschedule_note(d.id, me, nm || ' tackade nej. Tiden ligger kvar: ' || private.fmt_time(d.starts_at));
  return 'declined';
end $$;

create function public.cancel_reschedule(p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update date_reschedules set status = 'cancelled', responded_at = now()
    where id = p_id and proposed_by = auth.uid() and status = 'pending';
end $$;

create function public.get_reschedule(p_proposal uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); d date_proposals%rowtype; pend date_reschedules%rowtype; acc int; tot int; single boolean;
begin
  select * into d from date_proposals where id = p_proposal;
  if not found then return null; end if;
  single := private.is_date_single(p_proposal, me);
  if not single and not private.is_match_owner(d.match_id, me) then raise exception 'not allowed'; end if;
  perform private.expire_reschedules(p_proposal);
  select * into pend from date_reschedules where proposal_id = p_proposal and status = 'pending';
  select count(*) filter (where status = 'accepted'), count(*) filter (where status <> 'cancelled') into acc, tot
    from date_reschedules where proposal_id = p_proposal;
  return jsonb_build_object(
    'pending', case when pend.id is null then null else jsonb_build_object(
      'id', pend.id, 'mine', pend.proposed_by = me, 'by', (select first_name from profiles where id = pend.proposed_by),
      'new_starts_at', pend.new_starts_at, 'old_starts_at', pend.old_starts_at, 'expires_at', pend.expires_at) end,
    'accepted', acc, 'total', tot,
    'can_propose', single and d.status = 'confirmed' and d.starts_at > now() + interval '2 hours' and acc < 2 and tot < 3 and pend.id is null);
end $$;

revoke execute on function public.propose_reschedule(uuid, timestamptz), public.respond_reschedule(uuid, boolean), public.cancel_reschedule(uuid), public.get_reschedule(uuid) from public, anon;
grant execute on function public.propose_reschedule(uuid, timestamptz), public.respond_reschedule(uuid, boolean), public.cancel_reschedule(uuid), public.get_reschedule(uuid) to authenticated;
