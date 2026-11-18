import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/lib/session';
import { hapticLight } from '../../src/lib/haptics';
import { Btn, Field, Muted } from '../../src/components/ui';
import { colors, radius } from '../../src/theme';

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type DateRow = { proposal_id: string; other_first_name: string; place: string; starts_at: string; chat_open: boolean };

/** Chat between the two blind-date singles on the day of the date. They only know each other's first name. */
export default function DateChat() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const uid = session!.user.id;
  const [info, setInfo] = useState<DateRow | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const scroll = useRef<any>(null);

  const load = useCallback(async () => {
    const [{ data: ds }, { data: ms }] = await Promise.all([
      supabase.rpc('get_my_dates'),
      supabase.from('date_messages').select('id,sender_id,body,created_at').eq('proposal_id', id).order('created_at'),
    ]);
    setInfo(((ds as DateRow[]) ?? []).find((d) => d.proposal_id === id) ?? null);
    setMsgs((ms as Msg[]) ?? []);
  }, [id]);

  useEffect(() => {
    load();
    const ch = supabase.channel(`date-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'date_messages', filter: `proposal_id=eq.${id}` },
        (p) => setMsgs((cur) => (cur.some((m) => m.id === (p.new as Msg).id) ? cur : [...cur, p.new as Msg])))
      .subscribe();
    const poll = setInterval(load, 5000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [id, load]);

  async function send(body: string) {
    const b = body.trim(); if (!b) return;
    setError(''); setText(''); hapticLight();
    const { error: e } = await supabase.from('date_messages').insert({ proposal_id: id, sender_id: uid, body: b });
    if (e) setError(t('dateChat.closed'));
  }

  const name = info?.other_first_name ?? '';
  const open = info?.chat_open ?? true;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: 52, paddingHorizontal: 8, paddingBottom: 10, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Btn kind="ghost" icon="back" label={t('common.back')} onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <View style={{ paddingHorizontal: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{t('dateChat.title')}</Text>
          {info && <Muted>{t('dateChat.with', { name })} · {info.place} · {new Date(info.starts_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</Muted>}
        </View>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 18, paddingBottom: 24 }} keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        <Muted style={{ marginBottom: 14, textAlign: 'center' }}>{t('dateChat.hint')}</Muted>
        {msgs.length === 0 && <Muted style={{ textAlign: 'center', marginTop: 24 }}>{t('dateChat.empty')}</Muted>}
        {msgs.map((m) => (
          <View key={m.id} style={{ alignSelf: m.sender_id === uid ? 'flex-end' : 'flex-start', maxWidth: '82%', marginBottom: 8,
            backgroundColor: m.sender_id === uid ? colors.primary : colors.card, borderRadius: radius.card, padding: 12, borderWidth: m.sender_id === uid ? 0 : 1, borderColor: colors.line }}>
            <Text style={{ color: m.sender_id === uid ? '#fff' : colors.text }}>{m.body}</Text>
          </View>
        ))}
      </ScrollView>
      {error ? <Text style={{ color: colors.danger, textAlign: 'center', paddingBottom: 6 }}>{error}</Text> : null}
      {open && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 8 }}>
          {(t('dateChat.quick', { returnObjects: true }) as unknown as string[]).map((q) => (
            <Pressable key={q} onPress={() => send(q)} style={{ backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <View style={{ flexDirection: 'row', padding: 12, gap: 8, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line }}>
        <View style={{ flex: 1 }}><Field value={text} onChangeText={setText} placeholder={t('dateChat.placeholder', { name })} onSubmitEditing={() => send(text)} editable={open} /></View>
        <Btn label={t('chats.send')} onPress={() => send(text)} disabled={!text.trim() || !open} style={{ height: 48 }} />
      </View>
    </KeyboardAvoidingView>
  );
}
