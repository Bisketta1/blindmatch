-- 1) A matchmaker can add or fix address and description, also after the date is confirmed.
create function public.set_date_details(p_proposal uuid, p_address text, p_description text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); d date_proposals%rowtype;
begin
  select * into d from date_proposals where id = p_proposal and status in ('pending', 'sent', 'confirmed') for update;
  if not found then raise exception 'no such date'; end if;
  if not private.is_match_owner(d.match_id, me) then raise exception 'not allowed'; end if;
  if coalesce(trim(p_address), '') = '' then raise exception 'address required'; end if;
  update date_proposals set address = trim(p_address), description = nullif(trim(coalesce(p_description, '')), '') where id = d.id;
  insert into messages (match_id, sender_id, body) values (d.match_id, me, 'Jag uppdaterade adressen: ' || trim(p_address));
end $$;
revoke execute on function public.set_date_details(uuid, text, text) from public, anon;
grant execute on function public.set_date_details(uuid, text, text) to authenticated;

-- 2) A thank-you goes to BOTH matchmakers (the card says "tacka X och Y").
create or replace function public.submit_date_feedback(p_proposal uuid, p_verdict text, p_note text default null, p_thanks text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); d date_proposals%rowtype; m matches%rowtype; ca claims%rowtype; cb claims%rowtype;
        other_verdict text; mm uuid;
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
    foreach mm in array array[ca.matchmaker_id, cb.matchmaker_id] loop
      insert into thanks (proposal_id, from_single, to_matchmaker, body) values (p_proposal, me, mm, trim(p_thanks))
        on conflict (proposal_id, from_single, to_matchmaker) do update set body = excluded.body;
    end loop;
  end if;
  select verdict into other_verdict from date_feedback where proposal_id = p_proposal and author_id <> me;
  return jsonb_build_object('mutual', p_verdict = 'again' and other_verdict = 'again');
end $$;
