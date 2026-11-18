import React, { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/lib/session';
import { Btn, Card, Chip, Field, H1, Muted } from '../../src/components/ui';
import { hapticError, hapticSuccess } from '../../src/lib/haptics';
import { notify } from '../../src/lib/notify';
import { colors } from '../../src/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, refreshProfile, switchTo } = useSession();
  const [demos, setDemos] = useState<{ id: string; first_name: string }[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);
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
      <Card style={profile.premium ? { backgroundColor: colors.primarySoft, borderColor: colors.primary } : undefined}>
        <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 6 }}>{t('premium.title')}</Text>
        {profile.premium ? <Muted>{t('premium.active')}</Muted> : (
          <View>
            <Muted style={{ marginBottom: 12 }}>{t('premium.have')}</Muted>
            <Field value={code} onChangeText={(x) => { setCode(x); setCodeErr(''); }} placeholder={t('premium.placeholder')} autoCapitalize="none" autoCorrect={false}
              error={!!codeErr} errorText={codeErr} shake={codeShake} />
            <Btn kind="soft" label={t('premium.redeem')} onPress={redeem} loading={redeeming} />
          </View>
        )}
      </Card>
      {demos.length > 0 && (
        <Card>
          <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 6 }}>{t('viewAs.title')}</Text>
          <Muted style={{ marginBottom: 12 }}>{t('viewAs.hint')}</Muted>
          <View style={{ gap: 10 }}>
            {demos.map((d) => (
              <Btn key={d.id} kind="soft" icon="person" label={switching === d.id ? t('viewAs.switching') : d.first_name} loading={switching === d.id}
                onPress={async () => {
                  setSwitching(d.id);
                  try { await switchTo(d.id, d.first_name); } catch (e: any) { notify(t('viewAs.failed'), e.message); }
                  setSwitching(null);
                }} />
            ))}
          </View>
        </Card>
      )}
      <Card>
        <Text style={{ fontWeight: '800', color: colors.text }}>{t('profile.stats')}</Text>
        <Muted>{t('profile.matchesMade')}: {stats.matches_made}</Muted>
        <Muted>{t('profile.datesMade')}: {stats.dates_made}</Muted>
      </Card>
      <View style={{ gap: 12, marginTop: 4 }}>
        <Btn label={t('profile.edit')} icon="person" onPress={() => router.push('/edit-profile')} />
        <Btn kind="soft" label={t('profile.privacy')} onPress={() => router.push('/privacy')} />
        <Btn kind="ghost" label={t('profile.signOut')} onPress={() => supabase.auth.signOut()} />
        <Btn kind="ghost" label={t('profile.delete')} onPress={remove} />
      </View>
    </ScrollView>
  );
}
