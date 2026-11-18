import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { notify } from '../lib/notify';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import { isAdult } from '../lib/age';
import { pickAndUploadPhoto } from '../lib/photos';
import { Btn, Chip, Field, Muted, Shake } from './ui';
import { hapticError } from '../lib/haptics';
import { Icon } from './Icon';
import { DateField, toDateString } from './DateField';
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
  const [submitted, setSubmitted] = useState(false);
  const [shake, setShake] = useState(0);
  const set = <K extends keyof ProfileValues>(k: K, val: ProfileValues[K]) => setV((cur) => ({ ...cur, [k]: val }));

  useEffect(() => { supabase.from('prompts').select('id,text_sv').order('id').then(({ data }) => setPrompts((data as Prompt[]) ?? [])); }, []);

  async function addPhoto() {
    try {
      const url = await pickAndUploadPhoto(session!.user.id);
      if (url) setV((cur) => ({ ...cur, photos: [...cur.photos, url].slice(0, 4) }));
    } catch (e: any) { notify(t('common.error'), e.message); }
  }
  const filled = Object.values(v.answers).filter((a) => a.trim()).length;

  const errName = submitted && !v.firstName.trim();
  const errBirth = submitted && mode === 'create' && !isAdult(v.birth);
  const errPhotos = submitted && v.photos.length === 0;

  function submit() {
    const bad = !v.firstName.trim() || (mode === 'create' && !isAdult(v.birth)) || v.photos.length === 0;
    setSubmitted(true);
    if (bad) { setShake((n) => n + 1); hapticError(); return; }
    onSubmit(v);
  }

  return (
    <View>
      <Field label={t('onboarding.firstName')} value={v.firstName} onChangeText={(x) => set('firstName', x)} error={errName} errorText={t('errors.name')} shake={shake} />
      {mode === 'create'
        ? <DateField label={t('onboarding.birthDate')} mode="date" value={v.birth} onChange={(x) => set('birth', x)}
            placeholder={t('onboarding.birthPlaceholder')} minimumDate={new Date(1940, 0, 1)}
            maximumDate={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate())}
            initial={new Date(new Date().getFullYear() - 25, 5, 15, 12)} doneLabel={t('common.done')} error={errBirth} shake={shake} />
        : <Muted style={{ marginBottom: 12 }}>{t('onboarding.birthDate')}: {v.birth}</Muted>}
      {errBirth && <Muted style={{ color: colors.danger, marginTop: -8, marginBottom: 10 }}>{v.birth ? t('onboarding.tooYoung') : t('errors.birth')}</Muted>}
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
      <Shake trigger={shake} style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: errPhotos ? 4 : 12, padding: errPhotos ? 6 : 0, borderWidth: errPhotos ? 2 : 0, borderColor: colors.danger, borderRadius: 18, backgroundColor: errPhotos ? '#FFF1F0' : 'transparent' }}>
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
      </Shake>
      {errPhotos && <Muted style={{ color: colors.danger, marginBottom: 10 }}>{t('onboarding.needPhoto')}</Muted>}
      <Field label={t('onboarding.bio')} value={v.bio} onChangeText={(x) => set('bio', x)} multiline maxLength={500} style={{ minHeight: 80 }} />
      <Muted style={{ marginBottom: 6 }}>{t('onboarding.answers')}</Muted>
      {prompts.map((p) => (
        <Field key={p.id} label={p.text_sv} value={v.answers[p.id] ?? ''} maxLength={300}
          editable={!!v.answers[p.id]?.trim() || filled < 3}
          onChangeText={(x) => set('answers', { ...v.answers, [p.id]: x })} />
      ))}
      <Chip label={t('onboarding.matchable')} active={v.matchable} onPress={() => set('matchable', !v.matchable)} />
      {mode === 'create' && <Muted style={{ marginVertical: 12 }}>{t('onboarding.consent')}</Muted>}
      <Btn label={submitLabel} onPress={submit} loading={busy} style={{ marginTop: 12 }} />
    </View>
  );
}
