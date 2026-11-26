import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Btn, Card, Muted } from '@/shared/ui/ui';
import { colors } from '@/shared/theme';
import { SharedWithMe as Row, getSharedWithMe, respondShare } from './api';

const fmt = (iso: string) => new Date(iso).toLocaleString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Friends tab: dates a friend has shared with me. Shows first name, time, place and check-in only. */
export function SharedWithMe() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const load = useCallback(async () => setRows(await getSharedWithMe()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (rows.length === 0) return null;
  return (
    <View>
      <Text style={{ fontWeight: '800', marginTop: 24, marginBottom: 8, color: colors.text }}>{t('safety.sharedList')}</Text>
      {rows.map((r) => (
        <Card key={r.share_id}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{t('safety.friendDate', { name: r.single_first_name })}</Text>
          <Muted>{fmt(r.starts_at)} · {r.place}</Muted>
          {r.address ? <Muted>{r.address}</Muted> : null}
          <Text style={{ color: colors.text, marginTop: 6 }}>{r.checkin === 'none' ? t('safety.noCheckin') : t(`safety.status.${r.checkin}`)}</Text>
          <Muted>{t('safety.notEmergency')}</Muted>
          <Btn kind="ghost" label={t('safety.decline')} onPress={async () => { await respondShare(r.share_id, false); load(); }} />
        </Card>
      ))}
    </View>
  );
}
