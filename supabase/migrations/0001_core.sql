-- blindmatch core schema, RLS and rule functions (see docs/design.md)
create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------- tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 40),
  birth_date date not null,
  city text,
  gender text check (gender in ('man','kvinna','icke-binar')),
  looking_for text[] not null default '{}',
  bio text check (char_length(bio) <= 500),
  photos text[] not null default '{}',
  matchable boolean not null default false,
  open_to_double boolean not null default false,
  locale text not null default 'sv',
  friend_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_at timestamptz not null default now()
);

create function private.check_adult() returns trigger language plpgsql as $$
begin
  if new.birth_date > (current_date - interval '18 years') then
    raise exception 'must be 18 or older';
  end if;
  return new;
end $$;
create trigger profiles_adult before insert or update of birth_date on public.profiles
  for each row execute function private.check_adult();

create table public.prompts (
  id serial primary key,
  text_sv text not null,
  text_en text
);

create table public.profile_answers (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id int not null references public.prompts(id),
  answer text not null check (char_length(answer) between 1 and 300),
  position int not null default 0,
  primary key (profile_id, prompt_id)
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));

create table public.blocks (
  blocker uuid not null references public.profiles(id) on delete cascade,
  blocked uuid not null references public.profiles(id) on delete cascade,
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles(id) on delete cascade,
  reported uuid references public.profiles(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 1000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.muted_matchmakers (
  single_id uuid not null references public.profiles(id) on delete cascade,
  matchmaker_id uuid not null references public.profiles(id) on delete cascade,
  primary key (single_id, matchmaker_id)
);

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  matchmaker_id uuid not null references public.profiles(id) on delete cascade,
  single_id uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  vote text not null check (vote in ('yes','no')),
  swipe_day date not null default ((now() at time zone 'Europe/Stockholm')::date),
  created_at timestamptz not null default now(),
  unique (matchmaker_id, single_id, candidate_id)
);
create index swipes_cap on public.swipes (matchmaker_id, single_id, swipe_day);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  single_id uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  matchmaker_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','released')),
  created_at timestamptz not null default now(),
  released_at timestamptz
);
create unique index claims_one_active on public.claims (single_id, candidate_id) where status = 'active';

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  claim_a uuid not null references public.claims(id) on delete cascade,
  claim_b uuid not null references public.claims(id) on delete cascade,
  single_a uuid not null references public.profiles(id) on delete cascade,
  single_b uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','cancelled','dated')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
create unique index matches_one_active_pair on public.matches (least(single_a, single_b), greatest(single_a, single_b)) where status = 'active';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_match on public.messages (match_id, created_at);

create table public.date_proposals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  proposed_by uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  place text not null check (char_length(place) between 1 and 200),
  double_date boolean not null default false,
  approved_a boolean not null default false,
  approved_b boolean not null default false,
  status text not null default 'pending' check (status in ('pending','sent','confirmed','declined','cancelled')),
  created_at timestamptz not null default now()
);
create unique index proposals_one_open on public.date_proposals (match_id) where status in ('pending','sent','confirmed');

create table public.date_invites (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.date_proposals(id) on delete cascade,
  single_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'sent' check (status in ('sent','accepted','declined')),
  responded_at timestamptz,
  unique (proposal_id, single_id)
);

-- ---------- private helpers (not exposed through the API) ----------
create function private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from friendships f where f.status = 'accepted'
    and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a)));
$$;

create function private.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;

create function private.is_match_owner(p_match uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from matches m
    join claims ca on ca.id = m.claim_a join claims cb on cb.id = m.claim_b
    where m.id = p_match and (ca.matchmaker_id = p_user or cb.matchmaker_id = p_user));
$$;

