-- Council 2026-11-27: a single has at most ONE live date in flight. Other yes-pairs rest (stay matched, no date yet).
create function private.live_date_elsewhere(p_match uuid, p_exclude_proposal uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from matches me
    join matches o on o.id <> me.id and o.status in ('active', 'dated')
      and (o.single_a in (me.single_a, me.single_b) or o.single_b in (me.single_a, me.single_b))
    join date_proposals d on d.match_id = o.id and d.status in ('pending', 'sent', 'confirmed')
      and d.starts_at > now() - interval '8 hours' and d.id is distinct from p_exclude_proposal
    where me.id = p_match);
$$;

create function private.enforce_one_live_date() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status in ('pending', 'sent', 'confirmed') and private.live_date_elsewhere(new.match_id, new.id) then
    raise exception 'single has a live date';
  end if;
  return new;
end $$;
create trigger date_proposals_one_live before insert on public.date_proposals
  for each row execute function private.enforce_one_live_date();

-- Matchmaker view: which of my matches are resting (one of the singles has a live date in another match).
create function public.get_resting_matches() returns table (match_id uuid)
language sql stable security definer set search_path = public, pg_temp as $$
  select m.id from matches m
  join claims c on c.id in (m.claim_a, m.claim_b) and c.matchmaker_id = auth.uid()
  where m.status = 'active' and private.live_date_elsewhere(m.id, null)
    and not exists (select 1 from date_proposals d where d.match_id = m.id and d.status in ('pending', 'sent', 'confirmed'));
$$;
revoke execute on function public.get_resting_matches() from public, anon;
grant execute on function public.get_resting_matches() to authenticated;
