-- Demo/test accounts: with the premium code, the owner can switch into these (never into real users).
alter table public.profiles add column is_demo boolean not null default false;

create or replace function private.protect_premium() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and (new.premium or new.is_demo) then raise exception 'protected column'; end if;
    if tg_op = 'UPDATE' and (new.premium is distinct from old.premium or new.is_demo is distinct from old.is_demo) then
      raise exception 'protected column';
    end if;
  end if;
  return new;
end $$;

update public.profiles set is_demo = true
where id in (select id from auth.users where email in ('ella@blindmatch.test', 'jonathan@blindmatch.test', 'miriam@blindmatch.test'));

create function public.get_demo_accounts() returns table (id uuid, first_name text)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.id, p.first_name from profiles p
  where p.is_demo and exists (select 1 from profiles me where me.id = auth.uid() and me.premium)
  order by p.first_name;
$$;
revoke execute on function public.get_demo_accounts() from public, anon;
grant execute on function public.get_demo_accounts() to authenticated;
