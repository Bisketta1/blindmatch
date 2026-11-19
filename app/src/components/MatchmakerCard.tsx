import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { matchmakerTitle } from '../lib/matchmaker';
import { Display } from './Display';
import { Icon } from './Icon';
import { Muted } from './ui';
import { colors, shadow } from '../theme';

type Card = { matches_made: number; dates_made: number; dates_held: number; liked: number; thanks: number };
type Thank = { body: string; from_first_name: string; place: string };

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Display style={{ fontSize: 30, lineHeight: 36, color: '#FFFFFF' }}>{value}</Display>
      <Text style={{ color: '#D9CFC6', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

/** Calm matchmaker reputation: a title that grows with dates that actually happened, and the thank-yous you received. */
export function MatchmakerCard() {
  const { t } = useTranslation();
  const [card, setCard] = useState<Card>({ matches_made: 0, dates_made: 0, dates_held: 0, liked: 0, thanks: 0 });
  const [thanks, setThanks] = useState<Thank[]>([]);
  useFocusEffect(useCallback(() => {
    supabase.rpc('get_matchmaker_card').then(({ data }) => data && setCard(data as Card));
    supabase.rpc('get_my_thanks').then(({ data }) => setThanks(((data as Thank[]) ?? []).slice(0, 3)));
  }, []));
  const title = matchmakerTitle(card.dates_made);

  return (
    <View style={{ backgroundColor: colors.ink, borderRadius: 28, padding: 22, marginBottom: 16, ...shadow.lift }}>
      <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' }}>{t('card.title')}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <Icon name="star" size={22} color={colors.gold} filled />
        <Display style={{ color: '#fff', fontSize: 30, lineHeight: 36 }}>{title.title}</Display>
      </View>
      {title.next ? <Text style={{ color: '#D9CFC6', fontSize: 14, marginTop: 4 }}>{t('card.next', { n: title.next - card.dates_made })}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <Stat value={card.matches_made} label={t('card.matches')} />
        <Stat value={card.dates_made} label={t('card.dates')} />
        <Stat value={card.liked} label={t('card.liked')} />
        <Stat value={card.thanks} label={t('card.thanks')} />
      </View>
      {thanks.length > 0 && (
        <View style={{ marginTop: 20, gap: 10 }}>
          <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>{t('card.thanksTitle')}</Text>
          {thanks.map((th, i) => (
            <View key={i} style={{ backgroundColor: '#3A2F2A', borderRadius: 16, padding: 14 }}>
              <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>{th.body}</Text>
              <Text style={{ color: '#D9CFC6', fontSize: 12, marginTop: 6 }}>{th.from_first_name} · {th.place}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
