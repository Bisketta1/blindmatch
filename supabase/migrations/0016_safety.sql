-- Date safety (council 2026-11-26): a single can share a confirmed date with ONE accepted in-app friend.
-- The friend sees the single's first name, time, venue and address, and the check-in status. Never the other single, chat or photos.
-- No push, no location. RPCs only (no table policies). Honest copy in the UI: not an emergency service.
create table public.date_safety_shares (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.date_proposals(id) on delete cascade,
  single_id uuid not null references public.profiles(id) on delete cascade,
  trusted_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked', 'declined')),
  checkin text not null default 'none' check (checkin in ('none', 'arrived', 'ok', 'home', 'left')),
  checkin_at timestamptz,
  events int not null default 0,
  created_at timestamptz not null default now(),
  unique (proposal_id, single_id),
  check (single_id <> trusted_id)
);
alter table public.date_safety_shares enable row level security;

create function public.share_date_with_friend(p_proposal uuid, p_friend uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); d date_proposals%rowtype; m matches%rowtype; sid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into d from date_proposals where id = p_proposal and status = 'confirmed';
  if not found then raise exception 'no such date'; end if;
  if not private.is_date_single(p_proposal, me) then raise exception 'not allowed'; end if;
  if p_friend = me or not private.are_friends(me, p_friend) or private.is_blocked(me, p_friend) then raise exception 'not a friend'; end if;
  select * into m from matches where id = d.match_id;
  if p_friend in (m.single_a, m.single_b) then raise exception 'not allowed'; end if;
  if d.starts_at + interval '12 hours' < now() then raise exception 'date is over'; end if;
  insert into date_safety_shares (proposal_id, single_id, trusted_id) values (p_proposal, me, p_friend)
    on conflict (proposal_id, single_id) do update set trusted_id = excluded.trusted_id, status = 'active', checkin = 'none', checkin_at = null, events = 0
    returning id into sid;
  return sid;
end $$;

create function public.revoke_date_share(p_proposal uuid) returns void
language sql security definer set search_path = public, pg_temp as $$
  update date_safety_shares set status = 'revoked' where proposal_id = p_proposal and single_id = auth.uid();
$$;

create function public.respond_date_share(p_share uuid, p_accept boolean) returns void
language sql security definer set search_path = public, pg_temp as $$
  update date_safety_shares set status = case when p_accept then 'active' else 'declined' end
  where id = p_share and trusted_id = auth.uid() and status in ('active', 'declined');
$$;

create function public.safety_checkin(p_proposal uuid, p_status text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); d date_proposals%rowtype; s date_safety_shares%rowtype;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_status not in ('arrived', 'ok', 'home', 'left') then raise exception 'bad status'; end if;
  select * into d from date_proposals where id = p_proposal and status = 'confirmed';
  if not found then raise exception 'no such date'; end if;
  select * into s from date_safety_shares where proposal_id = p_proposal and single_id = me and status = 'active' for update;
  if not found then raise exception 'not shared'; end if;
  if now() < d.starts_at - interval '1 hour' or now() > d.starts_at + interval '8 hours' then raise exception 'outside check-in window'; end if;
  if s.events >= 6 then raise exception 'too many check-ins'; end if;
  update date_safety_shares set checkin = p_status, checkin_at = now(), events = events + 1 where id = s.id;
end $$;

-- For the single: the share on this date, and whether check-in is open now.
create function public.get_my_share(p_proposal uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); d date_proposals%rowtype; s date_safety_shares%rowtype;
begin
  select * into d from date_proposals where id = p_proposal;
  if not found or not private.is_date_single(p_proposal, me) then return null; end if;
  select * into s from date_safety_shares where proposal_id = p_proposal and single_id = me and status = 'active';
  return jsonb_build_object(
    'share', case when s.id is null then null else jsonb_build_object(
      'trusted_id', s.trusted_id, 'trusted_name', (select first_name from profiles where id = s.trusted_id), 'checkin', s.checkin, 'checkin_at', s.checkin_at, 'events', s.events) end,
    'window_open', now() >= d.starts_at - interval '1 hour' and now() <= d.starts_at + interval '8 hours');
end $$;

-- For the trusted friend: only first name, time, venue, address and check-in status. Old rows simply stop showing after 12 hours; purge of old rows is left for a later approved cleanup.
create function public.get_shared_with_me() returns table (share_id uuid, single_first_name text, place text, address text, starts_at timestamptz, checkin text, checkin_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  return query
    select s.id, p.first_name, d.place, d.address, d.starts_at, s.checkin, s.checkin_at
    from date_safety_shares s
    join date_proposals d on d.id = s.proposal_id and d.status = 'confirmed'
    join profiles p on p.id = s.single_id
    where s.trusted_id = auth.uid() and s.status = 'active' and d.starts_at + interval '12 hours' > now()
      and not private.is_blocked(auth.uid(), s.single_id)
    order by d.starts_at;
end $$;

create or replace function public.get_badges() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'chats',
      coalesce((select sum(unread) from public.get_unread()), 0)
      + (select count(*) from date_proposals d join matches m on m.id = d.match_id
           join claims ca on ca.id = m.claim_a join claims cb on cb.id = m.claim_b
         where d.status = 'pending'
           and ((ca.matchmaker_id = auth.uid() and not d.approved_a) or (cb.matchmaker_id = auth.uid() and not d.approved_b))),
    'dates', (select count(*) from date_invites i join date_proposals d on d.id = i.proposal_id and d.status = 'sent'
              where i.single_id = auth.uid() and i.status = 'sent')
             + (select count(*) from date_reschedules r join date_proposals d on d.id = r.proposal_id
                where r.status = 'pending' and r.proposed_by <> auth.uid() and r.expires_at > now() and private.is_date_single(d.id, auth.uid())),
    'friends', (select count(*) from friendships f where f.addressee = auth.uid() and f.status = 'pending')
               + (select count(*) from date_safety_shares s join date_proposals d on d.id = s.proposal_id
                  where s.trusted_id = auth.uid() and s.status = 'active' and d.starts_at + interval '12 hours' > now()),
    'matches', (select count(*) from public.get_unread()));
$$;

revoke execute on function public.share_date_with_friend(uuid, uuid), public.revoke_date_share(uuid), public.respond_date_share(uuid, boolean),
  public.safety_checkin(uuid, text), public.get_my_share(uuid), public.get_shared_with_me() from public, anon;
grant execute on function public.share_date_with_friend(uuid, uuid), public.revoke_date_share(uuid), public.respond_date_share(uuid, boolean),
  public.safety_checkin(uuid, text), public.get_my_share(uuid), public.get_shared_with_me() to authenticated;
