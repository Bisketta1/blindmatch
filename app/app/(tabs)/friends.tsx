import React, { useCallback, useState } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';
import { notify } from '../../src/lib/notify';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/lib/session';
import { Btn, Card, Field, H1, Muted } from '../../src/components/ui';
import { colors } from '../../src/theme';

type Req = { id: string; requester: string; first_name: string };
type Friend = { id: string; first_name: string };

export default function Friends() {
  const { t } = useTranslation();
  const { session, profile } = useSession();
  const [code, setCode] = useState('');
  const [reqs, setReqs] = useState<Req[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [reportFor, setReportFor] = useState<Friend | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const uid = session!.user.id;
    const [{ data: r }, { data: fs }] = await Promise.all([
      supabase.rpc('get_friend_requests'),
      supabase.from('friendships').select('requester,addressee').eq('status', 'accepted'),
    ]);
    setReqs((r as Req[]) ?? []);
    const ids = (fs ?? []).map((f: any) => (f.requester === uid ? f.addressee : f.requester));
    if (!ids.length) return setFriends([]);
    const { data: ps } = await supabase.from('profiles').select('id,first_name').in('id', ids);
    setFriends((ps as Friend[]) ?? []);
  }, [session]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function add() {
    const { error } = await supabase.rpc('request_friend', { p_code: code });
    if (error) return notify(t('friends.invalid'));
    setCode(''); notify(t('friends.sent')); load();
  }
  async function respond(id: string, accept: boolean) { await supabase.rpc('respond_friend', { p_id: id, p_accept: accept }); load(); }
  async function block(f: Friend) {
    await supabase.from('blocks').insert({ blocker: session!.user.id, blocked: f.id }); load();
  }
  async function sendReport() {
    if (!reportFor || !reason.trim()) return;
    await supabase.from('reports').insert({ reporter: session!.user.id, reported: reportFor.id, reason: reason.trim() });
    setReportFor(null); setReason(''); notify(t('friends.reported'));
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 64 }} keyboardShouldPersistTaps="handled">
      <H1>{t('friends.title')}</H1>
      <Card>
        <Muted>{t('friends.myCode')}</Muted>
        <Text selectable style={{ fontSize: 32, fontWeight: '800', color: colors.primary, letterSpacing: 2, marginVertical: 6 }}>{profile?.friend_code}</Text>
        <Btn kind="soft" label={t('friends.share')} onPress={() => Share.share({ message: `Lägg till mig på blindmatch! Min kod: ${profile?.friend_code}` })} />
      </Card>
      <Field label={t('friends.enterCode')} value={code} onChangeText={setCode} autoCapitalize="none" />
      <Btn label={t('friends.add')} onPress={add} disabled={!code.trim()} />

      {reqs.length > 0 && <Text style={{ fontWeight: '800', marginTop: 24, marginBottom: 8, color: colors.text }}>{t('friends.requests')}</Text>}
      {reqs.map((r) => (
        <Card key={r.id}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{r.first_name}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Btn label={t('friends.accept')} onPress={() => respond(r.id, true)} style={{ flex: 1 }} />
            <Btn kind="soft" label={t('friends.decline')} onPress={() => respond(r.id, false)} style={{ flex: 1 }} />
          </View>
        </Card>
      ))}

      <Text style={{ fontWeight: '800', marginTop: 24, marginBottom: 8, color: colors.text }}>{t('friends.list')}</Text>
      {friends.length === 0 && <Muted>{t('friends.empty')}</Muted>}
      {friends.map((f) => (
        <Card key={f.id}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{f.first_name}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Btn kind="ghost" label={t('friends.report')} onPress={() => setReportFor(f)} style={{ flex: 1 }} />
            <Btn kind="ghost" label={t('friends.block')} onPress={() => block(f)} style={{ flex: 1 }} />
          </View>
        </Card>
      ))}
      {reportFor && (
        <Card>
          <Field label={`${t('friends.report')}: ${reportFor.first_name} – ${t('friends.reportReason')}`} value={reason} onChangeText={setReason} multiline />
          <Btn label={t('friends.report')} onPress={sendReport} disabled={!reason.trim()} />
          <Btn kind="ghost" label={t('common.cancel')} onPress={() => setReportFor(null)} />
        </Card>
      )}
    </ScrollView>
  );
}
