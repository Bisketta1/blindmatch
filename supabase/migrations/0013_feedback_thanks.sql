-- After the date: private feedback from each single, thank-you notes to their matchmaker, and a matchmaker card.
create table public.date_feedback (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.date_proposals(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  verdict text not null check (verdict in ('again', 'not_for_me')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (proposal_id, author_id)
);
alter table public.date_feedback enable row level security; -- no policies: read/write only through the functions below

create table public.thanks (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.date_proposals(id) on delete cascade,
  from_single uuid not null references public.profiles(id) on delete cascade,
  to_matchmaker uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (proposal_id, from_single, to_matchmaker)
);
alter table public.thanks enable row level security;

create function public.submit_date_feedback(p_proposal uuid, p_verdict text, p_note text default null, p_thanks text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); d date_proposals%rowtype; m matches%rowtype; ca claims%rowtype; cb claims%rowtype;
        mm uuid; other_verdict text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_verdict not in ('again', 'not_for_me') then raise exception 'bad verdict'; end if;
  select * into d from date_proposals where id = p_proposal and status = 'confirmed';
  if not found then raise exception 'no such date'; end if;
  if not private.is_date_single(p_proposal, me) then raise exception 'not allowed'; end if;
  if d.starts_at > now() then raise exception 'date has not happened yet'; end if;
  insert into date_feedback (proposal_id, author_id, verdict, note)
    values (p_proposal, me, p_verdict, nullif(trim(coalesce(p_note, '')), ''))
    on conflict (proposal_id, author_id) do update set verdict = excluded.verdict, note = excluded.note;
  if coalesce(trim(p_thanks), '') <> '' then
    select * into m from matches where id = d.match_id;
    select * into ca from claims where id = m.claim_a; select * into cb from claims where id = m.claim_b;
    mm := case when ca.single_id = me then ca.matchmaker_id else cb.matchmaker_id end;
    insert into thanks (proposal_id, from_single, to_matchmaker, body) values (p_proposal, me, mm, trim(p_thanks))
      on conflict (proposal_id, from_single, to_matchmaker) do update set body = excluded.body;
  end if;
  select verdict into other_verdict from date_feedback where proposal_id = p_proposal and author_id <> me;
  return jsonb_build_object('mutual', p_verdict = 'again' and other_verdict = 'again');
end $$;

-- What I answered, and whether it is mutual. The other single's answer is never revealed unless both said "again".
create function public.get_date_feedback(p_proposal uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'mine', (select verdict from date_feedback where proposal_id = p_proposal and author_id = auth.uid()),
    'mutual', coalesce((select bool_and(verdict = 'again') and count(*) = 2 from date_feedback where proposal_id = p_proposal), false)
              and private.is_date_single(p_proposal, auth.uid()));
$$;

create function public.get_my_thanks() returns table (body text, from_first_name text, place text, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select t.body, p.first_name, d.place, t.created_at
  from thanks t join profiles p on p.id = t.from_single join date_proposals d on d.id = t.proposal_id
  where t.to_matchmaker = auth.uid() order by t.created_at desc;
$$;

create function public.get_matchmaker_card() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'matches_made', (select count(*) from matches m join claims c on c.id in (m.claim_a, m.claim_b) where c.matchmaker_id = auth.uid()),
    'dates_made', (select count(*) from date_proposals d join matches m on m.id = d.match_id
                   join claims c on c.id in (m.claim_a, m.claim_b) where c.matchmaker_id = auth.uid() and d.status = 'confirmed'),
    'dates_held', (select count(*) from date_proposals d join matches m on m.id = d.match_id
                   join claims c on c.id in (m.claim_a, m.claim_b) where c.matchmaker_id = auth.uid() and d.status = 'confirmed' and d.starts_at < now()),
    'liked', (select count(distinct d.id) from date_proposals d join matches m on m.id = d.match_id
              join claims c on c.id in (m.claim_a, m.claim_b) join date_feedback f on f.proposal_id = d.id and f.verdict = 'again'
              where c.matchmaker_id = auth.uid() and d.status = 'confirmed'),
    'thanks', (select count(*) from thanks where to_matchmaker = auth.uid()));
$$;

revoke execute on function public.submit_date_feedback(uuid, text, text, text), public.get_date_feedback(uuid), public.get_my_thanks(), public.get_matchmaker_card() from public, anon;
grant execute on function public.submit_date_feedback(uuid, text, text, text), public.get_date_feedback(uuid), public.get_my_thanks(), public.get_matchmaker_card() to authenticated;
