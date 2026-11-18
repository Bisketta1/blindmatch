import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/lib/session';
import { isAdult } from '../src/lib/age';
import { pickAndUploadPhoto } from '../src/lib/photos';
import { Btn, Chip, Field, H1, Muted } from '../src/components/ui';
import { colors } from '../src/theme';

type Prompt = { id: number; text_sv: string };
const GENDERS = ['man', 'kvinna', 'icke-binar'];

export default function Onboarding() {
  const { t } = useTranslation();
  const { session, refreshProfile } = useSession();
  const [firstName, setFirstName] = useState('');
  const [birth, setBirth] = useState('');
  const [city, setCity] = useState('Stockholm');
  const [gender, setGender] = useState('');
  const [looking, setLooking] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [matchable, setMatchable] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { supabase.from('prompts').select('id,text_sv').order('id').then(({ data }) => setPrompts((data as Prompt[]) ?? [])); }, []);

  const toggleLooking = (g: string) => setLooking((l) => (l.includes(g) ? l.filter((x) => x !== g) : [...l, g]));

  async function addPhoto() {
    try {
      const url = await pickAndUploadPhoto(session!.user.id);
      if (url) setPhotos((p) => [...p, url].slice(0, 4));
    } catch (e: any) { Alert.alert(t('common.error'), e.message); }
  }

  async function finish() {
    if (!isAdult(birth)) return Alert.alert(t('onboarding.tooYoung'));
    if (photos.length === 0) return Alert.alert(t('onboarding.needPhoto'));
    setBusy(true);
    const uid = session!.user.id;
    const { error } = await supabase.from('profiles').insert({
      id: uid, first_name: firstName.trim(), birth_date: birth, city: city.trim() || null, gender: gender || null,
      looking_for: looking, bio: bio.trim() || null, photos, matchable,
    });
    if (error) { setBusy(false); return Alert.alert(t('common.error'), error.message); }
    const rows = Object.entries(answers).filter(([, a]) => a.trim()).slice(0, 3)
      .map(([pid, answer], i) => ({ profile_id: uid, prompt_id: Number(pid), answer: answer.trim(), position: i }));
    if (rows.length) await supabase.from('profile_answers').insert(rows);
    await refreshProfile();
    setBusy(false);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: 64 }} keyboardShouldPersistTaps="handled">
      <H1>{t('onboarding.title')}</H1>
      <Field label={t('onboarding.firstName')} value={firstName} onChangeText={setFirstName} />
      <Field label={t('onboarding.birthDate')} value={birth} onChangeText={setBirth} placeholder="2000-05-17" />
      <Field label={t('onboarding.city')} value={city} onChangeText={setCity} />
      <Muted style={{ marginBottom: 6 }}>{t('onboarding.gender')}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {GENDERS.map((g) => <Chip key={g} label={t(`gender.${g}`)} active={gender === g} onPress={() => setGender(g)} />)}
      </View>
      <Muted style={{ marginBottom: 6 }}>{t('onboarding.lookingFor')}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {GENDERS.map((g) => <Chip key={g} label={t(`gender.${g}`)} active={looking.includes(g)} onPress={() => toggleLooking(g)} />)}
      </View>
      <Muted style={{ marginVertical: 6 }}>{t('onboarding.photos')}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        {photos.map((u) => <Image key={u} source={{ uri: u }} style={{ width: 80, height: 106, borderRadius: 14, marginRight: 8, marginBottom: 8 }} />)}
        {photos.length < 4 && (
          <Pressable onPress={addPhoto} style={{ width: 80, height: 106, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: 28 }}>＋</Text>
          </Pressable>
        )}
      </View>
      <Field label={t('onboarding.bio')} value={bio} onChangeText={setBio} multiline maxLength={500} style={{ minHeight: 80 }} />
      <Muted style={{ marginBottom: 6 }}>{t('onboarding.answers')}</Muted>
      {prompts.slice(0, 5).map((p) => (
        <Field key={p.id} label={p.text_sv} value={answers[p.id] ?? ''} onChangeText={(v) => setAnswers((a) => ({ ...a, [p.id]: v }))} maxLength={300} />
      ))}
      <Chip label={t('onboarding.matchable')} active={matchable} onPress={() => setMatchable(!matchable)} />
      <Muted style={{ marginVertical: 12 }}>{t('onboarding.consent')}</Muted>
      <Btn label={t('onboarding.finish')} onPress={finish} loading={busy} disabled={!firstName.trim() || !birth} />
    </ScrollView>
  );
}
