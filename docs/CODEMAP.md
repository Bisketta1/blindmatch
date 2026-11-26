# Code map: where to find things

Run everything from `app/` unless noted. Import with the alias `@/` (= `app/src/`).

## Routes (`app/app/`, Expo Router; never rename files, they are URLs)
| File | Screen |
|---|---|
| `_layout.tsx` | fonts, providers (session, badges), auth gate, safe area, match overlay |
| `(auth)/sign-in.tsx` | sign in / sign up |
| `onboarding.tsx`, `edit-profile.tsx` | create and edit profile (uses `features/profile/ProfileForm`) |
| `(tabs)/index.tsx` | Swipa (deck, candidate swiping) |
| `(tabs)/chats.tsx` | matches list (tab label Chattar) |
| `(tabs)/dates.tsx` | dates for singles: invite, accept, countdown, feedback |
| `(tabs)/friends.tsx` | friend code, requests, friends, block/report |
| `(tabs)/profile.tsx` | own profile, premium, switch profile, matchmaker card |
| `chat/[id].tsx` | matchmaker chat + date proposal form + date cards |
| `date-chat/[id].tsx` | chat between the two singles on the day (quick replies) |
| `friend/[id].tsx` | a friend's profile |
| `privacy.tsx` | privacy text |

## Source (`app/src/`)
- `shared/` used by 2+ features, no domain rules: `theme.ts` (design tokens), `config.ts` (Supabase URL and publishable key, BUILD string), `api/supabase.ts` (client), `i18n/` (`sv.json`, all UI text), `lib/` (age, dates, haptics, sound, useNow, notify, photos), `ui/` (ui.tsx buttons/fields/cards, Icon, Display serif text, Wheel, DateField, Sheet).
- `features/auth/session.tsx` session, profile, view-as (demo account switch).
- `features/swipe/` SwipeCard + decision rule. `features/matches/` MatchOverlay animation, `badges.tsx` unread and match detection.
- `features/chat/` ChatBubble, ChatInput. `features/dates/` DateCard, QuickReplies, ReplyFlight (the flying quick reply), FeedbackCard, countdown, maps, ideas.
- `features/reschedule/` change-the-time on confirmed dates (api.ts, RescheduleSection; rules in migration 0015 and `supabase/tests/0003_reschedule_test.sql`).
- `features/profile/` ProfileForm, SwitchProfileSheet, ViewAsBanner. `features/matchmaker/` MatchmakerCard, title ladder.
- Tests sit next to code as `*.test.ts` (run `npm test`).

## Database (`supabase/`)
- `migrations/NNNN_*.sql` in order; applied to project `pdxdbcftaphdonrlpbwy` through the Supabase MCP. Additive only; new function versions get a `_v2` suffix.
- Tables: profiles, prompts, profile_answers, friendships, blocks, reports, muted_matchmakers, swipes, claims, matches, messages, match_reads, date_proposals, date_invites, date_messages, date_feedback, thanks, date_reschedules, redeem_codes, code_attempts, app_settings.
- Rules live in RPCs (security definer) and RLS: swipe, get_deck, release_claim, propose_date_v2, approve_date, respond_invite, get_my_dates_v2, get_match_proposals_v2, set_date_details, cancel_date_proposal, propose_reschedule, respond_reschedule, cancel_reschedule, get_reschedule, submit_date_feedback, get_date_feedback, get_my_thanks, get_matchmaker_card, get_badges, get_unread, mark_match_read, request_friend, respond_friend, get_friend_requests, redeem_code, revoke_premium, get_demo_accounts, delete_account. Helpers are in schema `private`.
- `tests/*.sql` are DO blocks that end with a raised `..._PASSED` exception (everything rolls back). Run through `execute_sql`.
- `functions/demo-login` edge function (demo account switch; needs premium or `app_settings.demo_switch_for_everyone`).

## Scripts and docs
- `scripts/test-bot.mjs` plays Ella in the dev project; `scripts/dev-sync.sh` pulls on a laptop; `scripts/serve-spa.py` serves `app/dist` with SPA fallback.
- `docs/design.md` product rules, `docs/council/` every council verdict, `docs/AUTOPILOT.md` standing work queue and log, `docs/superpowers/plans/` the first plan.

- `app/src/features/safety/` api.ts (only place calling safety RPCs), SafetySection.tsx (single: share date with a friend, check-ins, 112 notice; shown in Dejter tab), SharedWithMe.tsx (friend: 'Delat med dig' list in Friends tab). DB: migration 0016_safety.sql, test supabase/tests/0004_safety_test.sql.
