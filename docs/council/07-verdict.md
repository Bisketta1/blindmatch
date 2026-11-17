# Council verdict: blindmatch

## Where the council agrees
- The matchmaker-to-matchmaker chat is the real product; swipe is the wrapper.
- Cold start is the main risk. Start with one campus/city and hand-seed it.
- Consent: the people being swiped on must opt in to being matchable.
- Cut Super Like, voice notes and city-wide pool from the first test. Keep the loop small.
- Safety: 18+, block/report, delete account, privacy policy before real users.

## Where the council clashes
- Is the double-yes loop viable (Contrarian, First Principles: probably not as stated) vs. fixable (Executor: test it with seeded pool)?
- Product vision: dating app (Executor) vs. "introductions" platform (Expansionist).
- Whether swipe gestures matter (First Principles: no) vs. owner's explicit wish for a real-feeling swipe.

## Blind spots caught in peer review
Matchmaker incentive; singles' opt-in flow; quiet-pool/stalled-matchmaker fallback; store rules; Supabase free-tier pausing; collusion/abuse; moderation workload; kill criterion.

## Recommendation
Keep the concept, fix three structural problems, then build the Executor's cut:
1. Match rate: matches are asynchronous and never expire; a persistent pool; nudges when the other matchmaker has not answered (48 h reminder, 7 d auto-release). Everyone is both single and matchmaker, so the loop is reciprocal.
2. Consent: singles are on the app, opt in to "matchable", and know they have matchmakers. Only WHICH match/date stays hidden until the invite. The pool contains only opted-in, 18+ profiles.
3. Matchmaker incentive: matchmaker card (dates made), thank-you after a date, later gifts/Super Like.
MVP: auth, friend invite code/link with accept, Hinge-like profile (photos + prompts), swipe deck with Like and real card gestures (Reanimated), 10/day/friend, match function in Postgres with RLS, text chat (Realtime), date proposal with both-matchmaker approval then accept/decline, block/report/delete. Deferred until the first test succeeds: voice notes, Super Like and payments, push notifications, friends-of-friends ranking.
Parked expansion ideas (schema leaves room): generic "introductions" object, venue-funded dates, Blind Date Nights, four-person double dates, AI matchmaker copilot, matchmaker leaderboard.
Kill criterion: if fewer than 70% of test matchmakers finish their swipes, or no pair opens the chat unprompted within a week, rethink the loop before building more.

## The one thing to do first
Run the hand-seeded test with 8-12 friends from one place (this is the build's first milestone: schema, auth, friend link, deck, match function).
