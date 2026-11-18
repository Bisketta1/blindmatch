-- Hinge-style conversation starters in natural Swedish. Prompts 1-8 are the old wording and are no longer offered
-- in the app (it lists only id > 8), but stay so existing answers keep their text.
insert into public.prompts (text_sv, text_en) values
 ('En perfekt söndag för mig är', 'A perfect Sunday for me is'),
 ('Det här gör mig alltid på bra humör', 'This always puts me in a good mood'),
 ('Du ska dejta mig om du', 'Date me if you'),
 ('Jag nördar ner mig totalt i', 'I geek out on'),
 ('Min guilty pleasure är', 'My guilty pleasure is'),
 ('Ett litet äventyr jag vill ha med dig', 'A small adventure I want with you'),
 ('Det enklaste sättet att vinna mig är', 'The easiest way to win me over is'),
 ('Min mest oväntade talang är', 'My most unexpected talent is'),
 ('Det bästa jag lagat är', 'The best thing I have cooked is'),
 ('Jag är helt värdelös på', 'I am completely useless at'),
 ('Vi skulle funka ihop eftersom', 'We would work well together because'),
 ('Det senaste som fick mig att skratta högt', 'The last thing that made me laugh out loud'),
 ('Min drömresa är', 'My dream trip is'),
 ('En åsikt jag har som är lite för stark', 'An opinion I hold a bit too strongly'),
 ('På en första dejt vill jag helst', 'On a first date I would love to'),
 ('Min favoritfika är', 'My favourite fika is'),
 ('Något jag aldrig tröttnar på', 'Something I never get tired of'),
 ('Mina vänner skulle säga att jag är', 'My friends would say I am'),
 ('Jag vill lära mig', 'I want to learn'),
 ('Min hemliga superkraft är', 'My secret superpower is');

create function public.cancel_date_proposal(p_proposal uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare d date_proposals%rowtype;
begin
  select * into d from date_proposals where id = p_proposal and status in ('pending','sent') for update;
  if not found then return; end if;
  if not private.is_match_owner(d.match_id, auth.uid()) then raise exception 'not allowed'; end if;
  update date_proposals set status = 'cancelled' where id = d.id;
  update date_invites set status = 'declined', responded_at = now() where proposal_id = d.id and status = 'sent';
end $$;
revoke execute on function public.cancel_date_proposal(uuid) from public, anon;
grant execute on function public.cancel_date_proposal(uuid) to authenticated;