create function private.can_see_profile(viewer uuid, target uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select viewer = target
    or (private.are_friends(viewer, target) and not private.is_blocked(viewer, target))
    or exists (select 1 from matches m
      join claims ca on ca.id = m.claim_a join claims cb on cb.id = m.claim_b
      where m.status in ('active','dated')
        and (ca.matchmaker_id = viewer or cb.matchmaker_id = viewer)
        and target in (m.single_a, m.single_b, ca.matchmaker_id, cb.matchmaker_id)
        and not private.is_blocked(viewer, target));
$$;

create function private.is_eligible_candidate(me uuid, p_single uuid, cand uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from profiles p join profiles s on s.id = p_single
    where p.id = cand and p.matchable and s.matchable
      and cand <> p_single and cand <> me
      and cardinality(p.photos) > 0
      and private.are_friends(me, p_single)
      and not exists (select 1 from muted_matchmakers mm where mm.single_id = p_single and mm.matchmaker_id = me)
      and not private.are_friends(me, cand)
      and not private.are_friends(p_single, cand)
      and not private.is_blocked(me, cand) and not private.is_blocked(p_single, cand) and not private.is_blocked(me, p_single)
      and not exists (select 1 from claims c where c.single_id = p_single and c.candidate_id = cand and c.status = 'active')
      and (s.looking_for = '{}' or p.gender = any (s.looking_for))
      and (p.looking_for = '{}' or s.gender = any (p.looking_for))
      and (s.city is null or p.city is null or lower(s.city) = lower(p.city))
  );
$$;

create function private.on_block() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from friendships where (requester = new.blocker and addressee = new.blocked) or (requester = new.blocked and addressee = new.blocker);
  update claims set status = 'released', released_at = now()
    where status = 'active' and ((matchmaker_id = new.blocker and single_id = new.blocked) or (matchmaker_id = new.blocked and single_id = new.blocker));
  return new;
end $$;
create trigger blocks_cleanup after insert on public.blocks for each row execute function private.on_block();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.prompts enable row level security;
alter table public.profile_answers enable row level security;
alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.muted_matchmakers enable row level security;
alter table public.swipes enable row level security;
alter table public.claims enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.date_proposals enable row level security;
alter table public.date_invites enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (private.can_see_profile(auth.uid(), id));
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy prompts_select on public.prompts for select to authenticated using (true);

create policy answers_select on public.profile_answers for select to authenticated using (private.can_see_profile(auth.uid(), profile_id));
create policy answers_write on public.profile_answers for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy friendships_select on public.friendships for select to authenticated using (requester = auth.uid() or addressee = auth.uid());

create policy blocks_own on public.blocks for all to authenticated using (blocker = auth.uid()) with check (blocker = auth.uid());
create policy reports_insert on public.reports for insert to authenticated with check (reporter = auth.uid());
create policy muted_own on public.muted_matchmakers for all to authenticated using (single_id = auth.uid()) with check (single_id = auth.uid());

create policy swipes_select on public.swipes for select to authenticated using (matchmaker_id = auth.uid());
create policy claims_select on public.claims for select to authenticated using (matchmaker_id = auth.uid());
create policy matches_select on public.matches for select to authenticated using (private.is_match_owner(id, auth.uid()));

create policy messages_select on public.messages for select to authenticated using (private.is_match_owner(match_id, auth.uid()));
create policy messages_insert on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and private.is_match_owner(match_id, auth.uid())
  and exists (select 1 from matches m where m.id = match_id and m.status = 'active'));

create policy proposals_select on public.date_proposals for select to authenticated using (private.is_match_owner(match_id, auth.uid()));
-- date_invites: no policy -> singles read only through get_my_invites()

-- ---------- public RPC functions ----------
create function public.request_friend(p_code text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); target uuid; fid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select id into target from profiles where friend_code = lower(trim(p_code));
  if target is null or target = me then raise exception 'invalid code'; end if;
  if private.is_blocked(me, target) then raise exception 'invalid code'; end if;
  update friendships set status = 'accepted' where requester = target and addressee = me and status = 'pending' returning id into fid;
  if fid is not null then return fid; end if;
  insert into friendships (requester, addressee) values (me, target)
    on conflict (least(requester, addressee), greatest(requester, addressee)) do nothing
    returning id into fid;
  return fid;
