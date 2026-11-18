import React, { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/lib/session';
import { Btn, Card, Chip, H1, Muted } from '../../src/components/ui';
import { colors } from '../../src/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, refreshProfile } = useSession();
  const [stats, setStats] = useState({ matches_made: 0, dates_made: 0 });
  useFocusEffect(useCallback(() => { supabase.rpc('get_my_stats').then(({ data }) => data && setStats(data)); }, []));

  async function toggle(field: 'matchable' | 'open_to_double') {
    await supabase.from('profiles').update({ [field]: !profile![field] }).eq('id', profile!.id);
    refreshProfile();
  }
  function remove() {
    Alert.alert(t('profile.delete'), t('profile.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.delete'), style: 'destructive', onPress: async () => { await supabase.rpc('delete_account'); await supabase.auth.signOut(); } },
    ]);
  }
  if (!profile) return null;
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 64 }}>
      <H1>{t('profile.title')}</H1>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {profile.photos.map((u) => <Image key={u} source={{ uri: u }} style={{ width: 70, height: 93, borderRadius: 12, marginRight: 8, marginBottom: 8 }} />)}
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{profile.first_name}</Text>
        {profile.bio ? <Muted>{profile.bio}</Muted> : null}
      </Card>
      <Card>
        <Chip label={t('profile.matchable')} active={profile.matchable} onPress={() => toggle('matchable')} />
        <Chip label={t('profile.double')} active={profile.open_to_double} onPress={() => toggle('open_to_double')} />
        <Muted>{t('profile.doubleHint')}</Muted>
      </Card>
      <Card>
        <Text style={{ fontWeight: '800', color: colors.text }}>{t('profile.stats')}</Text>
        <Muted>{t('profile.matchesMade')}: {stats.matches_made}</Muted>
        <Muted>{t('profile.datesMade')}: {stats.dates_made}</Muted>
      </Card>
      <Btn kind="soft" label={t('profile.privacy')} onPress={() => router.push('/privacy')} />
      <Btn kind="ghost" label={t('profile.signOut')} onPress={() => supabase.auth.signOut()} />
      <Btn kind="ghost" label={t('profile.delete')} onPress={remove} />
    </ScrollView>
  );
}
