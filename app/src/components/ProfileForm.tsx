import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/api/supabase';
import { useSession } from '@/lib/session';
import { isAdult } from '@/shared/lib/age';
import { pickAndUploadPhoto } from '@/shared/lib/photos';
import { notify } from '@/shared/lib/notify';
import { hapticError, hapticLight } from '@/shared/lib/haptics';
import { Btn, Chip, Field, Muted, Section, Shake } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { DateField } from '@/components/DateField';
import { colors, radius } from '@/shared/theme';

export type Slot = { promptId: number | null; answer: string };
export type ProfileValues = {
  firstName: string; birth: string; city: string; gender: string; looking: string[]; photos: string[];
  bio: string; slots: Slot[]; matchable: boolean;
};
type Prompt = { id: number; text_sv: string };
const GENDERS = ['man', 'kvinna', 'icke-binar'];
const MAX_SLOTS = 3;
export const CITIES = ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Lund', 'Linköping', 'Örebro', 'Västerås', 'Umeå', 'Jönköping'];
const OLD_PROMPTS = 8; // prompts 1-8 are the retired old wording; they are not offered any more

export const EMPTY_PROFILE: ProfileValues = {
  firstName: '', birth: '', city: 'Stockholm', gender: '', looking: [], photos: [], bio: '', slots: [], matchable: true,
};

const slotInvalid = (s: Slot) => (s.promptId == null) !== !s.answer.trim() && (s.promptId != null || s.answer.trim() !== '');
const slotEmpty = (s: Slot) => s.promptId == null && !s.answer.trim();