end $$;

create function public.respond_friend(p_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_accept then
    update friendships set status = 'accepted' where id = p_id and addressee = auth.uid() and status = 'pending';
  else
    delete from friendships where id = p_id and addressee = auth.uid() and status = 'pending';
  end if;
end $$;

create function public.get_deck(p_single uuid)
returns table (candidate_id uuid, first_name text, age int, city text, bio text, photos text[], answers jsonb)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.id, p.first_name, extract(year from age(p.birth_date))::int, p.city, p.bio, p.photos,
    coalesce((select jsonb_agg(jsonb_build_object('prompt', pr.text_sv, 'answer', a.answer) order by a.position)
              from profile_answers a join prompts pr on pr.id = a.prompt_id where a.profile_id = p.id), '[]'::jsonb)
  from profiles p
  where auth.uid() is not null
    and private.is_eligible_candidate(auth.uid(), p_single, p.id)
    and not exists (select 1 from swipes w where w.matchmaker_id = auth.uid() and w.single_id = p_single and w.candidate_id = p.id)
  order by exists (select 1 from friendships f where f.status = 'accepted'
      and ((f.requester = p.id and f.addressee in (select case when g.requester = p_single then g.addressee else g.requester end
             from friendships g where g.status = 'accepted' and p_single in (g.requester, g.addressee)))
        or (f.addressee = p.id and f.requester in (select case when g.requester = p_single then g.addressee else g.requester end
             from friendships g where g.status = 'accepted' and p_single in (g.requester, g.addressee))))) desc,
    p.created_at
  limit 20;
$$;

create function public.swipe(p_single uuid, p_candidate uuid, p_vote text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'Europe/Stockholm')::date;
  n int; v_swipe uuid; v_claim uuid; v_other claims%rowtype; v_match uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_vote not in ('yes','no') then raise exception 'invalid vote'; end if;
  perform pg_advisory_xact_lock(hashtext(me::text || p_single::text));
  if not private.is_eligible_candidate(me, p_single, p_candidate) then
    return jsonb_build_object('status', 'not_eligible');
  end if;
  select count(*) into n from swipes where matchmaker_id = me and single_id = p_single and swipe_day = today;
  if n >= 10 then return jsonb_build_object('status', 'cap', 'remaining', 0); end if;
  insert into swipes (matchmaker_id, single_id, candidate_id, vote, swipe_day)
    values (me, p_single, p_candidate, p_vote, today)
    on conflict (matchmaker_id, single_id, candidate_id) do nothing returning id into v_swipe;
  if v_swipe is null then return jsonb_build_object('status', 'duplicate'); end if;
  if p_vote = 'no' then
    return jsonb_build_object('status', 'ok', 'remaining', 9 - n, 'claimed', false, 'matched', false);
  end if;
  perform pg_advisory_xact_lock(hashtext('pair' || least(p_single, p_candidate)::text || greatest(p_single, p_candidate)::text));
  insert into claims (single_id, candidate_id, matchmaker_id) values (p_single, p_candidate, me)
    on conflict (single_id, candidate_id) where status = 'active' do nothing returning id into v_claim;
  if v_claim is null then
    delete from swipes where id = v_swipe;  -- lost the race: swipe does not count, candidate is claimed
    return jsonb_build_object('status', 'claimed_by_other');
  end if;
  select * into v_other from claims where single_id = p_candidate and candidate_id = p_single and status = 'active';
  if found and v_other.matchmaker_id <> me then
    insert into matches (claim_a, claim_b, single_a, single_b) values (v_claim, v_other.id, p_single, p_candidate)
      on conflict do nothing returning id into v_match;
  end if;
  return jsonb_build_object('status', 'ok', 'remaining', 9 - n, 'claimed', true, 'matched', v_match is not null, 'match_id', v_match);
end $$;

create function public.release_claim(p_claim uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare c claims%rowtype;
begin
  select * into c from claims where id = p_claim and matchmaker_id = auth.uid();
  if not found then return; end if;
  perform pg_advisory_xact_lock(hashtext('pair' || least(c.single_id, c.candidate_id)::text || greatest(c.single_id, c.candidate_id)::text));
  update claims set status = 'released', released_at = now()
    where id = p_claim and matchmaker_id = auth.uid() and status = 'active';
  if not found then return; end if;
  update matches set status = 'cancelled' where status = 'active' and p_claim in (claim_a, claim_b);
  update date_proposals set status = 'cancelled'
    where status in ('pending','sent') and match_id in (select id from matches where p_claim in (claim_a, claim_b));
  update date_invites set status = 'declined', responded_at = now()
    where status = 'sent' and proposal_id in (select id from date_proposals where status = 'cancelled');
end $$;

create function private.touch_match() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update matches set expires_at = now() + interval '7 days' where id = new.match_id and status = 'active';
  return new;
end $$;
create trigger messages_touch after insert on public.messages for each row execute function private.touch_match();
create trigger proposals_touch after insert or update on public.date_proposals for each row execute function private.touch_match();

-- housekeeping: call from a scheduled job (service role / pg_cron), not exposed to clients
create function private.release_stale_claims() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare n int := 0; r record;
begin
  for r in select id from matches where status = 'active' and expires_at < now()
    and not exists (select 1 from date_proposals d where d.match_id = matches.id and d.status in ('sent','confirmed'))
  loop
    update matches set status = 'cancelled' where id = r.id;
    update date_proposals set status = 'cancelled' where match_id = r.id and status = 'pending';
    update claims set status = 'released', released_at = now()
      where id in (select claim_a from matches where id = r.id union select claim_b from matches where id = r.id) and status = 'active';
    n := n + 1;
  end loop;
  update claims set status = 'released', released_at = now()
    where status = 'active' and created_at < now() - interval '7 days'
      and not exists (select 1 from matches m where m.status in ('active','dated') and claims.id in (m.claim_a, m.claim_b));
  return n;
end $$;

create function public.propose_date(p_match uuid, p_starts timestamptz, p_place text, p_double boolean default false) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); m matches%rowtype; ca claims%rowtype; cb claims%rowtype; pid uuid;
begin
  select * into m from matches where id = p_match and status = 'active';
  if not found or not private.is_match_owner(p_match, me) then raise exception 'not allowed'; end if;
  if p_starts <= now() then raise exception 'date must be in the future'; end if;
  if p_double and not (select bool_and(open_to_double) from profiles where id in (m.single_a, m.single_b)) then
    raise exception 'double date not enabled by both singles';
  end if;
  select * into ca from claims where id = m.claim_a; select * into cb from claims where id = m.claim_b;
  insert into date_proposals (match_id, proposed_by, starts_at, place, double_date, approved_a, approved_b)
    values (p_match, me, p_starts, p_place, p_double, ca.matchmaker_id = me, cb.matchmaker_id = me) returning id into pid;
  return pid;
end $$;

create function public.approve_date(p_proposal uuid) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); d date_proposals%rowtype; m matches%rowtype; ca claims%rowtype; cb claims%rowtype;
begin
  select * into d from date_proposals where id = p_proposal and status = 'pending' for update;
  if not found then raise exception 'no pending proposal'; end if;
  if d.starts_at <= now() then raise exception 'date is in the past'; end if;
  select * into m from matches where id = d.match_id and status = 'active';
  if not found then raise exception 'match not active'; end if;
  select * into ca from claims where id = m.claim_a; select * into cb from claims where id = m.claim_b;
  if me not in (ca.matchmaker_id, cb.matchmaker_id) then raise exception 'not allowed'; end if;
  update date_proposals set approved_a = approved_a or (me = ca.matchmaker_id),
                            approved_b = approved_b or (me = cb.matchmaker_id)
    where id = d.id returning * into d;
  if d.approved_a and d.approved_b then
    update date_proposals set status = 'sent' where id = d.id;
    insert into date_invites (proposal_id, single_id) values (d.id, m.single_a), (d.id, m.single_b);
    return 'sent';
  end if;
  return 'pending';
