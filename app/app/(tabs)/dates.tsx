import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { Btn, Card, H1, Muted } from '../../src/components/ui';
import { colors } from '../../src/theme';

type Invite = {
  invite_id: string; status: string; starts_at: string; place: string; double_date: boolean;
  other_first_name: string; clues: { prompt: string; answer: string }[]; credit: string;
};

export default function Dates() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Invite[]>([]);
  const load = useCallback(async () => { const { data } = await supabase.rpc('get_my_invites'); setRows((data as Invite[]) ?? []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function respond(id: string, accept: boolean) {
    const { data, error } = await supabase.rpc('respond_invite', { p_invite: id, p_accept: accept });
    if (error) Alert.alert(t('common.error'), error.message);
    else if (data === 'confirmed') Alert.alert('🎉', t('dates.confirmed'));
    load();
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 64 }}>
      <H1>{t('dates.title')}</H1>
      {rows.length === 0 && <Muted>{t('dates.empty')}</Muted>}
      {rows.map((r) => (
        <Card key={r.invite_id}>
          <Text style={{ fontSize: 13, color: colors.muted }}>{t('dates.invite')}</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginVertical: 4 }}>{t('dates.with', { name: r.other_first_name })}</Text>
          <Text style={{ color: colors.text }}>{r.place} · {new Date(r.starts_at).toLocaleString('sv-SE')}</Text>
          <Muted style={{ marginTop: 4 }}>{t('dates.credit', { names: r.credit })}</Muted>
          {r.double_date && <Muted>{t('dates.double')}</Muted>}
          {r.clues.length > 0 && <Text style={{ fontWeight: '700', marginTop: 8, color: colors.text }}>{t('dates.clues')}</Text>}
          {r.clues.map((c) => <Muted key={c.prompt}>{c.prompt} <Text style={{ color: colors.text, fontWeight: '600' }}>{c.answer}</Text></Muted>)}
          {r.status === 'sent' ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Btn label={t('dates.accept')} onPress={() => respond(r.invite_id, true)} style={{ flex: 1 }} />
              <Btn kind="soft" label={t('dates.decline')} onPress={() => respond(r.invite_id, false)} style={{ flex: 1 }} />
            </View>
          ) : <Muted style={{ marginTop: 8 }}>{r.status === 'accepted' ? t('dates.accepted') : t('dates.declined')}</Muted>}
        </Card>
      ))}
    </ScrollView>
  );
}
