-- OPTIONAL: seeds ~20 fake candidate profiles (no login possible) for the first small test.
-- Run once in the Supabase SQL editor. Remove later with: delete from auth.users where email like 'seed+%@blindmatch.test';
do $$
declare
  names text[] := array['Elin','Maja','Sofia','Alva','Wilma','Freja','Selma','Linnea','Agnes','Tindra','Oscar','Hugo','Elias','Liam','Axel','Viktor','Isak','Albin','Melker','Leo'];
  i int; uid uuid; g text;
begin
  for i in 1..array_length(names, 1) loop
    uid := gen_random_uuid();
    g := case when i <= 10 then 'kvinna' else 'man' end;
    insert into auth.users (id, email, aud, role) values (uid, 'seed+' || i || '@blindmatch.test', 'authenticated', 'authenticated');
    insert into public.profiles (id, first_name, birth_date, city, gender, looking_for, bio, photos, matchable)
      values (uid, names[i], (date '1996-01-01' + (i * 97)), 'Stockholm', g, '{}',
              'Gillar långa promenader och dåliga skämt.', array['https://picsum.photos/seed/bm' || i || '/600/800'], true);
    insert into public.profile_answers (profile_id, prompt_id, answer, position) values
      (uid, 1, 'kanelbullar och en bra bok', 0), (uid, 2, 'sushi', 1);
  end loop;
end $$;
