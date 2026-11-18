import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/lib/session';
import { EMPTY_PROFILE, ProfileForm, ProfileValues } from '../src/components/ProfileForm';
import { H1 } from '../src/components/ui';
import { colors } from '../src/theme';

export default function Onboarding() {
  const { t } = useTranslation();
  const { session, refreshProfile } = useSession();
  const [busy, setBusy] = useState(false);

  async function create(v: ProfileValues) {
    setBusy(true);
    const uid = session!.user.id;
    const { error } = await supabase.from('profiles').insert({
      id: uid, first_name: v.firstName.trim(), birth_date: v.birth, city: v.city.trim() || null, gender: v.gender || null,
      looking_for: v.looking, bio: v.bio.trim() || null, photos: v.photos, matchable: v.matchable,
    });
    if (error) { setBusy(false); return Alert.alert(t('common.error'), error.message); }
    const rows = Object.entries(v.answers).filter(([, a]) => a.trim()).slice(0, 3)
      .map(([pid, answer], i) => ({ profile_id: uid, prompt_id: Number(pid), answer: answer.trim(), position: i }));
    if (rows.length) await supabase.from('profile_answers').insert(rows);
    await refreshProfile();
    setBusy(false);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: 64 }} keyboardShouldPersistTaps="handled">
      <H1>{t('onboarding.title')}</H1>
      <ProfileForm initial={EMPTY_PROFILE} mode="create" submitLabel={t('onboarding.finish')} busy={busy} onSubmit={create} />
    </ScrollView>
  );
}
