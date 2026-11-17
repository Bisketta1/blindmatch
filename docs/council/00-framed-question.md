# Framed question for the council

We are building "blindmatch": a free mobile app (Expo/React Native + Supabase free tier) where people swipe FOR THEIR FRIENDS, not for themselves.

Core loop: I'm matchmaker for my friend Jonathan. I swipe on candidates (e.g. Miriam, who is a friend of another user, Ella). Ella is matchmaker for Miriam and swipes on Jonathan. If both matchmakers swipe yes, Jonathan and Miriam are matched but are NOT told. I and Ella get a private matchmaker chat, can see each other's Hinge-style profiles, and plan a small blind date. A date request (time + place) must be approved by BOTH matchmakers before it is sent to the two singles. Singles then accept/decline.

Decided rules: max 10 swipes per day per friend you swipe for; friends are added via invite link / profile code with accept; block + report; real, physical-feeling swipe gestures; Like and Super Like (Super Like is the future monetization); profiles Hinge-like (fun prompts, voice notes); cozy, soft vibe, softer than Tinder. Candidate pool default: friends-of-friends first, then everyone in the same city matching preferences.

Existing apps (Ship - shut down 2022, Wingman, BlindMate, Hello Darling) let friends swipe, but none has the matchmaker-to-matchmaker chat that plans the date, and none makes the date blind.

Builder: a solo student-type developer working with Claude Code, zero budget (free tiers only), wants to build in the cloud and reach many users.

Questions for the council:
1. Product: is this the right core loop? What is missing/wrong/dangerous?
2. Cold start & growth: how do we get a critical mass (a crew needs friends on both sides)? Which first market?
3. Safety/consent/GDPR for blind dates arranged by third parties.
4. What should the MVP include vs. leave out?
5. Monetization beyond Super Like.
