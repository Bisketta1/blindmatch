create function public.get_friend_requests()
returns table (id uuid, requester uuid, first_name text)
language sql stable security definer set search_path = public, pg_temp as $$
  select f.id, f.requester, p.first_name
  from friendships f join profiles p on p.id = f.requester
  where f.addressee = auth.uid() and f.status = 'pending'
    and not private.is_blocked(auth.uid(), f.requester)
  order by f.created_at;
$$;
revoke execute on function public.get_friend_requests() from public, anon;
grant execute on function public.get_friend_requests() to authenticated;
