# blindmatch MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native, in one session) with a Fable review per phase. Steps use checkbox syntax.

**Goal:** A working Swedish-first Expo app where matchmakers swipe for friends, the first yes on each side claims the candidate, the two claim owners chat and get both-approval on a date proposal that is sent as a blind invite.

**Architecture:** Expo Router app talks directly to Supabase (auth, Postgres+RLS, Realtime, Storage). All business rules (daily swipe cap, claim, match, release, invite visibility) live in Postgres functions (SECURITY DEFINER, RPC) so the client cannot cheat and singles cannot read hidden data.

**Tech Stack:** Expo SDK (TypeScript, Expo Router), react-native-reanimated + gesture-handler, i18next + expo-localization, Supabase (project ref `pdxdbcftaphdonrlpbwy`, name blinddate-friends), Jest for app logic, SQL tests via `execute_sql` in a transaction.

**Spec:** `docs/design.md`, `docs/council/07-verdict.md`, `docs/council/11-round2-verdict.md`

## Global Constraints
- 18+ only; singles must opt in (`profiles.matchable = true`) to appear in any deck.
- Max 10 swipes per day per matchmaker-single pair (day = Europe/Stockholm date).
- A "no" never blocks; first "yes" on a side claims the candidate for that single; others no longer see it; claim released on withdraw or after 7 days (nudge at 48 h).
- Singles never read swipes/claims/matches about themselves; first date visibility is the invite only (time, place, first name, 1-2 clues, no photo, "X and Y thought you'd click").
- Both claim owners must approve a date proposal before it is sent.
- All user-facing strings via i18n; Swedish (`sv`) only; prompts keyed by id.
- Free tier only. No payments, no voice notes, no Super Like, no push in MVP.
- A matchmaker never sees candidates who are friends of the matchmaker or of the single, and cannot be matchmaker on both sides of one match.

## Review Focus
- User swipes the same candidate twice or swipes after the cap: second swipe is idempotent/rejected, no extra claim.
- Two matchmakers swipe yes on the same candidate at the same instant: exactly one claim wins (unique index).
- Claim owner is blocked/deleted/leaves: claim released and other matchmakers see the candidate again.
- A single who toggles `matchable` off or deletes account while a match exists: match and invites cancelled, no leaks.
- Underage or empty profile (no photo/age) must not appear in a deck.

## File Structure
- `supabase/migrations/*.sql`: schema, RLS, functions (one file per phase).
- `supabase/tests/*.sql`: transactional tests.
- `app/`: Expo Router screens `(auth)`, `(tabs)/swipe`, `chats`, `dates`, `profile`, `friends`.
- `src/lib/supabase.ts`, `src/i18n/sv.json`, `src/features/*` (swipe, chat, dates).

## Tasks
### Task 1: Database schema, RLS, rule functions
**Interfaces — Produces (RPC):** `get_deck(p_single uuid) -> setof candidate_card`; `swipe(p_single uuid, p_candidate uuid, p_vote text) -> swipe_result`; `release_claim(p_claim uuid)`; `release_stale_claims()`; `propose_date(p_match uuid, p_time timestamptz, p_place text, p_double bool)`; `approve_date(p_proposal uuid)`; `respond_invite(p_invite uuid, p_accept bool)`.
- [ ] Write SQL tests: cap of 10, double swipe, claim race (unique), claim hiding from other matchmakers, match only when both sides hold claims, single cannot select own claims.
- [ ] Apply migration; run tests; expect PASS. Fable reviews RLS + functions.
- [ ] Commit.

### Task 2: Expo scaffold, i18n, auth
Files: `app/_layout.tsx`, `app/(auth)/sign-in.tsx`, `src/lib/supabase.ts`, `src/i18n/*`. Test: Jest for i18n keys + auth gate. Email magic-link/password sign-in via Supabase.
- [ ] Scaffold, add tests, run `npx jest`, commit.

### Task 3: Profile, friends, block/report
Hinge-like profile (3 photos, 3 prompt answers, name, birth date, city, preferences, matchable, open_to_double). Invite code + accept. Block/report/delete account.
- [ ] Tests for age check (>=18), code redemption; screens; commit.

### Task 4: Swipe deck
Reanimated card with real fling + rotation + like/pass stamps; selector for which friend you are swiping for; shows remaining swipes (x/10).
- [ ] Unit test deck state hook; manual run in Expo Go/web; commit.

### Task 5: Matchmaker chat
One thread per match between the two claim owners; both profiles viewable; Realtime messages.
- [ ] Test message RLS (only the two owners); screen; commit.

### Task 6: Date proposal and invites
Proposal form (time, place), both approve, invite to singles (first name, clues, credit line), accept/decline, feedback, matchmaker card count.
- [ ] Tests for approval gating and invite contents (no photo field exposed); screens; commit.

### Task 7: Safety, polish, release prep
Privacy policy page (sv), report admin view via SQL, empty/error states, soft cozy theme, EAS config. Seed script with ~20 fake profiles for the first test.
- [ ] Verify with `verification-before-completion`; commit.
