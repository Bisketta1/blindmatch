-- Premium (unlimited swipes) unlocked by a redeem code. Codes are stored only as SHA-256 hashes, never in plain text.
alter table public.profiles add column premium boolean not null default false;

create function private.protect_premium() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and new.premium then raise exception 'premium cannot be set directly'; end if;
    if tg_op = 'UPDATE' and new.premium is distinct from old.premium then raise exception 'premium cannot be changed directly'; end if;
  end if;
  return new;
end $$;
create trigger profiles_protect_premium before insert or update on public.profiles
  for each row execute function private.protect_premium();

create table public.redeem_codes (code_hash text primary key, grants text not null default 'premium', created_at timestamptz not null default now());
alter table public.redeem_codes enable row level security; -- no policies: only redeem_code() reads it
create table public.code_attempts (user_id uuid not null, ok boolean not null, at timestamptz not null default now());
alter table public.code_attempts enable row level security;

create function public.redeem_code(p_code text) returns boolean
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me uuid := auth.uid(); h text; fails int; hit text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select count(*) into fails from code_attempts where user_id = me and ok = false and at > now() - interval '1 hour';
  if fails >= 10 then raise exception 'too many attempts'; end if;
  h := encode(digest(convert_to(lower(trim(p_code)), 'UTF8'), 'sha256'), 'hex');
  select grants into hit from redeem_codes where code_hash = h;
  insert into code_attempts (user_id, ok) values (me, hit is not null);
  if hit is null then return false; end if;
  if hit = 'premium' then update profiles set premium = true where id = me; end if;
  return true;
end $$;
revoke execute on function public.redeem_code(text) from public, anon;
grant execute on function public.redeem_code(text) to authenticated;

-- swipe(): premium users have no daily cap
create or replace function public.swipe(p_single uuid, p_candidate uuid, p_vote text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'Europe/Stockholm')::date;
  n int; v_swipe uuid; v_claim uuid; v_other claims%rowtype; v_match uuid; v_prem boolean;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_vote not in ('yes','no') then raise exception 'invalid vote'; end if;
  perform pg_advisory_xact_lock(hashtext(me::text || p_single::text));
  if not private.is_eligible_candidate(me, p_single, p_candidate) then
    return jsonb_build_object('status', 'not_eligible');
  end if;
  select coalesce(premium, false) into v_prem from profiles where id = me;
  select count(*) into n from swipes where matchmaker_id = me and single_id = p_single and swipe_day = today;
  if n >= 10 and not v_prem then return jsonb_build_object('status', 'cap', 'remaining', 0); end if;
  insert into swipes (matchmaker_id, single_id, candidate_id, vote, swipe_day)
    values (me, p_single, p_candidate, p_vote, today)
    on conflict (matchmaker_id, single_id, candidate_id) do nothing returning id into v_swipe;
  if v_swipe is null then return jsonb_build_object('status', 'duplicate'); end if;
  if p_vote = 'no' then
    return jsonb_build_object('status', 'ok', 'remaining', case when v_prem then 999 else 9 - n end, 'claimed', false, 'matched', false);
  end if;
  perform pg_advisory_xact_lock(hashtext('pair' || least(p_single, p_candidate)::text || greatest(p_single, p_candidate)::text));
  insert into claims (single_id, candidate_id, matchmaker_id) values (p_single, p_candidate, me)
    on conflict (single_id, candidate_id) where status = 'active' do nothing returning id into v_claim;
  if v_claim is null then
    delete from swipes where id = v_swipe;
    return jsonb_build_object('status', 'claimed_by_other');
  end if;
  select * into v_other from claims where single_id = p_candidate and candidate_id = p_single and status = 'active';
  if found and v_other.matchmaker_id <> me then
    insert into matches (claim_a, claim_b, single_a, single_b) values (v_claim, v_other.id, p_single, p_candidate)
      on conflict do nothing returning id into v_match;
  end if;
  return jsonb_build_object('status', 'ok', 'remaining', case when v_prem then 999 else 9 - n end, 'claimed', true, 'matched', v_match is not null, 'match_id', v_match);
end $$;
