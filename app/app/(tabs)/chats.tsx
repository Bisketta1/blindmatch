import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { Card, H1, Muted } from '../../src/components/ui';
import { useBadges } from '../../src/lib/badges';
import { colors } from '../../src/theme';

export type MatchRow = {
  match_id: string; status: string; expires_at: string; my_claim_id: string; my_single: string; my_single_name: string;
  other_single: string; other_single_name: string; other_matchmaker: string; other_matchmaker_name: string;
};

export default function Chats() {
  const { t } = useTranslation();
  const router = useRouter();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const { badges } = useBadges();
  const load = useCallback(async () => {
    const [{ data }, { data: u }] = await Promise.all([supabase.rpc('get_my_matches'), supabase.rpc('get_unread')]);
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
      {rows.length === 0 && <Muted>{t('chats.empty')}</Muted>}
      {rows.map((r) => (
        <Pressable key={r.match_id} onPress={() => router.push(`/chat/${r.match_id}`)}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{r.other_matchmaker_name}</Text>
              {(unread[r.match_id] ?? 0) > 0 && (
                <View style={{ backgroundColor: colors.badge, borderRadius: 12, minWidth: 24, height: 24, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{unread[r.match_id]}</Text>
                </View>
              )}
            </View>
            <Muted>{t('chats.with', { other: r.other_matchmaker_name, otherSingle: r.other_single_name, mySingle: r.my_single_name })}</Muted>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