export function ProfileForm({ initial, mode, submitLabel, busy, onSubmit }: {
  initial: ProfileValues; mode: 'create' | 'edit'; submitLabel: string; busy: boolean; onSubmit: (v: ProfileValues) => void;
}) {
  const { t } = useTranslation();
  const { session } = useSession();
  const [v, setV] = useState<ProfileValues>(initial);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [picking, setPicking] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [shake, setShake] = useState(0);
  const set = <K extends keyof ProfileValues>(k: K, val: ProfileValues[K]) => setV((cur) => ({ ...cur, [k]: val }));

  useEffect(() => { supabase.from('prompts').select('id,text_sv').order('id').then(({ data }) => setPrompts((data as Prompt[]) ?? [])); }, []);
  const promptText = (id: number | null) => prompts.find((p) => p.id === id)?.text_sv;

  async function addPhoto() {
    try {
      const url = await pickAndUploadPhoto(session!.user.id);
      if (url) setV((cur) => ({ ...cur, photos: [...cur.photos, url].slice(0, 4) }));
    } catch (e: any) { notify(t('common.error'), e.message); }
  }
  function movePhoto(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= v.photos.length) return;
    const next = [...v.photos]; [next[i], next[j]] = [next[j], next[i]];
    hapticLight(); set('photos', next);
  }
  const setSlot = (i: number, patch: Partial<Slot>) => set('slots', v.slots.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  const errName = submitted && !v.firstName.trim();
  const errBirth = submitted && mode === 'create' && !isAdult(v.birth);
  const errPhotos = submitted && v.photos.length === 0;
  const errSlot = (s: Slot) => submitted && slotInvalid(s);

  function submit() {
    const bad = !v.firstName.trim() || (mode === 'create' && !isAdult(v.birth)) || v.photos.length === 0 || v.slots.some(slotInvalid);
    setSubmitted(true);
    if (bad) { setShake((n) => n + 1); hapticError(); return; }
    onSubmit({ ...v, slots: v.slots.filter((s) => !slotEmpty(s)) });
  }

  const used = new Set(v.slots.map((s) => s.promptId));
  const choices = prompts.filter((p) => p.id > OLD_PROMPTS && !used.has(p.id));

  return (
    <View>
      <Section title={t('onboarding.basicsTitle')}>
        <Field label={t('onboarding.firstName')} value={v.firstName} onChangeText={(x) => set('firstName', x)} error={errName} errorText={t('errors.name')} shake={shake} />
        {mode === 'create' ? (
          <>
            <DateField label={t('onboarding.birthDate')} mode="date" value={v.birth} onChange={(x) => set('birth', x)}
              placeholder={t('onboarding.birthPlaceholder')} minimumDate={new Date(1940, 0, 1)}
              maximumDate={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate())}
              initial={new Date(new Date().getFullYear() - 25, 5, 15, 12)} doneLabel={t('common.done')} error={errBirth} shake={shake} />
            {errBirth && <Text style={{ color: colors.danger, fontSize: 12, marginTop: -10, marginBottom: 14, marginLeft: 4 }}>{v.birth ? t('onboarding.tooYoung') : t('errors.birth')}</Text>}
          </>
        ) : <Muted style={{ marginBottom: 16 }}>{t('onboarding.birthDate')}: {v.birth}</Muted>}
        <Muted style={{ fontWeight: '700', marginBottom: 8 }}>{t('onboarding.city')}</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {(v.city && !CITIES.includes(v.city) ? [v.city, ...CITIES] : CITIES).map((c) => <Chip key={c} label={c} active={v.city === c} onPress={() => set('city', c)} />)}
        </View>
      </Section>

      <Section title={t('onboarding.genderTitle')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {GENDERS.map((g) => <Chip key={g} label={t(`gender.${g}`)} active={v.gender === g} onPress={() => set('gender', g)} />)}
        </View>
      </Section>
      <Section title={t('onboarding.lookingTitle')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {GENDERS.map((g) => (
            <Chip key={g} label={t(`gender.${g}`)} active={v.looking.includes(g)}
              onPress={() => set('looking', v.looking.includes(g) ? v.looking.filter((x) => x !== g) : [...v.looking, g])} />
          ))}
        </View>
      </Section>

      <Section title={t('onboarding.photos')} hint={t('onboarding.photosHint')}>
        <Shake trigger={shake} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: errPhotos ? 8 : 0, borderWidth: errPhotos ? 2 : 0, borderColor: colors.danger, borderRadius: 20, backgroundColor: errPhotos ? '#FFF1F0' : 'transparent' }}>
          {v.photos.map((u, i) => (
            <View key={u} style={{ width: 92, height: 122 }}>
              <Image source={{ uri: u }} style={{ width: 92, height: 122, borderRadius: 16 }} />
              {i === 0 && (
                <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{t('onboarding.photoMain')}</Text>
                </View>
              )}
              <Pressable onPress={() => set('photos', v.photos.filter((x) => x !== u))} hitSlop={16}
                style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#fffffff0', borderRadius: 14, padding: 6 }}>
                <Icon name="close" size={14} color={colors.danger} strokeWidth={3} />
              </Pressable>
              <View style={{ position: 'absolute', bottom: 6, left: 6, right: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pressable onPress={() => movePhoto(i, -1)} disabled={i === 0} hitSlop={14} style={{ backgroundColor: '#fffffff0', borderRadius: 14, padding: 6, opacity: i === 0 ? 0.3 : 1 }}>
                  <Icon name="back" size={14} color={colors.text} strokeWidth={3} />
                </Pressable>
                <Pressable onPress={() => movePhoto(i, 1)} disabled={i === v.photos.length - 1} hitSlop={14} style={{ backgroundColor: '#fffffff0', borderRadius: 14, padding: 6, opacity: i === v.photos.length - 1 ? 0.3 : 1 }}>
                  <Icon name="next" size={14} color={colors.text} strokeWidth={3} />
                </Pressable>
              </View>
            </View>
          ))}
          {v.photos.length < 4 && (
            <Pressable onPress={addPhoto} style={{ width: 92, height: 122, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={28} color={colors.primary} />
            </Pressable>
          )}
        </Shake>
        {errPhotos && <Text style={{ color: colors.danger, fontSize: 12, marginTop: 6, marginLeft: 4 }}>{t('onboarding.needPhoto')}</Text>}
      </Section>

      <Section title={t('onboarding.aboutTitle')}>
        <Field value={v.bio} onChangeText={(x) => set('bio', x)} multiline maxLength={500} style={{ minHeight: 90, textAlignVertical: 'top' }} />
      </Section>

      <Section title={t('onboarding.questionsTitle')} hint={t('onboarding.questionsHint')}>
        {v.slots.map((s, i) => (
          <Shake key={i} trigger={errSlot(s) ? shake : 0} style={{ marginBottom: 14 }}>
            <View style={{ backgroundColor: errSlot(s) ? '#FFF1F0' : colors.card, borderRadius: radius.card, borderWidth: errSlot(s) ? 2 : 1, borderColor: errSlot(s) ? colors.danger : colors.line, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pressable onPress={() => setPicking(i)} style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 2 }}>{t('onboarding.choosePrompt')}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: s.promptId ? colors.text : colors.primary }}>{promptText(s.promptId) ?? t('onboarding.sheetTitle')}</Text>
                </Pressable>
                <Pressable onPress={() => set('slots', v.slots.filter((_, k) => k !== i))} hitSlop={10}><Icon name="close" size={20} color={colors.muted} /></Pressable>
              </View>
              <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 12 }} />
              <Field value={s.answer} onChangeText={(x) => setSlot(i, { answer: x })} placeholder={t('onboarding.yourAnswer')} maxLength={300} multiline
                style={{ borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0, fontSize: 18, fontWeight: '600', minHeight: 56, textAlignVertical: 'top' }} />
              {errSlot(s) && <Text style={{ color: colors.danger, fontSize: 12 }}>{t('errors.answer')}</Text>}
            </View>
          </Shake>
        ))}
        {v.slots.length < MAX_SLOTS && <Btn kind="soft" icon="plus" label={t('onboarding.addQuestion')} onPress={() => { set('slots', [...v.slots, { promptId: null, answer: '' }]); setPicking(v.slots.length); }} />}
      </Section>

      <Section title={t('profile.matchable')}>
        <Chip label={t('onboarding.matchable')} active={v.matchable} onPress={() => set('matchable', !v.matchable)} />
      </Section>

      {mode === 'create' && <Muted style={{ marginBottom: 16 }}>{t('onboarding.consent')}</Muted>}
      <Btn label={submitLabel} onPress={submit} loading={busy} />

      <Modal transparent animationType="slide" visible={picking !== null} onRequestClose={() => setPicking(null)}>
        <Pressable style={{ flex: 1, backgroundColor: '#0006' }} onPress={() => setPicking(null)} />
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingTop: 18 }}>
          <Text style={{ textAlign: 'center', fontWeight: '800', fontSize: 17, color: colors.text, marginBottom: 8 }}>{t('onboarding.sheetTitle')}</Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 34 }}>
            {choices.map((p) => (
              <Pressable key={p.id} onPress={() => { if (picking !== null) setSlot(picking, { promptId: p.id }); setPicking(null); }}
                style={({ pressed }) => ({ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, opacity: pressed ? 0.5 : 1 })}>
                <Text style={{ fontSize: 17, color: colors.text, fontWeight: '600' }}>{p.text_sv}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
