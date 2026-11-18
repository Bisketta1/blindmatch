import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { Card, H1, Muted } from '../../src/components/ui';
import { colors } from '../../src/theme';

export type MatchRow = {
  match_id: string; status: string; expires_at: string; my_claim_id: string; my_single: string; my_single_name: string;
  other_single: string; other_single_name: string; other_matchmaker: string; other_matchmaker_name: string;
};

export default function Chats() {
  const { t } = useTranslation();
  const router = useRouter();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const load = useCallback(async () => { const { data } = await supabase.rpc('get_my_matches'); setRows((data as MatchRow[]) ?? []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 64 }}>
      <H1>{t('chats.title')}</H1>
      {rows.length === 0 && <Muted>{t('chats.empty')}</Muted>}
      {rows.map((r) => (
        <Pressable key={r.match_id} onPress={() => router.push(`/chat/${r.match_id}`)}>
          <Card>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{r.other_matchmaker_name}</Text>
            <Muted>{t('chats.with', { other: r.other_matchmaker_name, otherSingle: r.other_single_name, mySingle: r.my_single_name })}</Muted>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
