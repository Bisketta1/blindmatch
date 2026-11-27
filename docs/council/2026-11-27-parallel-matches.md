# Council 2026-11-27: three yes-pairs for the same single

Question: Kassim swipes yes for Jonathan on Miriam, Maja, Sara; Ella (their matchmaker) swiped yes on Jonathan for all three. Today that creates three matches (three chats). What now?

Advisors: Contrarian (D with a hard lock, no "busy" signal), First Principles (D at pair level + B at date level), Expansionist (D as signature feature), Outsider (D with B underneath, neutral copy), Executor (B, queue). Peer review skipped for speed.

## Verdict (chairman)
- Agree: do NOT hide Jonathan (option C) and do NOT cap (A). A mutual yes is only a proposal between two matchmakers.
- Rule: a single can have at most ONE live date in flight (proposal pending, sent, or confirmed and not long past). Enforced in Postgres by a trigger on date_proposals (additive, no signature changes). Other yes-pairs stay as matches and simply rest ("Vilar tills vidare"); they are never shown as rejected and never visible to singles.
- UX: the Matcher tab groups matches by the other matchmaker ("Ella, 3 forslag"). A match whose single already has a live date elsewhere is marked "Vilar tills vidare". Trying to propose a date for a resting match gives neutral copy that does not say why.
- Later (not built now): a true single shared chat per matchmaker pair with candidate threads (option D proper). Needs a thread model and UI; recorded as future work.
- Known trade-off: a matchmaker can infer that a single has a live date when a proposal is refused. Copy stays neutral; accepted for now.
