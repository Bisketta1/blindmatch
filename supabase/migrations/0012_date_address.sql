-- Real address + short description for a date. New *_v2 functions so nothing has to be dropped.
alter table public.date_proposals add column address text, add column description text;
alter table public.date_proposals add constraint date_proposals_text_len
  check (char_length(coalesce(address, '')) <= 300 and char_length(coalesce(description, '')) <= 400);

create function public.propose_date_v2(p_match uuid, p_starts timestamptz, p_place text, p_address text, p_description text, p_double boolean default false)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); m matches%rowtype; ca claims%rowtype; cb claims%rowtype; pid uuid;
begin
  select * into m from matches where id = p_match and status = 'active';
  if not found or not private.is_match_owner(p_match, me) then raise exception 'not allowed'; end if;
  if p_starts <= now() then raise exception 'date must be in the future'; end if;
  if coalesce(trim(p_address), '') = '' then raise exception 'address required'; end if;
  if p_double and not (select bool_and(open_to_double) from profiles where id in (m.single_a, m.single_b)) then
    raise exception 'double date not enabled by both singles';
  end if;
  select * into ca from claims where id = m.claim_a; select * into cb from claims where id = m.claim_b;
  insert into date_proposals (match_id, proposed_by, starts_at, place, address, description, double_date, approved_a, approved_b)
    values (p_match, me, p_starts, trim(p_place), trim(p_address), nullif(trim(coalesce(p_description, '')), ''), p_double, ca.matchmaker_id = me, cb.matchmaker_id = me)
    returning id into pid;
  return pid;
end $$;

create function public.get_match_proposals_v2(p_match uuid)
returns table (id uuid, starts_at timestamptz, place text, address text, description text, double_date boolean, status text, i_approved boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select d.id, d.starts_at, d.place, d.address, d.description, d.double_date, d.status,
    (ca.matchmaker_id = auth.uid() and d.approved_a) or (cb.matchmaker_id = auth.uid() and d.approved_b)
  from date_proposals d
  join matches m on m.id = d.match_id
  join claims ca on ca.id = m.claim_a join claims cb on cb.id = m.claim_b
  where d.match_id = p_match and (ca.matchmaker_id = auth.uid() or cb.matchmaker_id = auth.uid())
  order by d.created_at desc;
$$;

create function public.get_my_dates_v2()
returns table (invite_id uuid, status text, starts_at timestamptz, place text, address text, description text, double_date boolean,
               other_first_name text, clues jsonb, credit text, proposal_id uuid, proposal_status text, chat_open boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select i.id, i.status, d.starts_at, d.place, d.address, d.description, d.double_date, o.first_name,
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

revoke execute on function public.propose_date_v2(uuid, timestamptz, text, text, text, boolean), public.get_match_proposals_v2(uuid), public.get_my_dates_v2() from public, anon;
grant execute on function public.propose_date_v2(uuid, timestamptz, text, text, text, boolean), public.get_match_proposals_v2(uuid), public.get_my_dates_v2() to authenticated;
