-- Rolled back at the end. Success: ERROR: DATE_CHAT_TESTS_PASSED
do $$
declare
  j uuid := gen_random_uuid(); m uuid := gen_random_uuid(); mi uuid := gen_random_uuid(); e uuid := gen_random_uuid(); x uuid := gen_random_uuid();
  r jsonb; cnt int; mid uuid; pid uuid; inv record;
begin
  insert into auth.users (id, email, aud, role) select u, u::text || '@t.local', 'authenticated', 'authenticated' from unnest(array[j,m,mi,e,x]) u;
  insert into profiles (id, first_name, birth_date, city, gender, looking_for, photos, matchable) values
    (j, 'Jon', '1998-01-01', 'Stockholm', 'man', '{}', '{a.jpg}', true), (m, 'Mik', '1997-01-01', 'Stockholm', 'man', '{}', '{a.jpg}', true),
    (mi, 'Mir', '1998-05-05', 'Stockholm', 'kvinna', '{}', '{b.jpg}', true), (e, 'Ell', '1998-02-02', 'Stockholm', 'kvinna', '{}', '{b.jpg}', true),
    (x, 'Str', '1998-03-03', 'Stockholm', 'man', '{}', '{c.jpg}', true);
  insert into friendships (requester, addressee, status) values (m, j, 'accepted'), (e, mi, 'accepted');
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', m::text, true);
  perform swipe(j, mi, 'yes');
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', e::text, true);
  r := swipe(mi, j, 'yes'); mid := (r->>'match_id')::uuid;
  if mid is null then raise exception 'FAIL setup: no match %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', m::text, true);
  pid := propose_date(mid, now() + interval '1 hour', 'Fika', false);
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', e::text, true);
  perform approve_date(pid);

  -- before the date is confirmed nobody can chat
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  begin insert into date_messages (proposal_id, sender_id, body) values (pid, j, 'för tidigt'); raise exception 'FAIL 1: chat open before confirmation';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  select * into inv from get_my_dates();
  perform respond_invite(inv.invite_id, true);
  perform set_config('request.jwt.claims', json_build_object('sub', mi, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', mi::text, true);
  select * into inv from get_my_dates();
  if respond_invite(inv.invite_id, true) <> 'confirmed' then raise exception 'FAIL 2: not confirmed'; end if;

  -- same-day chat works for the two singles
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  select * into inv from get_my_dates();
  if not inv.chat_open then raise exception 'FAIL 3: chat should be open today'; end if;
  insert into date_messages (proposal_id, sender_id, body) values (pid, j, 'Jag är framme!');
  perform set_config('request.jwt.claims', json_build_object('sub', mi, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', mi::text, true);
  select count(*) into cnt from date_messages where proposal_id = pid;
  if cnt <> 1 then raise exception 'FAIL 4: other single cannot read message (%)', cnt; end if;
  insert into date_messages (proposal_id, sender_id, body) values (pid, mi, 'Jag ser dig!');

  -- matchmakers and strangers cannot read or write
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', m::text, true);
  select count(*) into cnt from date_messages;
  if cnt <> 0 then raise exception 'FAIL 5: matchmaker can read date chat'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', x::text, true);
  begin insert into date_messages (proposal_id, sender_id, body) values (pid, x, 'hej'); raise exception 'FAIL 6: stranger can write';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  -- singles never get the other profile through the chat
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  select count(*) into cnt from profiles where id = mi;
  if cnt <> 0 then raise exception 'FAIL 7: single can read the other single profile'; end if;

  -- the chat is closed on other days
  reset role;
  update date_proposals set starts_at = now() + interval '3 days' where id = pid;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  begin insert into date_messages (proposal_id, sender_id, body) values (pid, j, 'för tidigt igen'); raise exception 'FAIL 8: chat open 3 days early';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  select * into inv from get_my_dates();
  if inv.chat_open then raise exception 'FAIL 9: chat_open should be false'; end if;

  reset role;
  raise exception 'DATE_CHAT_TESTS_PASSED';
end $$;
