import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { notify } from '@/shared/lib/notify';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/api/supabase';
import { useSession } from '@/lib/session';
import { Btn, Chip, H1, Muted } from '@/shared/ui/ui';
import { SwipeCard, SwipeCardHandle, Candidate } from '@/features/swipe/SwipeCard';
import type { SwipeDirection } from '@/features/swipe/decision';
import { useBadges } from '@/lib/badges';
import { Icon } from '@/shared/ui/Icon';
import { colors, shadow } from '@/shared/theme';

type Friend = { id: string; first_name: string };

function RoundButton({ icon, label, onPress, primary }: { icon: 'close' | 'heart'; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: primary ? colors.primary : colors.card, borderWidth: primary ? 0 : 1, borderColor: colors.line, transform: [{ scale: pressed ? 0.93 : 1 }], ...(primary ? shadow.button : shadow.card) })}>
      <Icon name={icon} size={30} color={primary ? '#fff' : colors.primary} strokeWidth={2.6} filled={icon === 'heart' && !!primary} />
    </Pressable>
  );
}
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });

export default function SwipeScreen() {
  const { t } = useTranslation();
  const { session, profile } = useSession();
  const premium = !!profile?.premium;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [single, setSingle] = useState<Friend | null>(null);
  const [deck, setDeck] = useState<Candidate[]>([]);
  const [left, setLeft] = useState(10);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [ready, setReady] = useState(false);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const card = useRef<SwipeCardHandle>(null);
  const { showMatch } = useBadges();
  const router = useRouter();

  const loadFriends = useCallback(async () => {
    const uid = session!.user.id;
    const { data: fs } = await supabase.from('friendships').select('requester,addressee').eq('status', 'accepted');
    const ids = (fs ?? []).map((f: any) => (f.requester === uid ? f.addressee : f.requester));
    if (!ids.length) { setFriends([]); setSingle(null); setFriendsLoaded(true); return; }
    const { data: ps } = await supabase.from('profiles').select('id,first_name').in('id', ids);
    const list = (ps as Friend[]) ?? [];
    setFriends(list);
    setSingle((cur) => list.find((f) => f.id === cur?.id) ?? list[0] ?? null);
    setFriendsLoaded(true);
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
    if (data.status === 'cap' && !premium) { setLeft(0); setDeck([]); setNote(t('swipe.cap', { name: single.first_name })); return; }
    if (data.status === 'claimed_by_other') { setNote(t('swipe.claimed')); return; }
    if (typeof data.remaining === 'number') setLeft(data.remaining);
    if (data.matched && data.match_id) showMatch(data.match_id, t('match.body', { a: single.first_name, b: cand.first_name }));
  }

  if (!friendsLoaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!friends.length) return <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 16 }}><H1>{t('tabs.swipe')}</H1><Muted>{t('swipe.noFriends')}</Muted></View>;
  const top = deck[0];

  return (
    <ScrollView scrollEnabled={!dragging} style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 16 }}>
      <Muted>{t('swipe.forWhom')}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 }}>
        {friends.map((f) => <Chip key={f.id} label={f.first_name} active={single?.id === f.id} onPress={() => setSingle(f)} />)}
      </View>
      {single && <Btn kind="ghost" icon="person" label={t('swipe.seeProfile', { name: single.first_name })} onPress={() => router.push(`/friend/${single.id}`)} style={{ alignSelf: 'flex-start', marginBottom: 4, paddingHorizontal: 4 }} />}
      <Muted style={{ marginBottom: 12 }}>{premium ? t('swipe.unlimited') : t('swipe.left', { n: left })}</Muted>
      {note ? <Text style={{ color: colors.muted, marginBottom: 12 }}>{note}</Text> : null}
      {top && (premium || left > 0) ? (
        <>
          <View style={{ marginBottom: 36 }}>
            <View style={{ position: 'absolute', left: 16, right: 16, top: 16, bottom: -16, backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.line, opacity: 0.75, transform: [{ scale: 0.97 }] }} />
            <View style={{ position: 'absolute', left: 30, right: 30, top: 30, bottom: -30, backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.line, opacity: 0.45, transform: [{ scale: 0.94 }] }} />
            <SwipeCard key={top.candidate_id} ref={card} candidate={top} onSwipe={onSwipe} onDrag={setDragging} disabled={busy} yesLabel={t('swipe.yes')} noLabel={t('swipe.no')} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 28, marginTop: 8 }}>
            <RoundButton icon="close" label={t('swipe.no')} onPress={() => card.current?.swipe('no')} />
            <RoundButton icon="heart" label={t('swipe.yes')} primary onPress={() => card.current?.swipe('yes')} />
          </View>
        </>
      ) : (
        !note && <Muted>{ready ? t('swipe.empty') : t('common.loading')}</Muted>
      )}
    </ScrollView>
  );
}
