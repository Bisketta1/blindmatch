# blindmatch

Blinddejt via vänner: du swipar åt dina vänner, den första matchmakern som swipar ja på varje sida "tar" kandidaten, de två matchmakerna chattar och planerar dejten, singlarna får en blind inbjudan (förnamn, ledtrådar, ingen bild).

- `app/`: Expo (React Native, Expo Router, TypeScript). Svenska först (`src/i18n/sv.json`).
- `supabase/migrations/`: databas, RLS och regler (körda på projektet `pdxdbcftaphdonrlpbwy`, gratisplan).
- `supabase/tests/`: SQL-tester (körs i en transaktion som rullas tillbaka, förväntat resultat: `ALL_TESTS_PASSED`).
- `docs/`: design, rådsbeslut, plan.

## Köra appen
```bash
cd app
npm install
npx expo start      # skanna QR-koden med Expo Go på telefonen
```
Webbpreview: `npx expo start --web`. Tester: `npm test`.

## Första gången
1. Supabase-dashboard → Authentication → Providers → Email → stäng av "Confirm email" (annars skickas bekräftelsemejl, och gratisplanen tillåter få per timme).
2. (Valfritt) Kör `supabase/seed_test_pool.sql` i SQL-editorn för 20 fejkprofiler att swipa på.
3. Skapa konto i appen, fyll i profilen, lägg till en vän via vänkod.

## Regler i korthet
Max 10 swipes per dag per vän · nej blockerar aldrig · första ja på varje sida tar kandidaten · matchen väntar max 7 dagar (påminnelse efter 48 h, planeras) · båda matchmakers måste godkänna dejten · singlarna ser aldrig vem som swipat.
