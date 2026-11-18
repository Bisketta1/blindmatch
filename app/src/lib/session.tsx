import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Profile = {
  id: string; first_name: string; birth_date: string; city: string | null; gender: string | null;
  looking_for: string[]; bio: string | null; photos: string[]; matchable: boolean; open_to_double: boolean; friend_code: string;
};

type Ctx = { session: Session | null; profile: Profile | null; loading: boolean; refreshProfile: () => Promise<void> };
const SessionCtx = createContext<Ctx>({ session: null, profile: null, loading: true, refreshProfile: async () => {} });
export const useSession = () => useContext(SessionCtx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      loadProfile(s?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session]);
  return <SessionCtx.Provider value={{ session, profile, loading, refreshProfile }}>{children}</SessionCtx.Provider>;
}
