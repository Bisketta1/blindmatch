-- Photo storage (public bucket, unguessable file names, only owner can write into own folder)
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create function public.get_my_matches()
returns table (match_id uuid, status text, expires_at timestamptz, my_claim_id uuid, my_single uuid, my_single_name text,
               other_single uuid, other_single_name text, other_matchmaker uuid, other_matchmaker_name text)
language sql stable security definer set search_path = public, pg_temp as $$
  select m.id, m.status, m.expires_at, mine.id, mine.single_id, ps.first_name,
         mine.candidate_id, pc.first_name, other.matchmaker_id, po.first_name
  from matches m
  join claims mine on mine.id in (m.claim_a, m.claim_b) and mine.matchmaker_id = auth.uid()
  join claims other on other.id in (m.claim_a, m.claim_b) and other.id <> mine.id
  join profiles ps on ps.id = mine.single_id
  join profiles pc on pc.id = mine.candidate_id
  join profiles po on po.id = other.matchmaker_id
  where m.status in ('active','dated')
  order by m.created_at desc;
$$;

create function public.get_match_proposals(p_match uuid)
returns table (id uuid, starts_at timestamptz, place text, double_date boolean, status text, i_approved boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select d.id, d.starts_at, d.place, d.double_date, d.status,
    (ca.matchmaker_id = auth.uid() and d.approved_a) or (cb.matchmaker_id = auth.uid() and d.approved_b)
  from date_proposals d
  join matches m on m.id = d.match_id
  join claims ca on ca.id = m.claim_a join claims cb on cb.id = m.claim_b
  where d.match_id = p_match and (ca.matchmaker_id = auth.uid() or cb.matchmaker_id = auth.uid())
  order by d.created_at desc;
$$;

create function public.get_my_stats() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'matches_made', (select count(*) from matches m join claims c on c.id in (m.claim_a, m.claim_b) where c.matchmaker_id = auth.uid()),
    'dates_made', (select count(*) from date_proposals d join matches m on m.id = d.match_id
                   join claims c on c.id in (m.claim_a, m.claim_b)
                   where c.matchmaker_id = auth.uid() and d.status = 'confirmed'));
$$;

revoke execute on function public.get_my_matches(), public.get_match_proposals(uuid), public.get_my_stats() from public, anon;
grant execute on function public.get_my_matches(), public.get_match_proposals(uuid), public.get_my_stats() to authenticated;
