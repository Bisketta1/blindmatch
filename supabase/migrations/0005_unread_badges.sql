create table public.match_reads (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
alter table public.match_reads enable row level security; -- no policies: only the functions below touch it

create function public.mark_match_read(p_match uuid) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into match_reads (match_id, user_id, last_read_at)
  select p_match, auth.uid(), now() where private.is_match_owner(p_match, auth.uid())
  on conflict (match_id, user_id) do update set last_read_at = now();
$$;

create function public.get_unread() returns table (match_id uuid, unread int)
language sql stable security definer set search_path = public, pg_temp as $$
  select m.id,
    greatest(
      (select count(*) from messages x where x.match_id = m.id and x.sender_id <> auth.uid()
         and x.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz))::int,
      case when r.match_id is null then 1 else 0 end)
  from matches m
  join claims c on c.id in (m.claim_a, m.claim_b) and c.matchmaker_id = auth.uid()
  left join match_reads r on r.match_id = m.id and r.user_id = auth.uid()
  where m.status in ('active','dated');
$$;

create function public.get_badges() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'chats',
      coalesce((select sum(unread) from public.get_unread()), 0)
      + (select count(*) from date_proposals d join matches m on m.id = d.match_id
           join claims ca on ca.id = m.claim_a join claims cb on cb.id = m.claim_b
         where d.status = 'pending'
           and ((ca.matchmaker_id = auth.uid() and not d.approved_a) or (cb.matchmaker_id = auth.uid() and not d.approved_b))),
    'dates', (select count(*) from date_invites i join date_proposals d on d.id = i.proposal_id and d.status = 'sent'
              where i.single_id = auth.uid() and i.status = 'sent'),
    'friends', (select count(*) from friendships f where f.addressee = auth.uid() and f.status = 'pending'),
    'matches', (select count(*) from public.get_unread()));
$$;

revoke execute on function public.mark_match_read(uuid), public.get_unread(), public.get_badges() from public, anon;
grant execute on function public.mark_match_read(uuid), public.get_unread(), public.get_badges() to authenticated;
