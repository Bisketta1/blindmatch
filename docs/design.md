# blindmatch - design (v0.1, for approval)

## One-sentence pitch
Your friends find you a blind date: friends swipe for friends, and the two friends who each said yes plan the date together.

## Roles (everyone is both)
- **Single**: opted in to be matchable (18+). Has a Hinge-like profile.
- **Matchmaker**: a friend who has accepted the friend request and swipes on your behalf. Max 10 swipes/day per matchmaker-single pair.

## Core flow
1. Friends connect by invite link or profile code; the other person must accept. Block and report exist from day one.
2. A matchmaker opens the swipe deck for one of their friends and sees candidates (opted-in singles who are not that single's friends; friends-of-friends first, then same city, filtered by preferences). Real card-swipe gestures (Reanimated): swipe right = yes, left = pass. Like only for now.
3. **First yes wins (claim rule).** A "no" is a private pass and never blocks anyone. The first matchmaker of a single who swipes yes on a candidate *claims* that candidate for that single. From then on the candidate disappears from the deck of that single's other matchmakers, so nobody else can interfere with the conversation. A claim is released if its owner withdraws it, or after 7 days of silence (nudge at 48 h), and the candidate then reappears for the others.
4. **Pairing.** The claim is per side. Miriam's side works the same way: the first of Miriam's matchmakers who swiped yes on Jonathan holds Miriam's claim. When both sides hold an active claim, the singles are matched (not told) and the two claim owners get a chat with each other, where they see each other's profiles and decide if it is right. A matchmaker never sees candidates who are friends of themselves or of the single, and cannot be matchmaker on both sides of a match.
5. The two claim owners draft a date proposal (time + place). BOTH matchmakers must approve before it is sent.
6. Both singles receive an invite: time, place, the other single's **first name**, and 1-2 profile clues (e.g. "likes sushi"), **no photo**, plus "X and Y thought you'd click". They accept or decline. Only if both accept does the date happen; the other side is not told who declined.
7. After the date: short feedback, thank-you to matchmakers, matchmaker card counts dates.

## Timing rules
- Matches/proposals do not expire quickly: nudge the quiet matchmaker after 48 h; release after 7 days.

## Safety and consent
- 18+, opt-in to matchability, single can mute a matchmaker, block/report, delete account, Swedish privacy policy. Moderation = reports table read by hand for the first test.

## Language
Swedish-first; all strings via i18n (sv.json), profile prompts as ids with locale text, `locale` on profiles.

## Stack
Expo (React Native, TypeScript), Expo Router, Reanimated + gesture-handler, i18next. Supabase project `pdxdbcftaphdonrlpbwy` (free): auth, Postgres + RLS, Realtime chat, Storage (photos). Match logic in Postgres functions. Everything free tier; Supabase free projects pause when idle, keep this in mind for the test.

## Data model (first cut)
profiles(id, first_name, birth_date, city, gender, looking_for, locale, matchable, open_to_double, photos, bio) · prompts(id, text_sv, text_en) · profile_answers(profile_id, prompt_id, text) · friendships(a, b, status) · matchmaker_links(single_id, matchmaker_id, muted) · swipes(matchmaker_id, single_id, candidate_id, vote, day) · claims(single_id, candidate_id, matchmaker_id, status[active|released], created_at; unique active per single_id+candidate_id) · matches(single_a, single_b, claim_a, claim_b, status, expires_at) · threads/messages · date_proposals(match_id, time, place, double, approved_by_a, approved_by_b, status) · date_invites(proposal_id, single_id, status) · blocks · reports.
RLS everywhere. Singles can never read swipes/proposals/matches about themselves before an invite exists.

## Deferred (after first test)
Voice notes, Super Like and payments, push notifications, double-date feature (columns exist), Panel Room, Boost/Veto, taste profile, trust score, venue-funded dates, Blind Date Nights, AI copilot, English UI.

## MVP success / kill criteria
Test with 8-12 friends in one place with a seeded pool: >=70% of matchmakers finish their swipes; at least one pair opens the chat unprompted; one real date approved. Otherwise rethink the loop before building more.
