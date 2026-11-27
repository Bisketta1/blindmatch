import React, { useCallback, useState } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';
import { notify } from '@/shared/lib/notify';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/api/supabase';
import { useSession } from '@/features/auth/session';
import { Btn, Card, Field, H1, Muted } from '@/shared/ui/ui';
import { hapticError } from '@/shared/lib/haptics';
import { colors } from '@/shared/theme';
import { EmptyState, ListGroup, ListRow } from '@/shared/ui/List';
import { Sheet } from '@/shared/ui/Sheet';
import { SharedWithMe } from '@/features/safety/SharedWithMe';

type Req = { id: string; requester: string; first_name: string };
type Friend = { id: string; first_name: string };

export default function Friends() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, profile } = useSession();
  const [code, setCode] = useState('');
  const [reqs, setReqs] = useState<Req[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [actionFor, setActionFor] = useState<Friend | null>(null);
  const [reportFor, setReportFor] = useState<Friend | null>(null);
  const [reason, setReason] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [codeShake, setCodeShake] = useState(0);
  const [reasonErr, setReasonErr] = useState(false);
  const [reasonShake, setReasonShake] = useState(0);

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
    if (!code.trim()) { setCodeErr(t('errors.code')); setCodeShake((n) => n + 1); hapticError(); return; }
    const { error } = await supabase.rpc('request_friend', { p_code: code });
    if (error) { setCodeErr(t('errors.badCode')); setCodeShake((n) => n + 1); hapticError(); return; }
    setCodeErr(''); setCode(''); notify(t('friends.sent')); load();
  }
  async function respond(id: string, accept: boolean) { await supabase.rpc('respond_friend', { p_id: id, p_accept: accept }); load(); }
  async function block(f: Friend) {
    await supabase.from('blocks').insert({ blocker: session!.user.id, blocked: f.id }); load();
  }
  async function sendReport() {
    if (!reportFor) return;
    if (!reason.trim()) { setReasonErr(true); setReasonShake((n) => n + 1); hapticError(); return; }
    setReasonErr(false);
    await supabase.from('reports').insert({ reporter: session!.user.id, reported: reportFor.id, reason: reason.trim() });
    setReportFor(null); setReason(''); notify(t('friends.reported'));
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
      <H1>{t('friends.title')}</H1>
      <Card>
        <Muted>{t('friends.myCode')}</Muted>
        <Text selectable style={{ fontSize: 32, fontWeight: '800', color: colors.primary, letterSpacing: 2, marginVertical: 6 }}>{profile?.friend_code}</Text>
        <Btn kind="soft" label={t('friends.share')} onPress={() => Share.share({ message: `Lägg till mig på blindmatch! Min kod: ${profile?.friend_code}` })} />
      </Card>
      <Field label={t('friends.enterCode')} value={code} onChangeText={(x) => { setCode(x); setCodeErr(''); }} autoCapitalize="none" error={!!codeErr} errorText={codeErr} shake={codeShake} />
      <Btn label={t('friends.add')} onPress={add} />

      <SharedWithMe />
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
      {friends.length === 0 && <EmptyState icon="people" text={t('friends.empty')} />}
      {friends.length > 0 && (
        <ListGroup>
          {friends.map((f, i) => <ListRow key={f.id} title={f.first_name} last={i === friends.length - 1} onPress={() => setActionFor(f)} />)}
        </ListGroup>
      )}
      <Sheet visible={!!actionFor} onClose={() => setActionFor(null)} title={actionFor?.first_name ?? ''}>
        <View style={{ gap: 8, marginTop: 8 }}>
          <Btn kind="soft" icon="person" label={t('friends.viewProfile')} onPress={() => { const f = actionFor!; setActionFor(null); router.push(`/friend/${f.id}`); }} />
          <Btn kind="ghost" label={t('friends.report')} onPress={() => { setReportFor(actionFor); setActionFor(null); }} />
          <Btn kind="ghost" label={t('friends.block')} onPress={() => { const f = actionFor!; setActionFor(null); block(f); }} />
        </View>
      </Sheet>
      {reportFor && (
        <Card>
          <Field label={`${t('friends.report')}: ${reportFor.first_name} – ${t('friends.reportReason')}`} value={reason} onChangeText={(x) => { setReason(x); setReasonErr(false); }} multiline error={reasonErr} errorText={t('errors.reason')} shake={reasonShake} />
          <Btn label={t('friends.report')} onPress={sendReport} />
          <Btn kind="ghost" label={t('common.cancel')} onPress={() => setReportFor(null)} />
        </Card>
      )}
    </ScrollView>
  );
}
