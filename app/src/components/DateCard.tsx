import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Display } from './Display';
import { Icon } from './Icon';
import { addressLabel, mapsUrl } from '../lib/maps';
import { MONTHS_SV } from '../lib/dates';
import { colors, shadow } from '../theme';

export type DateTone = 'good' | 'wait' | 'bad';
const TONES: Record<DateTone, { bg: string; fg: string }> = {
  good: { bg: '#E3F0E8', fg: '#22573F' },
  wait: { bg: '#F5ECD9', fg: '#6E4E1C' },
  bad: { bg: '#FBE4E1', fg: '#8F241C' },
};

export function DateCard(props: {
  place: string; address?: string | null; description?: string | null; startsAt: string;
  status?: { label: string; tone: DateTone }; countdown?: string; children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const d = new Date(props.startsAt);
  const weekdays = t('dateCard.weekdays', { returnObjects: true }) as unknown as string[];
  const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const tone = props.status ? TONES[props.status.tone] : null;

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 26, borderWidth: 1, borderColor: colors.line, padding: 18, marginBottom: 16, ...shadow.card }}>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ width: 66, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', paddingVertical: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: colors.primary, textTransform: 'uppercase' }}>{MONTHS_SV[d.getMonth()]}</Text>
          <Display style={{ fontSize: 32, lineHeight: 38 }}>{d.getDate()}</Display>
          <Text style={{ fontSize: 12, color: colors.muted }}>{weekdays[d.getDay()].slice(0, 3)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {tone && props.status ? (
            <View style={{ alignSelf: 'flex-start', backgroundColor: tone.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 }}>
              <Text style={{ color: tone.fg, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 }}>{props.status.label}</Text>
            </View>
          ) : null}
          <Display style={{ fontSize: 24, lineHeight: 30 }}>{props.place}</Display>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Icon name="clock" size={16} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 15 }}>{t('dateCard.at')} {time}</Text>
          </View>
        </View>
      </View>

      {props.countdown ? <Text style={{ color: colors.goldText, fontWeight: '700', fontSize: 14, letterSpacing: 0.3, marginTop: 14 }}>{props.countdown}</Text> : null}

      {props.address ? (
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(mapsUrl(props.address!))}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: colors.bg, opacity: pressed ? 0.7 : 1, minHeight: 56 })}>
          <Icon name="pin" size={22} color={colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }} numberOfLines={2}>{addressLabel(props.address, t('dateCard.mapLink'))}</Text>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 2 }}>{t('dateCard.openMap')}</Text>
          </View>
          <Icon name="next" size={18} color={colors.muted} />
        </Pressable>
      ) : null}

      {props.description ? (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <View style={{ width: 3, borderRadius: 2, backgroundColor: colors.gold }} />
          <Text style={{ flex: 1, color: colors.text, fontSize: 16, lineHeight: 23 }}>{props.description}</Text>
        </View>
      ) : null}

      {props.children ? <View style={{ marginTop: 14, gap: 10 }}>{props.children}</View> : null}
    </View>
  );
}
