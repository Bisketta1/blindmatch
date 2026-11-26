import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/api/supabase';
import { useSession } from '@/features/auth/session';
import { useBadges } from '@/features/matches/badges';
import { ageFromBirthDate } from '@/shared/lib/age';
import { notify } from '@/shared/lib/notify';
import { hapticError } from '@/shared/lib/haptics';
import { DateCard } from '@/features/dates/DateCard';
import { ChatBubble } from '@/features/chat/ChatBubble';
import { ChatInput } from '@/features/chat/ChatInput';
import { formatCountdown } from '@/features/dates/countdown';
import { isValidAddress } from '@/features/dates/maps';
import { suggestIdeas } from '@/features/dates/ideas';
import { useNow } from '@/shared/lib/useNow';
import { Btn, Card, Chip, Field, Muted } from '@/shared/ui/ui';
import { DateField, toDateString, toTimeString } from '@/shared/ui/DateField';
import { Icon, IconName } from '@/shared/ui/Icon';
import type { MatchRow } from '../(tabs)/chats';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/shared/theme';

type Msg = { id: string; sender_id: string; body: string; created_at: string; kind?: string };
type Proposal = { id: string; starts_at: string; place: string; address: string | null; description: string | null; double_date: boolean; status: string; i_approved: boolean };
type Prof = { id: string; first_name: string; birth_date: string; city: string | null; bio: string | null; photos: string[]; friend_code?: string };

