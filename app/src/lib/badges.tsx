import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useSession } from '@/lib/session';

export type Badges = { chats: number; dates: number; friends: number; matches: number };
export type MatchToast = { matchId: string; body: string } | null;
const ZERO: Badges = { chats: 0, dates: 0, friends: 0, matches: 0 };

type Ctx = {
  badges: Badges;
  refresh: (silent?: boolean) => Promise<void>;
  match: MatchToast;
  showMatch: (matchId: string, body: string) => void;
  dismissMatch: () => void;
};
const BadgeCtx = createContext<Ctx>({ badges: ZERO, refresh: async () => {}, match: null, showMatch: () => {}, dismissMatch: () => {} });
export const useBadges = () => useContext(BadgeCtx);

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useSession();
  const [badges, setBadges] = useState<Badges>(ZERO);
  const [match, setMatch] = useState<MatchToast>(null);
  const prevMatches = useRef<number | null>(null);
  const active = !!session && !!profile;

  const refresh = useCallback(async (silent = false) => {
    if (!active) return;
    const { data, error } = await supabase.rpc('get_badges');
    if (error || !data) return;
    const b = data as Badges;
    setBadges(b);
    const prev = prevMatches.current;
    prevMatches.current = b.matches;
    if (!silent && prev !== null && b.matches > prev) {
      const { data: rows } = await supabase.rpc('get_my_matches');
      const m = (rows as any[])?.[0];
      if (m) setMatch({ matchId: m.match_id, body: `${m.my_single_name} och ${m.other_single_name} matchar! Planera dejten med ${m.other_matchmaker_name}.` });
    }
  }, [active]);

  useEffect(() => {
    if (!active) { setBadges(ZERO); prevMatches.current = null; return; }
    refresh(true);
    const timer = setInterval(() => refresh(), 7000);
    const ch = supabase.channel('badges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'date_proposals' }, () => refresh())
      .subscribe();
    return () => { clearInterval(timer); supabase.removeChannel(ch); };
  }, [active, refresh]);

  const showMatch = useCallback((matchId: string, body: string) => {
    setMatch({ matchId, body });
    prevMatches.current = (prevMatches.current ?? 0) + 1; // don't announce this match a second time
    refresh(true);
  }, [refresh]);

  return <BadgeCtx.Provider value={{ badges, refresh, match, showMatch, dismissMatch: () => setMatch(null) }}>{children}</BadgeCtx.Provider>;
}
