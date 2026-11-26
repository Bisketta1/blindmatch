import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/api/supabase';
import { useSession } from '@/features/auth/session';
import { hapticLight } from '@/shared/lib/haptics';
import { Btn, Field, Muted } from '@/shared/ui/ui';
import { Display } from '@/shared/ui/Display';
import { ChatBubble } from '@/features/chat/ChatBubble';
import { ChatInput } from '@/features/chat/ChatInput';
import { QuickReplies } from '@/features/dates/QuickReplies';
import { ReplyFlight, ReplyFlightHandle } from '@/features/dates/ReplyFlight';
import { Icon } from '@/shared/ui/Icon';
import { addressLabel, mapsUrl } from '@/features/dates/maps';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/shared/theme';

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type DateRow = { proposal_id: string; other_first_name: string; place: string; address: string | null; starts_at: string; chat_open: boolean };

/** Chat between the two blind-date singles on the day of the date. They only know each other's first name. */
export default function DateChat() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const uid = session!.user.id;
  const [info, setInfo] = useState<DateRow | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const scroll = useRef<any>(null);
  const flight = useRef<ReplyFlightHandle>(null);
  const listArea = useRef<any>(null);

  const load = useCallback(async () => {
    const [{ data: ds }, { data: ms }] = await Promise.all([
      supabase.rpc('get_my_dates_v2'),
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
      <View style={{ paddingTop: 8, paddingHorizontal: 8, paddingBottom: 10, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Btn kind="ghost" icon="back" label={t('common.back')} onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <View style={{ paddingHorizontal: 12 }}>
          <Display style={{ fontSize: 26, lineHeight: 32 }}>{t('dateChat.title')}</Display>
          {info && <Muted>{t('dateChat.with', { name })} · {info.place} · {new Date(info.starts_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</Muted>}
          {info?.address ? (
            <Pressable onPress={() => Linking.openURL(mapsUrl(info.address!))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 44 }}>
              <Icon name="pin" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', flex: 1 }} numberOfLines={1}>{addressLabel(info.address, t('dateCard.mapLink'))} · {t('dateCard.openMap')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View ref={listArea} collapsable={false} style={{ flex: 1 }}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 18, paddingBottom: 24, flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        <Muted style={{ marginBottom: 14, textAlign: 'center' }}>{t('dateChat.hint')}</Muted>
        {msgs.length === 0 && <Muted style={{ textAlign: 'center', marginTop: 24 }}>{t('dateChat.empty')}</Muted>}
        {msgs.map((m) => (
          <ChatBubble key={m.id} mine={m.sender_id === uid} text={m.body} time={new Date(m.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })} />
        ))}
      </ScrollView>
      </View>
      {error ? <Text style={{ color: colors.danger, textAlign: 'center', paddingBottom: 6 }}>{error}</Text> : null}
      {open && <QuickReplies replies={t('dateChat.quick', { returnObjects: true }) as unknown as string[]} flight={flight} landing={listArea} onSend={send} />}
      <ChatInput value={text} onChange={setText} onSend={() => send(text)} placeholder={t('dateChat.placeholder', { name })} editable={open} bottomInset={insets.bottom} />
      <ReplyFlight ref={flight} />
    </KeyboardAvoidingView>
  );
}