function MenuItem({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={20} color={danger ? colors.danger : colors.text} />
      <Text style={{ fontSize: 16, color: danger ? colors.danger : colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const uid = session!.user.id;
  const { refresh } = useBadges();
  const markRead = useCallback(async () => { await supabase.rpc('mark_match_read', { p_match: id }); refresh(true); }, [id, refresh]);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [props, setProps] = useState<Proposal[]>([]);
  const [profs, setProfs] = useState<Record<string, Prof & { answers: { prompt: string; answer: string }[] }>>({});
  const [isFriend, setIsFriend] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [place, setPlace] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [addrErr, setAddrErr] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editAddr, setEditAddr] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editErr, setEditErr] = useState(false);
  const [editShake, setEditShake] = useState(0);
  const now = useNow();
  const tomorrow = new Date(Date.now() + 86400000);
  const [day, setDay] = useState(toDateString(tomorrow));
  const [time, setTime] = useState('18:00');
  const [dbl, setDbl] = useState(false);
  const [formError, setFormError] = useState('');
  const [placeErr, setPlaceErr] = useState(false);
  const [dateErr, setDateErr] = useState(false);
  const [formShake, setFormShake] = useState(0);
  const [sending, setSending] = useState(false);
  const scroll = useRef<any>(null);

  const loadProposals = useCallback(async () => {
    const { data } = await supabase.rpc('get_match_proposals_v2', { p_match: id });
    setProps((data as Proposal[]) ?? []);
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_my_matches');
      const m = ((data as MatchRow[]) ?? []).find((x) => x.match_id === id) ?? null;
      setMatch(m);
      if (m) {
        const ids = [m.other_single, m.my_single, m.other_matchmaker];
        const { data: ps } = await supabase.from('profiles').select('id,first_name,birth_date,city,bio,photos,friend_code').in('id', ids);
        const { data: ans } = await supabase.from('profile_answers').select('profile_id,answer,prompts(text_sv)').in('profile_id', ids).order('position');
        const map: any = {};
        (ps ?? []).forEach((p: any) => { map[p.id] = { ...p, answers: [] }; });
        (ans ?? []).forEach((a: any) => map[a.profile_id]?.answer && map[a.profile_id].answers.push({ prompt: a.prompts?.text_sv ?? '', answer: a.answer }));
        setProfs(map);
        const { data: fs } = await supabase.from('friendships').select('requester,addressee').or(`requester.eq.${m.other_matchmaker},addressee.eq.${m.other_matchmaker}`);
        setIsFriend((fs ?? []).length > 0);
      }
      const { data: ms } = await supabase.from('messages').select('id,sender_id,body,created_at,kind').eq('match_id', id).order('created_at');
      setMsgs((ms as Msg[]) ?? []);
      loadProposals();
      markRead();
    })();
    const ch = supabase.channel(`match-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${id}` },
        (p) => { setMsgs((cur) => (cur.some((m) => m.id === (p.new as Msg).id) ? cur : [...cur, p.new as Msg])); markRead(); })
      .subscribe();
    const poll = setInterval(loadProposals, 6000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [id, loadProposals, markRead]);

  async function send() {
    const body = text.trim(); if (!body) return;
    setText('');
    const { error } = await supabase.from('messages').insert({ match_id: id, sender_id: uid, body });
    if (error) notify(t('common.error'), error.message);
  }

  async function propose() {
    setFormError(''); setPlaceErr(false); setDateErr(false); setAddrErr(false);
    const fail = (msg: string, p: boolean, d: boolean, a = false) => { setFormError(msg); setPlaceErr(p); setDateErr(d); setAddrErr(a); setFormShake((n) => n + 1); hapticError(); };
    if (!place.trim()) return fail(t('chats.errPlace'), true, false);
    const addr = address.trim();
    if (!isValidAddress(addr)) return fail(t('chats.errAddress'), false, false, true);
    const [y, mo, d] = day.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    const when = new Date(y, mo - 1, d, h, mi);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) return fail(t('chats.errPast'), false, true);
    setSending(true);
    const { error } = await supabase.rpc('propose_date_v2', { p_match: id, p_starts: when.toISOString(), p_place: place.trim(), p_address: addr, p_description: description.trim() || null, p_double: dbl });
    setSending(false);
    if (error) return fail(error.message.includes('double') ? t('chats.errDouble') : (error.message.includes('proposals_one_open') || error.message.includes('not allowed')) ? t('chats.errOpen') : error.message.includes('future') ? t('chats.errPast') : error.message.includes('address') ? t('chats.errAddress') : t('common.error'), false, false);
    setShowForm(false); setPlace(''); setAddress(''); setDescription(''); setDbl(false);
    await supabase.from('messages').insert({ match_id: id, sender_id: uid, body: `Jag föreslog en dejt: ${place.trim()}, ${day} kl ${time}.` });
    loadProposals();
  }

  async function change(p: Proposal) {
    await supabase.rpc('cancel_date_proposal', { p_proposal: p.id });
    const dt = new Date(p.starts_at);
    setPlace(p.place); setAddress(p.address ?? ''); setDescription(p.description ?? ''); setDay(toDateString(dt)); setTime(toTimeString(dt)); setDbl(p.double_date);
    setShowForm(true); loadProposals(); refresh(true);
  }

  async function saveDetails(pid: string) {
    if (!isValidAddress(editAddr)) { setEditErr(true); setEditShake((n) => n + 1); hapticError(); return; }
    const { error } = await supabase.rpc('set_date_details', { p_proposal: pid, p_address: editAddr.trim(), p_description: editDesc.trim() || null });
    if (error) { setEditErr(true); setEditShake((n) => n + 1); hapticError(); return; }
    setEditing(null); setEditErr(false); loadProposals();
  }

  async function approve(pid: string) {
    const { error } = await supabase.rpc('approve_date', { p_proposal: pid });
    if (error) notify(t('common.error'), error.message);
    loadProposals(); refresh(true);
  }

  const other = match ? profs[match.other_matchmaker] : undefined;
  async function addFriend() {
    setMenu(false);
    if (!other?.friend_code) return;
    const { error } = await supabase.rpc('request_friend', { p_code: other.friend_code });
    notify(error ? t('common.error') : t('chats.menu.friendSent'), error?.message);
  }
  async function release() {
    if (!match) return;
    await supabase.rpc('release_claim', { p_claim: match.my_claim_id });
    setMenu(false); refresh(true); router.back();
  }
  async function report() {
    if (!match) return;
    setMenu(false);
    await supabase.from('reports').insert({ reporter: uid, reported: match.other_matchmaker, reason: 'Rapporterad från matchmaker-chatt' });
    notify(t('chats.menu.reported'));
  }
  async function block() {
    if (!match) return;
    await supabase.from('blocks').insert({ blocker: uid, blocked: match.other_matchmaker });
    setMenu(false); refresh(true); router.back();
  }

  if (!match) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const otherSingle = profs[match.other_single];
  const openProposal = props.find((p) => ['pending', 'sent', 'confirmed'].includes(p.status));
  const name = match.other_matchmaker_name;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingHorizontal: 8, paddingBottom: 6, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Btn kind="ghost" icon="back" label={t('common.back')} onPress={() => router.back()} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{name}</Text>
        <Pressable accessibilityLabel={t('chats.menu.title')} onPress={() => { setConfirmRelease(false); setMenu(true); }} style={{ padding: 12 }}>
          <Icon name="more" size={24} />
        </Pressable>
      </View>

      <Modal transparent visible={menu} animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenu(false)}>
          <View style={{ position: 'absolute', top: 96, right: 12, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 6, minWidth: 250, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
            {!isFriend && <MenuItem icon="userplus" label={t('chats.menu.addFriend', { name })} onPress={addFriend} />}
            {confirmRelease ? (
              <View style={{ padding: 14 }}>
                <Text style={{ color: colors.text, marginBottom: 10 }}>{t('chats.menu.releaseAsk')}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn kind="danger" label={t('chats.menu.releaseYes')} onPress={release} style={{ flex: 1 }} />
                  <Btn kind="soft" label={t('common.cancel')} onPress={() => setConfirmRelease(false)} style={{ flex: 1 }} />
                </View>
              </View>
            ) : <MenuItem icon="exit" label={t('chats.menu.release')} onPress={() => setConfirmRelease(true)} />}
            <MenuItem icon="flag" label={t('chats.menu.report', { name })} onPress={report} />
            <MenuItem icon="ban" danger label={t('chats.menu.block', { name })} onPress={block} />
          </View>
        </Pressable>
      </Modal>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: 18, paddingBottom: 28 }} keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        <Muted style={{ marginBottom: 8 }}>{t('chats.hint')}</Muted>
        {otherSingle && (
          <Card>
            <View style={{ flexDirection: 'row' }}>
              {otherSingle.photos[0] ? <Image source={{ uri: otherSingle.photos[0] }} style={{ width: 72, height: 96, borderRadius: 14, marginRight: 12 }} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{otherSingle.first_name}, {ageFromBirthDate(otherSingle.birth_date)}</Text>
                {otherSingle.city ? <Muted>{otherSingle.city}</Muted> : null}
                {otherSingle.bio ? <Text style={{ color: colors.text, marginTop: 4 }}>{otherSingle.bio}</Text> : null}
              </View>
            </View>
            {otherSingle.answers.map((a) => <Muted key={a.prompt} style={{ marginTop: 6 }}>{a.prompt} <Text style={{ color: colors.text, fontWeight: '600' }}>{a.answer}</Text></Muted>)}
          </Card>
        )}
        {msgs.map((m) => (
          <ChatBubble key={m.id} mine={m.sender_id === uid} system={m.kind === 'system'} text={m.body} time={new Date(m.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })} />
        ))}
        {props.filter((p) => p.status !== 'cancelled').map((p) => (
          <DateCard key={p.id} place={p.place} address={p.address} description={p.description} startsAt={p.starts_at}
            countdown={p.status === 'confirmed' || p.status === 'sent' ? formatCountdown(p.starts_at, now) : undefined}
            status={{ label: t(`chats.status.${p.status}`), tone: p.status === 'confirmed' ? 'good' : p.status === 'declined' ? 'bad' : 'wait' }}>
            {p.status === 'pending' && !p.i_approved && <Btn label={t('chats.approve')} onPress={() => approve(p.id)} />}
            {p.status === 'pending' && p.i_approved && <Muted>{t('chats.waitingOther')}</Muted>}
            {(p.status === 'pending' || p.status === 'sent') && <Btn kind="ghost" label={t('chats.change')} onPress={() => change(p)} />}
            {['pending', 'sent', 'confirmed'].includes(p.status) && editing !== p.id && (
              <Btn kind={p.address ? 'ghost' : 'soft'} icon="pin" label={p.address ? t('chats.editAddress') : t('chats.addAddress')}
                onPress={() => { setEditing(p.id); setEditAddr(p.address ?? ''); setEditDesc(p.description ?? ''); setEditErr(false); }} />
            )}
            {editing === p.id && (
              <View>
                <Field label={t('chats.address')} value={editAddr} onChangeText={(x) => { setEditAddr(x); setEditErr(false); }} error={editErr} errorText={t('chats.errAddress')} shake={editShake} placeholder={t('chats.addressHint')} autoCapitalize="words" />
                <Field label={t('chats.description')} value={editDesc} onChangeText={setEditDesc} multiline maxLength={400} style={{ minHeight: 72, textAlignVertical: 'top' }} />
                <View style={{ gap: 8 }}>
                  <Btn label={t('chats.saveDetails')} onPress={() => saveDetails(p.id)} />
                  <Btn kind="ghost" label={t('common.cancel')} onPress={() => setEditing(null)} />
                </View>
              </View>
            )}
          </DateCard>
        ))}
        {!openProposal && !showForm && <Btn kind="soft" icon="calendar" label={t('chats.proposeDate')} onPress={() => setShowForm(true)} />}
        {showForm && (
          <Card>
            <Field label={t('chats.placeName')} value={place} onChangeText={(x) => { setPlace(x); setPlaceErr(false); }} error={placeErr} shake={formShake} />
            <Field label={t('chats.address')} value={address} onChangeText={(x) => { setAddress(x); setAddrErr(false); }} error={addrErr} shake={formShake} autoCapitalize="words" placeholder={t('chats.addressHint')} />
            <Muted style={{ fontWeight: '700', marginBottom: 8 }}>{t('chats.ideas')}</Muted>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 4 }}>
              {suggestIdeas(Object.values(profs).map((p) => `${p.bio ?? ''} ${p.answers.map((a) => a.answer).join(' ')}`).join(' ')).map(({ idea, match }) => (
                <Chip key={idea.key} label={match ? `${idea.title} · ${t('chats.ideasFit')}` : idea.title} active={description === idea.description} onPress={() => setDescription(idea.description)} />
              ))}
            </ScrollView>
            <Field label={t('chats.description')} value={description} onChangeText={setDescription} multiline maxLength={400} style={{ minHeight: 84, textAlignVertical: 'top' }} />
            <DateField label={t('chats.date')} mode="date" value={day} onChange={setDay} minimumDate={new Date()} doneLabel={t('common.done')} initial={tomorrow} error={dateErr} shake={formShake} />
            <DateField label={t('chats.time')} mode="time" value={time} onChange={setTime} doneLabel={t('common.done')} error={dateErr} shake={formShake} />
            <Chip label={t('chats.doubleDate')} active={dbl} onPress={() => setDbl(!dbl)} />
            {formError ? <Text style={{ color: colors.danger, marginVertical: 8 }}>{formError}</Text> : null}
            <View style={{ gap: 8, marginTop: 8 }}>
              <Btn label={sending ? t('chats.sending') : t('chats.proposeDate')} onPress={propose} loading={sending} />
              <Btn kind="ghost" label={t('common.cancel')} onPress={() => { setShowForm(false); setFormError(''); }} />
            </View>
          </Card>
        )}
      </ScrollView>
      <ChatInput value={text} onChange={setText} onSend={send} placeholder={t('chats.typeMessage')} bottomInset={insets.bottom} />
    </KeyboardAvoidingView>
  );
}
