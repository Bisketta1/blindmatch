import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { notify } from '../../src/lib/notify';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/lib/session';
import { Btn, Chip, H1, Muted } from '../../src/components/ui';
import { SwipeCard, SwipeCardHandle, Candidate } from '../../src/features/swipe/SwipeCard';
import type { SwipeDirection } from '../../src/features/swipe/decision';
import { useBadges } from '../../src/lib/badges';
import { colors } from '../../src/theme';

type Friend = { id: string; first_name: string };
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });

export default function SwipeScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [single, setSingle] = useState<Friend | null>(null);
  const [deck, setDeck] = useState<Candidate[]>([]);
  const [left, setLeft] = useState(10);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const card = useRef<SwipeCardHandle>(null);
  const { showMatch } = useBadges();

  const loadFriends = useCallback(async () => {
    const uid = session!.user.id;
    const { data: fs } = await supabase.from('friendships').select('requester,addressee').eq('status', 'accepted');
    const ids = (fs ?? []).map((f: any) => (f.requester === uid ? f.addressee : f.requester));
    if (!ids.length) { setFriends([]); setSingle(null); return; }
    const { data: ps } = await supabase.from('profiles').select('id,first_name').in('id', ids);
    const list = (ps as Friend[]) ?? [];
    setFriends(list);
    setSingle((cur) => list.find((f) => f.id === cur?.id) ?? list[0] ?? null);
  }, [session]);

  const loadDeck = useCallback(async (s: Friend | null) => {
    if (!s) return;
    setReady(false);
    const [{ data }, { count }] = await Promise.all([
      supabase.rpc('get_deck', { p_single: s.id }),
      supabase.from('swipes').select('id', { count: 'exact', head: true }).eq('single_id', s.id).eq('swipe_day', today()),
    ]);
    setDeck((data as Candidate[]) ?? []);
    setLeft(Math.max(0, 10 - (count ?? 0)));
    setNote('');
    setReady(true);
  }, []);

  useFocusEffect(useCallback(() => { loadFriends(); }, [loadFriends]));
  useEffect(() => { loadDeck(single); }, [single, loadDeck]);

  async function onSwipe(dir: SwipeDirection) {
    if (!single || !deck[0] || busy) return;
    const cand = deck[0];
    setDeck((d) => d.slice(1));
    setBusy(true);
    const { data, error } = await supabase.rpc('swipe', { p_single: single.id, p_candidate: cand.candidate_id, p_vote: dir });
    setBusy(false);
    if (error) return notify(t('common.error'), error.message);
    if (data.status === 'cap') { setLeft(0); setDeck([]); setNote(t('swipe.cap', { name: single.first_name })); return; }
    if (data.status === 'claimed_by_other') { setNote(t('swipe.claimed')); return; }
    if (typeof data.remaining === 'number') setLeft(data.remaining);
    if (data.matched && data.match_id) showMatch(data.match_id, t('match.body', { a: single.first_name, b: cand.first_name }));
  }

  if (!friends.length) return <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 80 }}><H1>{t('tabs.swipe')}</H1><Muted>{t('swipe.noFriends')}</Muted></View>;
  const top = deck[0];

  return (
    <ScrollView scrollEnabled={!dragging} style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 64 }}>
      <Muted>{t('swipe.forWhom')}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 }}>
        {friends.map((f) => <Chip key={f.id} label={f.first_name} active={single?.id === f.id} onPress={() => setSingle(f)} />)}
      </View>
      <Muted style={{ marginBottom: 12 }}>{t('swipe.left', { n: left })}</Muted>
      {note ? <Text style={{ color: colors.muted, marginBottom: 12 }}>{note}</Text> : null}
      {top && left > 0 ? (
        <>
          <SwipeCard key={top.candidate_id} ref={card} candidate={top} onSwipe={onSwipe} onDrag={setDragging} disabled={busy} yesLabel={t('swipe.yes')} noLabel={t('swipe.no')} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 20 }}>
            <Btn kind="soft" icon="close" label={t('swipe.no')} onPress={() => card.current?.swipe('no')} style={{ flex: 1 }} />
            <Btn icon="heart" label={t('swipe.yes')} onPress={() => card.current?.swipe('yes')} style={{ flex: 1 }} />
          </View>
        </>
      ) : (
        !note && <Muted>{ready ? t('swipe.empty') : t('common.loading')}</Muted>
      )}
    </ScrollView>
  );
}
