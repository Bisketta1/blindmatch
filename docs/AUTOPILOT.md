# Autopilot

Status: RUNNING
Stop time: 2026-11-27 08:00 (Europe/Stockholm). After that: disable the scheduled task, write the final summary here, set Status to STOPPED.
Wake-up: scheduled task trig_01AaaNL6mnMDRowLFDMG5R1L (name "blindmatch autopilot", every 2 h, Europe/Stockholm) resumes this session. Also stop immediately if the user writes "stoppa autopiloten".

## Mandate (from the user)
- Code to main plus additive database changes (see CLAUDE.md rule 4). No spending. No destructive database statements.
- Council decides product and design. Opus is the advisor. The user allowed changing every screen, including swipe, date card, date chat and quick replies.
- Apple Design (HIG) cleanup, clean folder structure so code is easy to find, more animations and finish.
- Priorities from the user: 1) singles can reschedule, 2) date safety (trusted friend, check-in, "jag vill gå"), 3) animations and finish. Not wanted now: push notifications, App Store preparation.
- The user wants name suggestions from the council. Do not rename the app until the user picks one.

## Queue (work top to bottom, tick off in the log)
1. Council: folder architecture + Apple HIG scope + feature designs. Save verdicts in docs/council/.
2. Restructure `app/src` into feature folders and a `shared` layer. Keep `app/app` (routes) thin. Write `docs/CODEMAP.md`. Tests and web export stay green.
3. Apple HIG cleanup pass over all screens (spacing, type scale, hierarchy, states, empty and error states).
4. Feature: singles reschedule (both singles must agree; matchmakers get a chat line; chat window and countdown follow the new time). SQL + tests + UI.
5. Feature: date safety (trusted friend gets time, place and first name; check-in; discreet "jag vill gå"). SQL + tests + UI.
6. More animation and finish (consistent motion system, haptics, empty states, skeleton loading).
7. Council name suggestions saved in docs/council/names.md (no renaming).
8. Anything else the council ranks highest. Keep the user's phone link alive when asked.

## Log (newest first)
- 2026-11-26 23:30: autopilot set up.
