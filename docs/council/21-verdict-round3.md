# Council verdict, round 3 (2026-11-26, chairman: main agent; advisors: Contrarian, First Principles, Expansionist, Outsider, Executor; HIG reference: dickwu/apple-design-skill)
Peer review round skipped for speed. The user gave the council full authority over design and product (except money, deleting data, outward actions).

## A. Architecture: DECIDED
Feature folders + a thin `shared/` layer. Only `features/*/api.ts` may call `supabase.from` or `supabase.rpc` (guard test enforces it). Route files in `app/app` stay thin (params, one screen component). Path alias `@/` -> `src/`. Tests colocated as `*.test.ts`. Never rename route files.
```
app/src/
  shared/ { api/supabase.ts, i18n/{index.ts,sv.json}, ui/{ui,Icon,Display,Wheel,DateField}.tsx, lib/{age,dates,haptics,sound,useNow,notify,photos}.ts, theme.ts, config.ts }
  features/
    auth/      session.tsx
    swipe/     SwipeCard.tsx, decision.ts, api.ts
    matches/   MatchOverlay.tsx, badges.tsx, api.ts
    chat/      ChatBubble.tsx, ChatInput.tsx, api.ts
    dates/     DateCard.tsx, QuickReplies.tsx, ReplyFlight.tsx, FeedbackCard.tsx, countdown.ts, maps.ts, ideas.ts, api.ts
    profile/   ProfileForm.tsx, SwitchProfileSheet.tsx, ViewAsBanner.tsx, api.ts
    matchmaker/ MatchmakerCard.tsx, matchmaker.ts, api.ts
    friends/   api.ts
    reschedule/, safety/  (new)
```
Staged with gates after each batch (tsc, jest, `expo export -p web`): 0 baseline, 1 alias, 2 leaf modules, 3 ui, 4 features, 5 api extraction (one feature per commit), 6 move tests. Never rename and change logic in the same commit. Stop on the first red gate.

## B. Apple HIG cleanup: DECIDED (token-level first)
1. Type scale (pt): largeTitle 34/41 (Fraunces), title 22/28, headline 17 semibold, body 17/22, subhead 15/20, footnote 13/18, caption 12/16. Nothing below 12.
2. 4/8 grid tokens (4, 8, 12, 16, 24, 32). Screen gutter 20. Touch targets >= 44.
3. Large titles on the tab roots, plain inline titles on pushed screens.
4. Keep 5 tabs for now; rename "Chattar" to "Matcher" (Outsider: "Matchmaker-chattar" sounds like support).
5. Sheets: grabber, top radius 20-24, dim backdrop, swipe to dismiss.
6. Buttons: one filled primary per screen, height 50, pill; secondary tinted; destructive as red text.
7. Lists over cards for chats and friends (inset grouped rows, hairline separators). Cards only for the date and the match.
8. Terracotta only for primary action and active state; shadows soft.
9. Empty states: headline, one line, one action. Errors inline with retry. Skeleton rows instead of blank screens.
10. Motion: respect Reduce Motion; haptics only on commit actions; keep the match overlay as the one big celebration.
11. Outsider simplifications adopted: hide Premium, demo switch and test accounts under a small "Mer" section on Profil; hide the stats/gamification until a date has happened; status labels reduced to Väntar / Bekräftad / Inte av; counter of swipes only when 3 or fewer are left; double-date toggle hidden from the main flow; a "Lägg till detaljer" fold in the proposal form; plain-Swedish privacy bullets at the top.

## C. Reschedule: DECIDED
Either single proposes a new time on a confirmed date; the other single accepts or declines; matchmakers get a system line, no vote. One pending proposal per date (partial unique index). Max 2 accepted changes and 3 proposals per date. Allowed only while the old start is more than 2 h away; new time at least 2 h from now and within 21 days. Expires at the earlier of 24 h and 2 h before the old start (lazy, no cron). Decline or expiry keeps the old time. On accept `starts_at` changes in one transaction; countdown and chat window follow because they derive from it. System lines in both chats (`kind = 'system'`). Server-side validation only (security definer RPCs). SQL test with a rollback.

## D. Safety MVP: DECIDED
Postgres + RLS only, no push, no location. A single can share one confirmed date with ONE accepted in-app friend (no phone or email collection). The friend sees: the single's first name, start time, venue name and address, and the check-in status. Never the other single's name, photo, chat or clues. The friend can decline the share. Check-ins ("Jag är framme", "Allt bra", "Jag är hemma") in the window from 1 h before to 8 h after the start. Discreet "Behöver du gå?" in the date-chat menu with options "Meddela min vän" and "Avsluta": it never notifies the other single. Without push the friend sees it in the app (badge and a "Delat med dig" list on the Friends tab); the UI says plainly that this is not an emergency service and links 112. Rate limit: 3 events per date. RLS: no direct table access, RPCs only. Lazy purge 30 days after the date. SQL test with a rollback covering abuse cases (share to non-friend or blocked user, reading after revoke, other single reading, friend fishing).

## E. Names (user decides, no renaming)
Fixa'n, Kupplat, Klickat, Fika Blind, Vännernas Val, Kupé, Lagom Träff, Dejt, Kupp. Baseline blindmatch is clear and international but cold. Strongest: Fixa'n (Outsider) and Fika Blind (Contrarian, Expansionist).

## Extra
Calm countdown ring and a lantern-like date-day background are approved for later. Keep motion restrained: one big celebration.
