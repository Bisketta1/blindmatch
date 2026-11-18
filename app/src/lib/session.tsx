import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Profile = {
  id: string; first_name: string; birth_date: string; city: string | null; gender: string | null;
  looking_for: string[]; bio: string | null; photos: string[]; matchable: boolean; open_to_double: boolean; friend_code: string; premium: boolean;
};

const PARENT_KEY = 'blindmatch.parentSession';
const VIEWAS_KEY = 'blindmatch.viewAsName';

type Ctx = {
  session: Session | null; profile: Profile | null; loading: boolean; refreshProfile: () => Promise<void>;
  /** Name of the demo account we are currently signed in as (premium owners only), else null. */
  viewAs: string | null;
  switchTo: (targetId: string, name: string) => Promise<void>;
  exitViewAs: () => Promise<void>;
};
const SessionCtx = createContext<Ctx>({
  session: null, profile: null, loading: true, refreshProfile: async () => {}, viewAs: null, switchTo: async () => {}, exitViewAs: async () => {},
});
export const useSession = () => useContext(SessionCtx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAs, setViewAs] = useState<string | null>(null);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(VIEWAS_KEY).then((n) => setViewAs(n));
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

  const restoreParent = useCallback(async (): Promise<boolean> => {
    const raw = await AsyncStorage.getItem(PARENT_KEY);
    if (!raw) return false;
    const { access_token, refresh_token } = JSON.parse(raw);
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return !error;
  }, []);

  const exitViewAs = useCallback(async () => {
    const ok = await restoreParent();
    await AsyncStorage.multiRemove([PARENT_KEY, VIEWAS_KEY]);
    setViewAs(null);
    if (!ok) await supabase.auth.signOut();
  }, [restoreParent]);

  const switchTo = useCallback(async (targetId: string, name: string) => {
    // Only the premium owner may ask; if we are already inside a demo account, go back to the owner first.
    if (await AsyncStorage.getItem(PARENT_KEY)) await restoreParent();
    else {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('not signed in');
      await AsyncStorage.setItem(PARENT_KEY, JSON.stringify({ access_token: data.session.access_token, refresh_token: data.session.refresh_token }));
    }
    const res = await supabase.functions.invoke('demo-login', { body: { target: targetId } });
    if (res.error || !res.data?.token_hash) { await AsyncStorage.removeItem(PARENT_KEY); throw new Error('Kunde inte byta konto'); }
    await AsyncStorage.setItem(VIEWAS_KEY, name);
    setViewAs(name);
    const { error } = await supabase.auth.verifyOtp({ token_hash: res.data.token_hash, type: 'magiclink' });
    if (error) { await exitViewAs(); throw new Error(error.message); }
  }, [restoreParent, exitViewAs]);

  return (
    <SessionCtx.Provider value={{ session, profile, loading, refreshProfile, viewAs, switchTo, exitViewAs }}>{children}</SessionCtx.Provider>
  );
}
