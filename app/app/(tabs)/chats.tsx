import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/api/supabase';
import { H1, Muted } from '@/shared/ui/ui';
import { EmptyState, ListGroup, ListRow } from '@/shared/ui/List';
import { useBadges } from '@/features/matches/badges';
import { colors } from '@/shared/theme';

export type MatchRow = {
  match_id: string; status: string; expires_at: string; my_claim_id: string; my_single: string; my_single_name: string;
  other_single: string; other_single_name: string; other_matchmaker: string; other_matchmaker_name: string;
};

export default function Chats() {
  const { t } = useTranslation();
  const router = useRouter();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [resting, setResting] = useState<Set<string>>(new Set());
  const [unread, setUnread] = useState<Record<string, number>>({});
  const { badges } = useBadges();
  const load = useCallback(async () => {
    const [{ data }, { data: u }, { data: rs }] = await Promise.all([supabase.rpc('get_my_matches'), supabase.rpc('get_unread'), supabase.rpc('get_resting_matches')]);
    setResting(new Set(((rs as { match_id: string }[]) ?? []).map((x) => x.match_id)));
    setRows((data as MatchRow[]) ?? []);
    const map: Record<string, number> = {};
    ((u as { match_id: string; unread: number }[]) ?? []).forEach((r) => { map[r.match_id] = r.unread; });
    setUnread(map);
  }, []);
  useEffect(() => { load(); }, [badges.chats, load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 16 }}>
      <H1>{t('chats.title')}</H1>
      {rows.length === 0 && <EmptyState icon="chat" text={t('chats.empty')} />}
      {Object.entries(rows.reduce<Record<string, MatchRow[]>>((acc, r) => { (acc[r.other_matchmaker] ??= []).push(r); return acc; }, {})).map(([mm, group]) => (
        <View key={mm} style={{ marginBottom: 20 }}>
          {group.length > 1 && <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 8 }}>{t('chats.groupTitle', { name: group[0].other_matchmaker_name, count: group.length })}</Text>}
          <ListGroup>
            {group.map((r, i) => (
              <ListRow key={r.match_id} last={i === group.length - 1} onPress={() => router.push(`/chat/${r.match_id}`)}
                title={r.other_matchmaker_name} badge={unread[r.match_id] ?? 0}
                subtitle={t('chats.with', { other: r.other_matchmaker_name, otherSingle: r.other_single_name, mySingle: r.my_single_name }) + (resting.has(r.match_id) ? ` · ${t('chats.resting')}` : '')} />
            ))}
          </ListGroup>
        </View>
      ))}
    </ScrollView>
  );
}
