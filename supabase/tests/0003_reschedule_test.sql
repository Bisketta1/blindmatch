-- Rolled back at the end. Success: ERROR: RESCHEDULE_TESTS_PASSED
do $$
declare
  j uuid := gen_random_uuid(); m uuid := gen_random_uuid(); mi uuid := gen_random_uuid(); e uuid := gen_random_uuid(); x uuid := gen_random_uuid();
  r jsonb; cnt int; mid uuid; pid uuid; inv record; rid uuid; res text; g jsonb; t0 timestamptz;
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
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', m::text, true);
  pid := propose_date_v2(mid, now() + interval '3 days', 'Fika', 'Drottninggatan 1, Stockholm', null, false);
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', e::text, true);
  perform approve_date(pid);
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  select * into inv from get_my_dates_v2(); perform respond_invite(inv.invite_id, true);
  perform set_config('request.jwt.claims', json_build_object('sub', mi, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', mi::text, true);
  select * into inv from get_my_dates_v2(); perform respond_invite(inv.invite_id, true);
  reset role; select starts_at into t0 from date_proposals where id = pid; set local role authenticated;

  -- 1. a single can propose; nothing pending yet
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  g := get_reschedule(pid);
  if not (g->>'can_propose')::boolean or g->'pending' <> 'null'::jsonb then raise exception 'FAIL 1: initial state %', g; end if;
  -- 2. strangers and matchmakers cannot propose or respond; matchmakers can read
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', x::text, true);
  begin perform propose_reschedule(pid, now() + interval '4 days'); raise exception 'FAIL 2a: stranger proposed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform get_reschedule(pid); raise exception 'FAIL 2b: stranger read';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', m::text, true);
  begin perform propose_reschedule(pid, now() + interval '4 days'); raise exception 'FAIL 2c: matchmaker proposed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  g := get_reschedule(pid); if (g->>'can_propose')::boolean then raise exception 'FAIL 2d: matchmaker can_propose'; end if;

  -- 3. validation
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  begin perform propose_reschedule(pid, now() + interval '1 hour'); raise exception 'FAIL 3a: too soon accepted';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform propose_reschedule(pid, now() + interval '30 days'); raise exception 'FAIL 3b: too far accepted';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform propose_reschedule(pid, t0 + interval '1 minute'); raise exception 'FAIL 3c: same time accepted';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  -- 4. proposal A: expires lazily, original time stays
  rid := propose_reschedule(pid, now() + interval '4 days');
  begin perform propose_reschedule(pid, now() + interval '5 days'); raise exception 'FAIL 4a: second pending allowed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform respond_reschedule(rid, true); raise exception 'FAIL 4b: proposer accepted own proposal';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  reset role; update date_reschedules set expires_at = now() - interval '1 minute' where id = rid; set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', mi, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', mi::text, true);
  res := respond_reschedule(rid, true);
  if res <> 'expired' then raise exception 'FAIL 4c: expected expired, got %', res; end if;
  reset role; if (select starts_at from date_proposals where id = pid) <> t0 then raise exception 'FAIL 4d: time moved on expiry'; end if; set local role authenticated;

  -- 5. proposal B: declined, original time stays, system line visible to a matchmaker
  perform set_config('request.jwt.claims', json_build_object('sub', mi, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', mi::text, true);
  rid := propose_reschedule(pid, now() + interval '4 days');
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  res := respond_reschedule(rid, false);
  if res <> 'declined' then raise exception 'FAIL 5a: %', res; end if;
  reset role; if (select starts_at from date_proposals where id = pid) <> t0 then raise exception 'FAIL 5b: time moved on decline'; end if; set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', m::text, true);
  select count(*) into cnt from messages where match_id = mid and kind = 'system';
  if cnt < 3 then raise exception 'FAIL 5c: system lines for matchmakers: %', cnt; end if;

  -- 6. proposal C (third): accepted, time moves, dates list follows, limit reached afterwards
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  rid := propose_reschedule(pid, now() + interval '6 days');
  perform set_config('request.jwt.claims', json_build_object('sub', mi, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', mi::text, true);
  res := respond_reschedule(rid, true);
  if res <> 'accepted' then raise exception 'FAIL 6a: %', res; end if;
  select * into inv from get_my_dates_v2();
  if abs(extract(epoch from (inv.starts_at - (now() + interval '6 days')))) > 5 then raise exception 'FAIL 6b: invite shows old time'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  g := get_reschedule(pid);
  if (g->>'can_propose')::boolean or (g->>'total')::int <> 3 then raise exception 'FAIL 6c: limit state %', g; end if;
  begin perform propose_reschedule(pid, now() + interval '8 days'); raise exception 'FAIL 6d: fourth proposal allowed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  select count(*) into cnt from date_messages where proposal_id = pid and kind = 'system';
  if cnt < 4 then raise exception 'FAIL 6e: date chat system lines %', cnt; end if;

  -- 7. nothing is possible inside 2 hours of the start
  reset role; update date_proposals set starts_at = now() + interval '1 hour' where id = pid; delete from date_reschedules where proposal_id = pid; set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  begin perform propose_reschedule(pid, now() + interval '3 days'); raise exception 'FAIL 7: proposal accepted inside 2 hours';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  g := get_reschedule(pid); if (g->>'can_propose')::boolean then raise exception 'FAIL 7b: can_propose inside 2 hours'; end if;

  reset role;
  raise exception 'RESCHEDULE_TESTS_PASSED';
end $$;
