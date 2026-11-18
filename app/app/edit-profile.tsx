import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { notify } from '../src/lib/notify';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/lib/session';
import { ProfileForm, ProfileValues } from '../src/components/ProfileForm';
import { Btn, H1 } from '../src/components/ui';
import { colors } from '../src/theme';

export default function EditProfile() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, refreshProfile } = useSession();
  const [initial, setInitial] = useState<ProfileValues | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase.from('profile_answers').select('prompt_id,answer').eq('profile_id', profile.id).then(({ data }) => {
      const answers: Record<number, string> = {};
      (data ?? []).forEach((a: any) => { answers[a.prompt_id] = a.answer; });
      setInitial({
        firstName: profile.first_name, birth: profile.birth_date, city: profile.city ?? '', gender: profile.gender ?? '',
        looking: profile.looking_for ?? [], photos: profile.photos ?? [], bio: profile.bio ?? '', answers, matchable: profile.matchable,
      });
    });
  }, [profile]);

  async function save(v: ProfileValues) {
    setBusy(true);
    const uid = profile!.id;
    const { error } = await supabase.from('profiles').update({
      first_name: v.firstName.trim(), city: v.city.trim() || null, gender: v.gender || null, looking_for: v.looking,
      bio: v.bio.trim() || null, photos: v.photos, matchable: v.matchable,
    }).eq('id', uid);
    if (error) { setBusy(false); return notify(t('common.error'), error.message); }
    await supabase.from('profile_answers').delete().eq('profile_id', uid);
    const rows = Object.entries(v.answers).filter(([, a]) => a.trim()).slice(0, 3)
      .map(([pid, answer], i) => ({ profile_id: uid, prompt_id: Number(pid), answer: answer.trim(), position: i }));
    if (rows.length) await supabase.from('profile_answers').insert(rows);
    await refreshProfile();
    setBusy(false);
    router.back();
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: 56 }} keyboardShouldPersistTaps="handled">
      <Btn kind="ghost" icon="back" label={t('common.back')} onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <H1>{t('profile.editTitle')}</H1>
      {initial ? <ProfileForm initial={initial} mode="edit" submitLabel={t('common.save')} busy={busy} onSubmit={save} /> : <View><ActivityIndicator color={colors.primary} /></View>}
    </ScrollView>
  );
}
