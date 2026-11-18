-- Run inside one transaction; ends with an exception so everything is rolled back.
-- Success looks like: ERROR: ALL_TESTS_PASSED
do $$
declare
  j uuid := gen_random_uuid(); n uuid := gen_random_uuid(); m uuid := gen_random_uuid();
  mi uuid := gen_random_uuid(); e uuid := gen_random_uuid(); s uuid := gen_random_uuid();
  mi2 uuid := gen_random_uuid();
  r jsonb; cnt int; mid uuid; pid uuid; inv record; claim_id uuid; i int;
  extra uuid[] := '{}'; x uuid;
  procedure_dummy int;
begin
  -- ---- setup as superuser ----
  for x in select unnest(array[j,n,m,mi,e,s,mi2]) loop
    insert into auth.users (id, email, aud, role) values (x, x::text || '@test.local', 'authenticated', 'authenticated');
  end loop;
  insert into profiles (id, first_name, birth_date, city, gender, looking_for, photos, matchable, open_to_double) values
    (j,  'Jonathan', '1998-01-01', 'Stockholm', 'man',    '{kvinna}', '{a.jpg}', true, true),
    (n,  'Noah',     '1997-01-01', 'Stockholm', 'man',    '{}',       '{a.jpg}', true, false),
    (m,  'Mikael',   '1996-01-01', 'Stockholm', 'man',    '{}',       '{a.jpg}', true, false),
    (mi, 'Miriam',   '1998-05-05', 'Stockholm', 'kvinna', '{man}',    '{b.jpg}', true, true),
    (e,  'Ella',     '1998-02-02', 'Stockholm', 'kvinna', '{}',       '{b.jpg}', true, false),
    (s,  'Sara',     '1998-03-03', 'Stockholm', 'kvinna', '{}',       '{b.jpg}', true, false),
    (mi2,'Mia',      '1999-05-05', 'Stockholm', 'kvinna', '{man}',    '{c.jpg}', true, false);
  insert into profile_answers (profile_id, prompt_id, answer, position) values (mi, 1, 'sushi och bokhandlar', 0);
  insert into friendships (requester, addressee, status) values
    (m, j, 'accepted'), (n, j, 'accepted'), (e, mi, 'accepted'), (s, mi, 'accepted');

  -- adults only
  begin
    insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000aa', 'kid@test.local');
    insert into profiles (id, first_name, birth_date) values ('00000000-0000-0000-0000-0000000000aa', 'Kid', current_date - interval '17 years');
    raise exception 'FAIL: underage profile accepted';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  set local role authenticated;

  -- ---- 1. deck for matchmaker M contains Miriam ----
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', m::text, true);
  select count(*) into cnt from get_deck(j) where candidate_id = mi;
  if cnt <> 1 then raise exception 'FAIL 1: Miriam missing from M deck'; end if;

  -- ---- 2. first yes claims ----
  r := swipe(j, mi, 'yes');
  if r->>'status' <> 'ok' or (r->>'claimed')::boolean is not true or (r->>'matched')::boolean then
    raise exception 'FAIL 2: %', r; end if;

  -- ---- 3. Noah no longer sees Miriam, and cannot swipe her ----
  perform set_config('request.jwt.claims', json_build_object('sub', n, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', n::text, true);
  select count(*) into cnt from get_deck(j) where candidate_id = mi;
  if cnt <> 0 then raise exception 'FAIL 3: claimed candidate still in other matchmaker deck'; end if;
  r := swipe(j, mi, 'yes');
  if r->>'status' <> 'not_eligible' then raise exception 'FAIL 3b: %', r; end if;

  -- ---- 4. Ella claims Jonathan for Miriam -> match with Mikael ----
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', e::text, true);
  r := swipe(mi, j, 'yes');
  if (r->>'matched')::boolean is not true then raise exception 'FAIL 4: no match %', r; end if;
  mid := (r->>'match_id')::uuid;

  -- ---- 5. Sara (other Miriam matchmaker) cannot get Jonathan ----
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', s::text, true);
  select count(*) into cnt from get_deck(mi) where candidate_id = j;
  if cnt <> 0 then raise exception 'FAIL 5: Sara sees claimed Jonathan'; end if;

  -- ---- 6. singles read nothing hidden ----
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', j::text, true);
  select (select count(*) from claims) + (select count(*) from matches) + (select count(*) from swipes) + (select count(*) from date_invites) into cnt;
  if cnt <> 0 then raise exception 'FAIL 6: single can read hidden rows (%)', cnt; end if;
  select count(*) into cnt from profiles where id = mi;
  if cnt <> 0 then raise exception 'FAIL 6b: single can read candidate profile before invite'; end if;

  -- ---- 7. chat: owners only ----
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', m::text, true);
  insert into messages (match_id, sender_id, body) values (mid, m, 'hej Ella!');
  perform set_config('request.jwt.claims', json_build_object('sub', n, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', n::text, true);
  begin
    insert into messages (match_id, sender_id, body) values (mid, n, 'jag tjuvlyssnar');
    raise exception 'FAIL 7: non-owner could send message';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- ---- 8. date: needs both matchmakers ----
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', m::text, true);
  pid := propose_date(mid, now() + interval '3 days', 'Fika på Drop Coffee', true);
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', j::text, true);
  select count(*) into cnt from get_my_invites();
  if cnt <> 0 then raise exception 'FAIL 8: invite visible before both approved'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', e::text, true);
  if approve_date(pid) <> 'sent' then raise exception 'FAIL 8b: not sent after both approved'; end if;

  -- ---- 9. invite contents: first name, clues, credit, no photo ----
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', j::text, true);
  select * into inv from get_my_invites();
  if inv.other_first_name <> 'Miriam' or inv.clues->0->>'answer' <> 'sushi och bokhandlar'
     or inv.credit not like '%Mikael%' or inv.credit not like '%Ella%' then
    raise exception 'FAIL 9: invite wrong %', to_jsonb(inv); end if;
  if to_jsonb(inv) ? 'photos' then raise exception 'FAIL 9b: photo in invite'; end if;
  if respond_invite(inv.invite_id, true) <> 'waiting' then raise exception 'FAIL 9c'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', mi, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', mi::text, true);
  select * into inv from get_my_invites();
  if respond_invite(inv.invite_id, true) <> 'confirmed' then raise exception 'FAIL 9d'; end if;

  -- ---- 10. daily cap of 10 per matchmaker-single pair ----
  reset role;
  for i in 1..10 loop
    x := gen_random_uuid(); extra := extra || x;
    insert into auth.users (id, email) values (x, x::text || '@test.local');
    insert into profiles (id, first_name, birth_date, city, gender, looking_for, photos, matchable)
      values (x, 'Extra' || i, '1999-01-01', 'Stockholm', 'kvinna', '{}', '{z.jpg}', true);
    insert into swipes (matchmaker_id, single_id, candidate_id, vote) values (n, j, x, 'no');
  end loop;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', n, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', n::text, true);
  r := swipe(j, mi2, 'no');
  if r->>'status' <> 'cap' then raise exception 'FAIL 10: cap not enforced %', r; end if;

  -- ---- 11. release makes candidate visible again ----
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', m::text, true);
  r := swipe(j, mi2, 'yes');
  select id into claim_id from claims where single_id = j and candidate_id = mi2 and status = 'active';
  perform release_claim(claim_id);
  reset role; set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', n, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', n::text, true);
  -- Noah is capped for today, so check eligibility via deck rather than swipe
  select count(*) into cnt from get_deck(j) where candidate_id = mi2;
  if cnt <> 1 then raise exception 'FAIL 11: released candidate not back in deck'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end $$;
