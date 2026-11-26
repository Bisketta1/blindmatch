-- Rolled back at the end. Success: ERROR: SAFETY_TESTS_PASSED
do $$
declare
  j uuid := gen_random_uuid(); m uuid := gen_random_uuid(); mi uuid := gen_random_uuid(); e uuid := gen_random_uuid(); x uuid := gen_random_uuid(); f uuid := gen_random_uuid();
  r jsonb; cnt int; mid uuid; pid uuid; inv record; rid uuid; res text; sid uuid; g jsonb; t0 timestamptz;
begin
  insert into auth.users (id, email, aud, role) select u, u::text || '@t.local', 'authenticated', 'authenticated' from unnest(array[j,m,mi,e,x,f]) u;
  insert into profiles (id, first_name, birth_date, city, gender, looking_for, photos, matchable) values
    (j, 'Jon', '1998-01-01', 'Stockholm', 'man', '{}', '{a.jpg}', true), (m, 'Mik', '1997-01-01', 'Stockholm', 'man', '{}', '{a.jpg}', true),
    (mi, 'Mir', '1998-05-05', 'Stockholm', 'kvinna', '{}', '{b.jpg}', true), (e, 'Ell', '1998-02-02', 'Stockholm', 'kvinna', '{}', '{b.jpg}', true),
    (x, 'Str', '1998-03-03', 'Stockholm', 'man', '{}', '{c.jpg}', true), (f, 'Fri', '1998-04-04', 'Stockholm', 'man', '{}', '{d.jpg}', true);
  insert into friendships (requester, addressee, status) values (m, j, 'accepted'), (e, mi, 'accepted'), (f, j, 'accepted');
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

  -- 1. Jon shares with friend Fri
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  begin perform share_date_with_friend(pid, x); raise exception 'FAIL 1a stranger as friend';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform share_date_with_friend(pid, mi); raise exception 'FAIL 1b other single as friend';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform share_date_with_friend(pid, j); raise exception 'FAIL 1c self';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  sid := share_date_with_friend(pid, f);
  g := get_my_share(pid);
  if g->'share'->>'trusted_name' <> 'Fri' then raise exception 'FAIL 1d: %', g; end if;
  if (g->>'window_open')::boolean then raise exception 'FAIL 1e: window open 3 days ahead'; end if;
  -- 2. only singles can share; matchmaker and stranger cannot
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', m::text, true);
  begin perform share_date_with_friend(pid, f); raise exception 'FAIL 2a matchmaker shared';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  if get_my_share(pid) is not null then raise exception 'FAIL 2b'; end if;
  -- 3. friend sees first name, place, address, time, nothing about Mir
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', f::text, true);
  select count(*) into cnt from get_shared_with_me();
  if cnt <> 1 then raise exception 'FAIL 3a: friend sees % rows', cnt; end if;
  if (select single_first_name from get_shared_with_me()) <> 'Jon' then raise exception 'FAIL 3b'; end if;
  if (get_badges()->>'friends')::int < 1 then raise exception 'FAIL 3c: no badge'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', x::text, true);
  select count(*) into cnt from get_shared_with_me(); if cnt <> 0 then raise exception 'FAIL 3d: stranger sees share'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', mi, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', mi::text, true);
  select count(*) into cnt from get_shared_with_me(); if cnt <> 0 then raise exception 'FAIL 3e: other single sees share'; end if;
  if get_my_share(pid)->'share' <> 'null'::jsonb then raise exception 'FAIL 3f: other single sees Jon share'; end if;
  -- 4. check-in outside window fails; inside window works; limits
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  begin perform safety_checkin(pid, 'arrived'); raise exception 'FAIL 4a early checkin';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  reset role; update date_proposals set starts_at = now() + interval '20 minutes' where id = pid; set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  begin perform safety_checkin(pid, 'panic'); raise exception 'FAIL 4b bad status';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  perform safety_checkin(pid, 'arrived');
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', f::text, true);
  if (select checkin from get_shared_with_me()) <> 'arrived' then raise exception 'FAIL 4c'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', mi, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', mi::text, true);
  begin perform safety_checkin(pid, 'ok'); raise exception 'FAIL 4d other single checkin';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  perform safety_checkin(pid, 'ok'); perform safety_checkin(pid, 'ok'); perform safety_checkin(pid, 'ok'); perform safety_checkin(pid, 'ok'); perform safety_checkin(pid, 'home');
  begin perform safety_checkin(pid, 'ok'); raise exception 'FAIL 4e too many';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  -- 5. friend declines: disappears for the single too; revoke hides it
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', f::text, true);
  perform respond_date_share(sid, false);
  select count(*) into cnt from get_shared_with_me(); if cnt <> 0 then raise exception 'FAIL 5a'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  if get_my_share(pid)->'share' <> 'null'::jsonb then raise exception 'FAIL 5b: declined share still active'; end if;
  sid := share_date_with_friend(pid, f);
  perform revoke_date_share(pid);
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', f::text, true);
  select count(*) into cnt from get_shared_with_me(); if cnt <> 0 then raise exception 'FAIL 5c: revoked share visible'; end if;
  -- 6. blocked friend cannot be chosen
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  reset role; insert into blocks (blocker, blocked) values (j, f); set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', j::text, true);
  begin perform share_date_with_friend(pid, f); raise exception 'FAIL 6 blocked friend';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  raise exception 'SAFETY_TESTS_PASSED';
end $$;
