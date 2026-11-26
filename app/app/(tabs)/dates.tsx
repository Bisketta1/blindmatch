import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/api/supabase';
import { notify } from '@/shared/lib/notify';
import { Btn, H1, Muted } from '@/shared/ui/ui';
import { Display } from '@/shared/ui/Display';
import { DateCard } from '@/features/dates/DateCard';
import { FeedbackCard } from '@/features/dates/FeedbackCard';
import { formatCountdown, isPast } from '@/features/dates/countdown';
import { useNow } from '@/shared/lib/useNow';
import { addressLabel } from '@/features/dates/maps';
import { RescheduleSection } from '@/features/reschedule/RescheduleSection';
import { colors } from '@/shared/theme';

type Invite = {
  invite_id: string; status: string; starts_at: string; place: string; address: string | null; description: string | null; double_date: boolean;
  other_first_name: string; clues: { prompt: string; answer: string }[]; credit: string;
  proposal_id: string; proposal_status: string; chat_open: boolean;
};

export default function Dates() {
  const { t } = useTranslation();
  const router = useRouter();
  const now = useNow();
  const [rows, setRows] = useState<Invite[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { const { data } = await supabase.rpc('get_my_dates_v2'); setRows((data as Invite[]) ?? []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function respond(id: string, accept: boolean) {
    const { data, error } = await supabase.rpc('respond_invite', { p_invite: id, p_accept: accept });
    if (error) notify(t('common.error'), error.message);
    else if (data === 'confirmed') notify(t('dates.confirmedTitle'), t('dates.confirmed'));
    load();
  }
  function share(r: Invite) {
    const when = new Date(r.starts_at).toLocaleString('sv-SE', { dateStyle: 'full', timeStyle: 'short' });
    const where = r.address ? addressLabel(r.address, 'se kartlänken') : r.place;
    Share.share({ title: t('dateCard.shareTitle'), message: t('dateCard.shareText', { place: r.place, when, address: where, name: r.other_first_name }) });
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
      <H1>{t('dates.title')}</H1>
      {rows.length === 0 && <Muted>{t('dates.empty')}</Muted>}
      {rows.map((r) => {
        const past = isPast(r.starts_at, now);
        const feedbackTime = isPast(new Date(new Date(r.starts_at).getTime() + 2 * 3600000), now);
        const confirmed = r.proposal_status === 'confirmed';
        const tone = confirmed ? 'good' : r.status === 'declined' ? 'bad' : 'wait';
        const label = confirmed ? t('dateCard.confirmed') : r.status === 'accepted' ? t('dates.accepted') : r.status === 'declined' ? t('dates.declined') : t('dates.invite');
        return (
          <View key={r.invite_id} style={{ marginBottom: 12 }}>
            <Display style={{ fontSize: 26, lineHeight: 32 }}>{t('dates.with', { name: r.other_first_name })}</Display>
            <Muted style={{ marginTop: 2, marginBottom: 14 }}>{t('dates.credit', { names: r.credit })}</Muted>
            <DateCard place={r.place} address={r.address} description={r.description} startsAt={r.starts_at} status={{ label, tone }}
              countdown={confirmed || r.status === 'accepted' ? formatCountdown(r.starts_at, now) : undefined}>
              {r.status === 'sent' && !past && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Btn label={t('dates.accept')} onPress={() => respond(r.invite_id, true)} style={{ flex: 1 }} />
                  <Btn kind="soft" label={t('dates.decline')} onPress={() => respond(r.invite_id, false)} style={{ flex: 1 }} />
                </View>
              )}
              {confirmed && r.chat_open && <Btn icon="chat" label={t('dates.openChat')} onPress={() => router.push(`/date-chat/${r.proposal_id}`)} />}
              {confirmed && !past && !r.chat_open && <Muted>{t('dates.chatLater')}</Muted>}
              {confirmed && !past && <RescheduleSection proposalId={r.proposal_id} startsAt={r.starts_at} onChanged={load} />}
              {confirmed && <Btn kind="ghost" icon="share" label={t('dateCard.share')} onPress={() => share(r)} />}
            </DateCard>
            {r.clues.length > 0 && !past && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>{t('dates.clues')}</Text>
                {r.clues.map((c) => <Muted key={c.prompt}>{c.prompt} <Text style={{ color: colors.text, fontWeight: '600' }}>{c.answer}</Text></Muted>)}
              </View>
            )}
            {confirmed && feedbackTime && <FeedbackCard proposalId={r.proposal_id} otherName={r.other_first_name} matchmakers={r.credit} />}
          </View>
        );
      })}
    </ScrollView>
  );
}