end $$;

create function public.get_my_invites()
returns table (invite_id uuid, status text, starts_at timestamptz, place text, double_date boolean,
               other_first_name text, clues jsonb, credit text)
language sql stable security definer set search_path = public, pg_temp as $$
  select i.id, i.status, d.starts_at, d.place, d.double_date, o.first_name,
    coalesce((select jsonb_agg(jsonb_build_object('prompt', pr.text_sv, 'answer', a.answer))
      from (select * from profile_answers where profile_id = o.id order by position limit 2) a
      join prompts pr on pr.id = a.prompt_id), '[]'::jsonb),
    (select string_agg(p.first_name, ' och ') from profiles p where p.id in (ca.matchmaker_id, cb.matchmaker_id))
  from date_invites i
  join date_proposals d on d.id = i.proposal_id and d.status in ('sent','confirmed')
  join matches m on m.id = d.match_id
  join claims ca on ca.id = m.claim_a join claims cb on cb.id = m.claim_b
  join profiles o on o.id = case when m.single_a = i.single_id then m.single_b else m.single_a end
  where i.single_id = auth.uid();
$$;

create function public.respond_invite(p_invite uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare i date_invites%rowtype; d date_proposals%rowtype; accepted int;
begin
  select proposal_id into i.proposal_id from date_invites where id = p_invite and single_id = auth.uid();
  if not found then raise exception 'no open invite'; end if;
  select * into d from date_proposals where id = i.proposal_id and status = 'sent' for update;
  if not found then raise exception 'proposal closed'; end if;
  select * into i from date_invites where id = p_invite and single_id = auth.uid() and status = 'sent';
  if not found then raise exception 'no open invite'; end if;
  if d.starts_at <= now() then raise exception 'date is in the past'; end if;
  update date_invites set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now() where id = i.id;
  if not p_accept then
    update date_proposals set status = 'declined' where id = d.id;
    return 'declined';
  end if;
  select count(*) into accepted from date_invites where proposal_id = d.id and status = 'accepted';
  if accepted = 2 then
    update date_proposals set status = 'confirmed' where id = d.id;
    update matches set status = 'dated' where id = d.match_id;
    return 'confirmed';
  end if;
  return 'waiting';
end $$;

create function public.delete_account() returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- grants ----------
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.request_friend(text), public.respond_friend(uuid, boolean), public.get_deck(uuid),
  public.swipe(uuid, uuid, text), public.release_claim(uuid), public.propose_date(uuid, timestamptz, text, boolean),
  public.approve_date(uuid), public.get_my_invites(), public.respond_invite(uuid, boolean), public.delete_account() to authenticated;
grant execute on all functions in schema private to authenticated;
revoke execute on function private.release_stale_claims() from authenticated, public;

alter publication supabase_realtime add table public.messages;

-- seed prompts (Swedish first)
insert into public.prompts (text_sv, text_en) values
 ('Det bästa med en perfekt söndag är', 'The best part of a perfect Sunday is'),
 ('Jag blir omöjligt glad av', 'I get ridiculously happy about'),
 ('Min guilty pleasure är', 'My guilty pleasure is'),
 ('Du ska dejta mig om du gillar', 'Date me if you like'),
 ('Det bästa jag lagat är', 'The best thing I have cooked is'),
 ('Jag kan lära dig att', 'I can teach you to'),
 ('Min märkligaste talang är', 'My weirdest talent is'),
 ('Ett äventyr jag vill ha är', 'An adventure I want is');
