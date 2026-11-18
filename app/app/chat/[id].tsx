import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/lib/session';
import { ageFromBirthDate } from '../../src/lib/age';
import { Btn, Card, Chip, Field, Muted } from '../../src/components/ui';
import type { MatchRow } from '../(tabs)/chats';
import { colors, radius } from '../../src/theme';

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type Proposal = { id: string; starts_at: string; place: string; double_date: boolean; status: string; i_approved: boolean };
type Prof = { id: string; first_name: string; birth_date: string; city: string | null; bio: string | null; photos: string[] };

export default function ChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const uid = session!.user.id;
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [props, setProps] = useState<Proposal[]>([]);
  const [profs, setProfs] = useState<Record<string, Prof & { answers: { prompt: string; answer: string }[] }>>({});
  const [place, setPlace] = useState('');
  const [when, setWhen] = useState('');
  const [dbl, setDbl] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const scroll = useRef<any>(null);

  const loadProposals = useCallback(async () => {
    const { data } = await supabase.rpc('get_match_proposals', { p_match: id });
    setProps((data as Proposal[]) ?? []);
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_my_matches');
      const m = ((data as MatchRow[]) ?? []).find((x) => x.match_id === id) ?? null;
      setMatch(m);
      if (m) {
        const { data: ps } = await supabase.from('profiles').select('id,first_name,birth_date,city,bio,photos').in('id', [m.other_single, m.my_single]);
        const { data: ans } = await supabase.from('profile_answers').select('profile_id,answer,prompts(text_sv)').in('profile_id', [m.other_single, m.my_single]).order('position');
        const map: any = {};
        (ps ?? []).forEach((p: any) => { map[p.id] = { ...p, answers: [] }; });
        (ans ?? []).forEach((a: any) => map[a.profile_id]?.answers.push({ prompt: a.prompts?.text_sv ?? '', answer: a.answer }));
        setProfs(map);
      }
      const { data: ms } = await supabase.from('messages').select('id,sender_id,body,created_at').eq('match_id', id).order('created_at');
      setMsgs((ms as Msg[]) ?? []);
      loadProposals();
    })();
    const ch = supabase.channel(`match-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${id}` },
        (p) => setMsgs((cur) => (cur.some((m) => m.id === (p.new as Msg).id) ? cur : [...cur, p.new as Msg])))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'date_proposals', filter: `match_id=eq.${id}` }, () => loadProposals())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, loadProposals]);

  async function send() {
    const body = text.trim(); if (!body) return;
    setText('');
    const { error } = await supabase.from('messages').insert({ match_id: id, sender_id: uid, body });
    if (error) Alert.alert(t('common.error'), error.message);
  }
  async function propose() {
    const iso = new Date(when.replace(' ', 'T')).toISOString();
    const { error } = await supabase.rpc('propose_date', { p_match: id, p_starts: iso, p_place: place.trim(), p_double: dbl });
    if (error) return Alert.alert(t('common.error'), error.message);
    setShowForm(false); setPlace(''); setWhen(''); loadProposals();
  }
  async function approve(pid: string) {
    const { error } = await supabase.rpc('approve_date', { p_proposal: pid });
    if (error) Alert.alert(t('common.error'), error.message);
    loadProposals();
  }
  async function release() {
    if (!match) return;
    await supabase.rpc('release_claim', { p_claim: match.my_claim_id });
    router.back();
  }

  if (!match) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const other = profs[match.other_single];
  const openProposal = props.find((p) => ['pending', 'sent', 'confirmed'].includes(p.status));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingTop: 56 }} keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        <Btn kind="ghost" icon="back" label={t('common.back')} onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <Muted style={{ marginBottom: 8 }}>{t('chats.hint')}</Muted>
        {other && (
          <Card>
            <View style={{ flexDirection: 'row' }}>
              {other.photos[0] ? <Image source={{ uri: other.photos[0] }} style={{ width: 72, height: 96, borderRadius: 14, marginRight: 12 }} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{other.first_name}, {ageFromBirthDate(other.birth_date)}</Text>
                {other.city ? <Muted>{other.city}</Muted> : null}
                {other.bio ? <Text style={{ color: colors.text, marginTop: 4 }}>{other.bio}</Text> : null}
              </View>
            </View>
            {other.answers.map((a) => <Muted key={a.prompt} style={{ marginTop: 6 }}>{a.prompt} <Text style={{ color: colors.text, fontWeight: '600' }}>{a.answer}</Text></Muted>)}
          </Card>
        )}
        {msgs.map((m) => (
          <View key={m.id} style={{ alignSelf: m.sender_id === uid ? 'flex-end' : 'flex-start', maxWidth: '82%', marginBottom: 8,
            backgroundColor: m.sender_id === uid ? colors.primary : colors.card, borderRadius: radius.card, padding: 12, borderWidth: m.sender_id === uid ? 0 : 1, borderColor: colors.line }}>
            <Text style={{ color: m.sender_id === uid ? '#fff' : colors.text }}>{m.body}</Text>
          </View>
        ))}
        {props.map((p) => (
          <Card key={p.id} style={{ backgroundColor: colors.primarySoft }}>
            <Text style={{ fontWeight: '800', color: colors.text }}>{p.place}</Text>
            <Muted>{new Date(p.starts_at).toLocaleString('sv-SE')}{p.double_date ? ' · dubbeldejt' : ''}</Muted>
            <Text style={{ marginVertical: 4, color: colors.text }}>{t(`chats.status.${p.status}`)}</Text>
            {p.status === 'pending' && !p.i_approved && <Btn label={t('chats.approve')} onPress={() => approve(p.id)} />}
            {p.status === 'pending' && p.i_approved && <Muted>{t('chats.waitingOther')}</Muted>}
          </Card>
        ))}
        {!openProposal && !showForm && <Btn kind="soft" label={t('chats.proposeDate')} onPress={() => setShowForm(true)} />}
        {showForm && (
          <Card>
            <Field label={t('chats.place')} value={place} onChangeText={setPlace} />
            <Field label={t('chats.when')} value={when} onChangeText={setWhen} placeholder="2026-11-28 18:30" />
            <Chip label={t('chats.doubleDate')} active={dbl} onPress={() => setDbl(!dbl)} />
            <Btn label={t('chats.proposeDate')} onPress={propose} disabled={!place.trim() || !when.trim()} />
            <Btn kind="ghost" label={t('common.cancel')} onPress={() => setShowForm(false)} />
          </Card>
        )}
        <Btn kind="ghost" label={t('chats.release')} onPress={release} style={{ marginTop: 12 }} />
      </ScrollView>
      <View style={{ flexDirection: 'row', padding: 12, gap: 8, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line }}>
        <View style={{ flex: 1 }}><Field value={text} onChangeText={setText} placeholder={t('chats.typeMessage')} onSubmitEditing={send} /></View>
        <Btn label={t('chats.send')} onPress={send} disabled={!text.trim()} style={{ height: 48 }} />
      </View>
    </KeyboardAvoidingView>
  );
}
