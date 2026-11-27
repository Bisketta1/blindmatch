-- Rolled back. Success: ERROR: CHAT_DATED_TEST_PASSED
do $$
declare mid uuid; mm uuid; st uuid;
begin
  select m.id into mid from matches m where m.status = 'dated' limit 1;
  if mid is null then raise exception 'SKIP no dated match'; end if;
  select ca.matchmaker_id into mm from matches m join claims ca on ca.id = m.claim_a where m.id = mid;
  select single_a into st from matches where id = mid;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', mm, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', mm::text, true);
  insert into messages (match_id, sender_id, body) values (mid, mm, 'test');
  perform set_config('request.jwt.claims', json_build_object('sub', st, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', st::text, true);
  begin insert into messages (match_id, sender_id, body) values (mid, st, 'x'); raise exception 'FAIL single wrote';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  raise exception 'CHAT_DATED_TEST_PASSED';
end $$;
