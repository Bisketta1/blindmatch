-- Rolled back. Success: ERROR: ONE_LIVE_DATE_PASSED
do $$
declare
  j uuid := gen_random_uuid(); k uuid := gen_random_uuid(); e uuid := gen_random_uuid();
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  r jsonb; m1 uuid; m2 uuid; m3 uuid; p1 uuid; cnt int;
begin
  insert into auth.users (id, email, aud, role) select u, u::text || '@t.local', 'authenticated', 'authenticated' from unnest(array[j,k,e,a,b,c]) u;
  insert into profiles (id, first_name, birth_date, city, gender, looking_for, photos, matchable) values
    (j, 'Jon', '1998-01-01', 'Stockholm', 'man', '{}', '{a.jpg}', true), (k, 'Kas', '1997-01-01', 'Stockholm', 'man', '{}', '{a.jpg}', true),
    (e, 'Ell', '1998-02-02', 'Stockholm', 'kvinna', '{}', '{b.jpg}', true), (a, 'Mir', '1998-05-05', 'Stockholm', 'kvinna', '{}', '{b.jpg}', true),
    (b, 'Maj', '1998-06-06', 'Stockholm', 'kvinna', '{}', '{b.jpg}', true), (c, 'Sar', '1998-07-07', 'Stockholm', 'kvinna', '{}', '{b.jpg}', true);
  insert into friendships (requester, addressee, status) values (k, j, 'accepted'), (e, a, 'accepted'), (e, b, 'accepted'), (e, c, 'accepted');
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', k, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', k::text, true);
  perform swipe(j, a, 'yes'); perform swipe(j, b, 'yes'); perform swipe(j, c, 'yes');
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', e::text, true);
  r := swipe(a, j, 'yes'); m1 := (r->>'match_id')::uuid;
  r := swipe(b, j, 'yes'); m2 := (r->>'match_id')::uuid;
  r := swipe(c, j, 'yes'); m3 := (r->>'match_id')::uuid;
  if m1 is null or m2 is null or m3 is null then raise exception 'FAIL 0: three matches expected'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', k, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', k::text, true);
  p1 := propose_date_v2(m1, now() + interval '3 days', 'Fika', 'Drottninggatan 1, Stockholm', null, false);
  select count(*) into cnt from get_resting_matches(); if cnt <> 2 then raise exception 'FAIL 1: expected 2 resting, got %', cnt; end if;
  begin perform propose_date_v2(m2, now() + interval '4 days', 'Bio', 'Sveavagen 2, Stockholm', null, false); raise exception 'FAIL 2: second live date allowed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  -- cancel the first: the others can go ahead
  reset role; update date_proposals set status = 'cancelled' where id = p1; set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', k, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', k::text, true);
  select count(*) into cnt from get_resting_matches(); if cnt <> 0 then raise exception 'FAIL 3: still resting %', cnt; end if;
  perform propose_date_v2(m2, now() + interval '4 days', 'Bio', 'Sveavagen 2, Stockholm', null, false);
  raise exception 'ONE_LIVE_DATE_PASSED';
end $$;
