// Dev-only test bot. Plays Ella (matchmaker), and accepts date invites as Jonathan and Miriam (the singles).
// Usage: BOT_PASSWORD=... node scripts/test-bot.mjs
import { createClient } from '../app/node_modules/@supabase/supabase-js/dist/index.mjs';

const URL = 'https://pdxdbcftaphdonrlpbwy.supabase.co';
const KEY = 'sb_publishable_5Hvm5rNYodMmEgkokTB2sw_rfbCc4Hr';
const PW = process.env.BOT_PASSWORD;
if (!PW) { console.error('Set BOT_PASSWORD'); process.exit(1); }

async function login(email) {
  const sb = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: true } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { sb, uid: data.user.id };
}

const LINES = [
  'Hej! Kul att vi äntligen pratar. Jag tycker verkligen att de två verkar passa ihop.',
  'Miriam älskar sushi och bokhandlar. Vad gillar Jonathan?',
  'Låter perfekt! Vill du föreslå en tid och plats? Jag godkänner direkt.',
  'Haha ja, precis. Jag tror det blir jättebra.',
  'Bra idé. Föreslå en dejt så kör vi!',
];
function reply(body, n) {
  const b = body.toLowerCase();
  if (/(hej|tja|hallå|tjena)/.test(b)) return LINES[0];
  if (/(sushi|bok|gillar|tycker om)/.test(b)) return LINES[1];
  if (/(dejt|fika|middag|plats|tid)/.test(b)) return LINES[2];
  if (b.includes('?')) return LINES[3];
  return LINES[n % LINES.length];
}

const ella = await login('ella@blindmatch.test');
const jonathan = await login('jonathan@blindmatch.test');
const miriam = await login('miriam@blindmatch.test');
console.log('bot up: Ella, Jonathan, Miriam logged in');

const handled = new Set();   // message ids already replied to
const approved = new Set();  // proposals already approved
let n = 0;
let first = true;

async function tick() {
  // Ella: chats
  const { data: matches } = await ella.sb.rpc('get_my_matches');
  for (const m of matches ?? []) {
    const { data: msgs } = await ella.sb.from('messages').select('id,sender_id,body,created_at').eq('match_id', m.match_id).order('created_at');
    const last = msgs?.[msgs.length - 1];
    if (last && last.sender_id !== ella.uid && !handled.has(last.id)) {
      handled.add(last.id);
      if (first) { /* answer a pending message once on startup too */ }
      const text = reply(last.body, n++);
      await new Promise((r) => setTimeout(r, 2500)); // feels human
      const { error } = await ella.sb.from('messages').insert({ match_id: m.match_id, sender_id: ella.uid, body: text });
      console.log(new Date().toISOString(), 'Ella ->', text, error?.message ?? '');
    }
    const { data: props } = await ella.sb.rpc('get_match_proposals', { p_match: m.match_id });
    for (const p of props ?? []) {
      if (p.status === 'pending' && !p.i_approved && !approved.has(p.id)) {
        approved.add(p.id);
        const { data, error } = await ella.sb.rpc('approve_date', { p_proposal: p.id });
        console.log(new Date().toISOString(), 'Ella approved date', p.place, data, error?.message ?? '');
        await ella.sb.from('messages').insert({ match_id: m.match_id, sender_id: ella.uid, body: `Jag har godkänt dejten: ${p.place}!` });
      }
    }
  }
  first = false;
  // Singles accept invites
  for (const s of [{ name: 'Jonathan', c: jonathan }, { name: 'Miriam', c: miriam }]) {
    const { data: inv } = await s.c.sb.rpc('get_my_invites');
    for (const i of inv ?? []) {
      if (i.status === 'sent') {
        await new Promise((r) => setTimeout(r, 4000));
        const { data, error } = await s.c.sb.rpc('respond_invite', { p_invite: i.invite_id, p_accept: true });
        console.log(new Date().toISOString(), s.name, 'accepted invite ->', data, error?.message ?? '');
      }
    }
  }
}

for (;;) {
  try { await tick(); } catch (e) { console.error('tick error', e.message); }
  await new Promise((r) => setTimeout(r, 4000));
}
