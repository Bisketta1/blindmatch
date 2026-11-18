import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import { isAdult } from '../lib/age';
import { pickAndUploadPhoto } from '../lib/photos';
import { Btn, Chip, Field, Muted } from './ui';
import { Icon } from './Icon';
import { colors } from '../theme';

export type ProfileValues = {
  firstName: string; birth: string; city: string; gender: string; looking: string[]; photos: string[];
  bio: string; answers: Record<number, string>; matchable: boolean;
};
type Prompt = { id: number; text_sv: string };
const GENDERS = ['man', 'kvinna', 'icke-binar'];

export const EMPTY_PROFILE: ProfileValues = {
  firstName: '', birth: '', city: 'Stockholm', gender: '', looking: [], photos: [], bio: '', answers: {}, matchable: true,
};

export function ProfileForm({ initial, mode, submitLabel, busy, onSubmit }: {
  initial: ProfileValues; mode: 'create' | 'edit'; submitLabel: string; busy: boolean; onSubmit: (v: ProfileValues) => void;
}) {
  const { t } = useTranslation();
  const { session } = useSession();
  const [v, setV] = useState<ProfileValues>(initial);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const set = <K extends keyof ProfileValues>(k: K, val: ProfileValues[K]) => setV((cur) => ({ ...cur, [k]: val }));

  useEffect(() => { supabase.from('prompts').select('id,text_sv').order('id').then(({ data }) => setPrompts((data as Prompt[]) ?? [])); }, []);

  async function addPhoto() {
    try {
      const url = await pickAndUploadPhoto(session!.user.id);
      if (url) setV((cur) => ({ ...cur, photos: [...cur.photos, url].slice(0, 4) }));
    } catch (e: any) { Alert.alert(t('common.error'), e.message); }
  }
  const filled = Object.values(v.answers).filter((a) => a.trim()).length;

  function submit() {
    if (mode === 'create' && !isAdult(v.birth)) return Alert.alert(t('onboarding.tooYoung'));
    if (v.photos.length === 0) return Alert.alert(t('onboarding.needPhoto'));
    onSubmit(v);
  }

  return (
    <View>
      <Field label={t('onboarding.firstName')} value={v.firstName} onChangeText={(x) => set('firstName', x)} />
      {mode === 'create'
        ? <Field label={t('onboarding.birthDate')} value={v.birth} onChangeText={(x) => set('birth', x)} placeholder="2000-05-17" />
        : <Muted style={{ marginBottom: 12 }}>{t('onboarding.birthDate')}: {v.birth}</Muted>}
      <Field label={t('onboarding.city')} value={v.city} onChangeText={(x) => set('city', x)} />
      <Muted style={{ marginBottom: 6 }}>{t('onboarding.gender')}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {GENDERS.map((g) => <Chip key={g} label={t(`gender.${g}`)} active={v.gender === g} onPress={() => set('gender', g)} />)}
      </View>
      <Muted style={{ marginBottom: 6 }}>{t('onboarding.lookingFor')}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {GENDERS.map((g) => (
          <Chip key={g} label={t(`gender.${g}`)} active={v.looking.includes(g)}
            onPress={() => set('looking', v.looking.includes(g) ? v.looking.filter((x) => x !== g) : [...v.looking, g])} />
        ))}
      </View>
      <Muted style={{ marginTop: 6 }}>{t('onboarding.photos')}</Muted>
      <Muted style={{ marginBottom: 8, fontSize: 12 }}>{t('onboarding.removePhoto')}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        {v.photos.map((u) => (
          <Pressable key={u} onPress={() => set('photos', v.photos.filter((x) => x !== u))} style={{ marginRight: 8, marginBottom: 8 }}>
            <Image source={{ uri: u }} style={{ width: 80, height: 106, borderRadius: 14 }} />
            <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#ffffffd9', borderRadius: 10, padding: 2 }}>
              <Icon name="minus" size={14} color={colors.danger} strokeWidth={3} />
            </View>
          </Pressable>
        ))}
        {v.photos.length < 4 && (
          <Pressable onPress={addPhoto} style={{ width: 80, height: 106, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={28} color={colors.primary} />
          </Pressable>
        )}
      </View>
      <Field label={t('onboarding.bio')} value={v.bio} onChangeText={(x) => set('bio', x)} multiline maxLength={500} style={{ minHeight: 80 }} />
      <Muted style={{ marginBottom: 6 }}>{t('onboarding.answers')}</Muted>
      {prompts.map((p) => (
        <Field key={p.id} label={p.text_sv} value={v.answers[p.id] ?? ''} maxLength={300}
          editable={!!v.answers[p.id]?.trim() || filled < 3}
          onChangeText={(x) => set('answers', { ...v.answers, [p.id]: x })} />
      ))}
      <Chip label={t('onboarding.matchable')} active={v.matchable} onPress={() => set('matchable', !v.matchable)} />
      {mode === 'create' && <Muted style={{ marginVertical: 12 }}>{t('onboarding.consent')}</Muted>}
      <Btn label={submitLabel} onPress={submit} loading={busy} disabled={!v.firstName.trim() || (mode === 'create' && !v.birth)} style={{ marginTop: 12 }} />
    </View>
  );
}
