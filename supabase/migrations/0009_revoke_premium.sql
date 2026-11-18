-- Lets a user switch their own premium off again (useful for testing the redeem code). Re-enter the code to get it back.
create function public.revoke_premium() returns void
language sql security definer set search_path = public, pg_temp as $$
  update profiles set premium = false where id = auth.uid();
$$;
revoke execute on function public.revoke_premium() from public, anon;
grant execute on function public.revoke_premium() to authenticated;
