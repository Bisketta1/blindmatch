# blindmatch: working notes for Claude

Swedish-first dating app where friends swipe for friends. Expo (React Native, Expo Router, TypeScript) + Supabase (free tier). Read `docs/design.md` for the product rules and `docs/CODEMAP.md` to find things.

## Commands (run from `app/`)
- `npx tsc --noEmit` typecheck. `npm test` unit tests (Jest, pure logic in `__tests__/`).
- `npx expo export --platform web` bundle check. Serve `dist/` with a SPA fallback (see `scripts/serve-spa.py`) and drive it with Playwright for screenshots.
- Live phone preview: `EXPO_TOKEN=proxy-injected CI=1 npx expo start --tunnel --port 8081` (run in background, max 2 h per process; the Expo login is injected by the proxy). Tell the user the new `exp://` link when it changes.
- `FORCE_WHEELS`: `EXPO_PUBLIC_FORCE_WHEELS=1` makes the web build use the phone wheel pickers.

## Rules that never bend
1. No emojis in the UI. Swedish copy in `app/src/shared/i18n/sv.json`; never hardcode user-facing strings.
2. Accessibility first: text contrast >= 4.5:1 (tokens in `shared/theme.ts` are already checked), touch targets >= 44 pt, safe areas respected.
3. Rules live in Postgres (RPC functions, RLS). The client never decides who may see what. Singles must never see swipes/claims/matches about themselves; invites show first name + clues, no photo.
4. Database: only additive migrations (`supabase/migrations/NNNN_name.sql`, apply with the Supabase MCP). Do NOT use DROP, DELETE or TRUNCATE without the user's approval: the approval prompt times out when they are away. Create `_v2` functions instead of changing signatures. Always add or extend a SQL test in `supabase/tests/` that ends with a rollback exception, and run it.
5. Nothing that costs money. No paid services, no store accounts, no new paid APIs.
6. Never commit secrets. `.dev-secrets` (gitignored) holds the dev password for the demo accounts.
7. Before every push: `npx tsc --noEmit` and `npm test` are green and the web bundle exports. Small commits with a clear message. Update `docs/CODEMAP.md` when files move.
8. Test accounts are fake (`*@blindmatch.test`); `prinskassim@gmail.com` is the owner's real account: never delete or change it destructively.
9. Dev switches live in `app_settings` (`demo_switch_for_everyone`, `date_chat_always_open`): remember they must be turned off before a real launch.

## Decisions
The user wants the council (`llm-council` skill: advisors, then a chairman) to decide product and design questions, with Opus as the advisor tool. Record every council verdict in `docs/council/` with a date. Decisions about money, deleting data and outward actions stay with the user.

## Autopilot
See `docs/AUTOPILOT.md` for the standing work queue, the stop time and the log. A scheduled task wakes the session every 2 hours; each wake-up: read that file, do the next items, update the log, commit and push.
