import React, { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/lib/session';
import { Btn, Card, Chip, Field, H1, Muted } from '../../src/components/ui';
import { hapticError, hapticSuccess } from '../../src/lib/haptics';
import { notify } from '../../src/lib/notify';
import { SwitchProfileSheet } from '../../src/components/SwitchProfileSheet';
import { BUILD } from '../../src/config';
import { colors } from '../../src/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, refreshProfile } = useSession();
  const [demos, setDemos] = useState<{ id: string; first_name: string }[]>([]);
  const [sheet, setSheet] = useState(false);
  const [stats, setStats] = useState({ matches_made: 0, dates_made: 0 });
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [codeShake, setCodeShake] = useState(0);
  const [redeeming, setRedeeming] = useState(false);
  useFocusEffect(useCallback(() => {
    supabase.rpc('get_my_stats').then(({ data }) => data && setStats(data));
    supabase.rpc('get_demo_accounts').then(({ data }) => setDemos((data as any[]) ?? []));
  }, []));

  async function toggle(field: 'matchable' | 'open_to_double') {
    await supabase.from('profiles').update({ [field]: !profile![field] }).eq('id', profile!.id);
    refreshProfile();
  }
  async function redeem() {
    const fail = (msg: string) => { setCodeErr(msg); setCodeShake((n) => n + 1); hapticError(); };
    if (!code.trim()) return fail(t('premium.empty'));
    setRedeeming(true);
    const { data, error } = await supabase.rpc('redeem_code', { p_code: code });
    setRedeeming(false);
    if (error) return fail(error.message.includes('too many') ? t('premium.tooMany') : t('common.error'));
    if (!data) return fail(t('premium.bad'));
    setCode(''); setCodeErr(''); hapticSuccess();
    await refreshProfile();
    notify(t('premium.welcomeTitle'), t('premium.welcome'));
  }
  function remove() {
    Alert.alert(t('profile.delete'), t('profile.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.delete'), style: 'destructive', onPress: async () => { await supabase.rpc('delete_account'); await supabase.auth.signOut(); } },
    ]);
  }
  if (!profile) return null;
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 16 }}>
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
      <Card style={profile.premium ? { backgroundColor: colors.primarySoft, borderColor: colors.primary } : undefined}>
        <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 6 }}>{t('premium.title')}</Text>
        {profile.premium ? (
          <View>
            <Muted style={{ marginBottom: 12 }}>{t('premium.active')}</Muted>
            <Btn kind="soft" label={t('premium.remove')} onPress={async () => { await supabase.rpc('revoke_premium'); await refreshProfile(); setDemos([]); notify(t('premium.title'), t('premium.removed')); }} />
          </View>
        ) : (
          <View>
            <Muted style={{ marginBottom: 12 }}>{t('premium.have')}</Muted>
            <Field value={code} onChangeText={(x) => { setCode(x); setCodeErr(''); }} placeholder={t('premium.placeholder')} autoCapitalize="none" autoCorrect={false}
              error={!!codeErr} errorText={codeErr} shake={codeShake} />
            <Btn kind="soft" label={t('premium.redeem')} onPress={redeem} loading={redeeming} />
          </View>
        )}
      </Card>
      <Card>
        <Text style={{ fontWeight: '800', color: colors.text }}>{t('profile.stats')}</Text>
        <Muted>{t('profile.matchesMade')}: {stats.matches_made}</Muted>
        <Muted>{t('profile.datesMade')}: {stats.dates_made}</Muted>
      </Card>
      <View style={{ gap: 12, marginTop: 4 }}>
        {(demos.length > 0 || profile.premium) && <Btn label={t('viewAs.button')} icon="people" onPress={() => setSheet(true)} />}
        <Btn kind={demos.length > 0 || profile.premium ? 'soft' : 'primary'} label={t('profile.edit')} icon="person" onPress={() => router.push('/edit-profile')} />
        <Btn kind="soft" label={t('profile.privacy')} onPress={() => router.push('/privacy')} />
        <Btn kind="ghost" label={t('profile.signOut')} onPress={() => supabase.auth.signOut()} />
        <Btn kind="ghost" label={t('profile.delete')} onPress={remove} />
      </View>
      <Muted style={{ textAlign: 'center', marginTop: 20, fontSize: 12 }}>blindmatch · version {BUILD}</Muted>
      <SwitchProfileSheet visible={sheet} onClose={() => setSheet(false)} />
    </ScrollView>
  );
}
