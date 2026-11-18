// Lets a premium user sign in as a DEMO account (profiles.is_demo = true) for testing. Refuses everyone else.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'not authenticated' }, 401);

  const { target } = await req.json().catch(() => ({}));
  if (typeof target !== 'string') return json({ error: 'bad request' }, 400);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: me } = await admin.from('profiles').select('premium').eq('id', user.id).maybeSingle();
  const { data: t } = await admin.from('profiles').select('id,is_demo').eq('id', target).maybeSingle();
  if (!me?.premium || !t?.is_demo) return json({ error: 'forbidden' }, 403);

  const { data: au, error: e1 } = await admin.auth.admin.getUserById(target);
  if (e1 || !au?.user?.email) return json({ error: 'no such user' }, 404);
  const { data: link, error: e2 } = await admin.auth.admin.generateLink({ type: 'magiclink', email: au.user.email });
  if (e2 || !link?.properties?.hashed_token) return json({ error: 'could not sign in' }, 500);
  return json({ token_hash: link.properties.hashed_token });
});
