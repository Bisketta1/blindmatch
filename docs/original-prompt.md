# Uppdrag: Bygg "blinddejt via vänner"-appen

## Idén
En dejtingapp där man swipar åt sina VÄNNER, inte åt sig själv.

Exempel: Jag swipar ja på Ella åt min vän Jonathan. Ellas vän Maryam swipar ja på Jonathan åt Ella. När båda matchmakers sagt ja matchar Jonathan och Ella, men de får inte veta det än. Jag och Maryam hamnar i en **matchmaker-chatt** där vi planerar vad de ska göra på dejten (plats, tid, upplägg). Därefter får Jonathan och Ella en blinddejt-inbjudan (tid + plats, ingen identitet) som de accepterar eller avböjer.

Befintliga appar (Ship, Wingman, BlindMate, Hello Darling) låter vänner swipa, men ingen har matchmaker-till-matchmaker-chatten som planerar dejten, och ingen gör dejten blind. Det är vår USP. Bygg den så att många kan använda den.

Referens: BlindMate (dolda profiler, "Peeks", avslöjande efter ~6 meddelanden) är närmast. Ship lades ner 2022. Lär av deras misstag: Wingman hade för få profiler med en wingman, och kallstart är största risken.

## Arbetssätt (följ i denna ordning)

### 1. Council först (använd skillen `llm-council`)
Kör rådet på dessa frågor innan du skriver kod. Spara varje verdict i `docs/council/`.
- **Produkt:** Vad är den bästa kärnloopen? Hur hanteras att singlarna inte vet något tills dejten är bokad?
- **Kallstart/tillväxt:** Hur får vi crews att bildas? Vilken stad eller målgrupp börjar vi med?
- **Säkerhet och samtycke:** Blinddejt med okänd person, GDPR, åldersgräns, verifiering, rapportering.
- **Teknikstack och arkitektur.**
- **Intäkter.**

**Expansionisten:** ge honom fria tyglar. Han ska inte begränsas av MVP-tänk, budget eller "realism" i sitt första svar. Låt honom gå så långt han vill: nya format, viral mekanik, event, partnerskap, AI-matchmaker-assistent, gruppdejter, internationell expansion, vad som helst. Spara hans fulla utlägg ordagrant i `docs/council/expansionist-unfiltered.md`. Sedan väger resten av rådet och du in vad som är värt att bygga nu, senare eller aldrig. Redovisa vilka expansionistidéer som kom med i planen och varför.

### 2. Superpowers
Använd superpowers-skills genom hela arbetet:
- **brainstorming** för att förfina designen mot mig innan implementation (ställ frågor, en i taget).
- **writing-plans** för en stegvis implementationsplan i `docs/plan.md`.
- **using-git-worktrees** för isolerade arbetsgrenar.
- **test-driven-development** (tdd-workflow): skriv tester först, särskilt för matchningslogiken.
- **dispatching-parallel-agents** för oberoende delar (t.ex. backend-schema, UI-skärmar, säkerhet).
- **verification-before-completion**: inga "klart"-påståenden utan körda tester och bevis.
- **finishing-a-development-branch** när en fas är klar.

### 3. Bygg
**MVP-flöde:**
1. Inloggning, profil (bilder, kort text, samtycke till att vänner swipar åt mig).
2. Crew: bjud in vänner via länk. Alla är både singel och matchmaker.
3. Swipe-läge: jag swipar åt en vän på profiler från andra crews.
4. Matchmaker-match: dubbelt ja från båda matchmakers skapar en match mellan matchmakers, inte singlarna.
5. Matchmaker-chatt: realtidschatt, dejtförslag (plats/tid/idé) och godkännande.
6. Blinddejt-inbjudan till singlarna (ingen identitet), acceptera/avböj.
7. Efter dejten: feedback och poäng till matchmakers.

**Förslag på stack (rådet får ändra):** Expo/React Native + Supabase (auth, Postgres med RLS, realtime, push). Använd RLS på alla tabeller.

**Krav:**
- Singlar kan inte se vem som swipat på dem innan inbjudan.
- Samtycke, blockering, rapportering och 18+-gräns från start.
- Tester för matchningslogiken och RLS-reglerna.
- Svenska som förstaspråk, med i18n-struktur för fler språk.

## Leverans
1. `docs/council/` med alla verdicts + expansionistens ofiltrerade utlägg.
2. `docs/plan.md` med faser (MVP → tillväxt → intäkter).
3. Fungerande MVP med tester som går igenom (visa utdata).
4. Kort sammanfattning: vad som byggdes, vad som sparats till senare, vad jag måste bestämma.

Fråga mig bara när något är mitt beslut (namn, målstad, varumärke). Annars: välj ett vettigt default och gå vidare.
