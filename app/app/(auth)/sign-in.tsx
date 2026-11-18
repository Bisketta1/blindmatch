import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { Btn, Field, H1, Muted } from '../../src/components/ui';
import { colors } from '../../src/theme';

export default function SignIn() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUp, setSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    setBusy(true); setMsg('');
    const creds = { email: email.trim(), password };
    const { data, error } = signUp ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds);
    if (error) setMsg(error.message);
    else if (signUp && !data.session) setMsg(t('auth.checkEmail'));
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 96 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 40, fontWeight: '800', color: colors.primary }}>{t('appName')}</Text>
        <Muted style={{ marginBottom: 32, fontSize: 16 }}>{t('tagline')}</Muted>
        <H1>{t('auth.title')}</H1>
        <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete={signUp ? 'new-password' : 'current-password'} />
        {msg ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{msg}</Text> : null}
        <Btn label={signUp ? t('auth.signUp') : t('auth.signIn')} onPress={submit} loading={busy} disabled={!email || password.length < 8} />
        <Btn kind="ghost" label={signUp ? t('auth.switchToSignIn') : t('auth.switchToSignUp')} onPress={() => setSignUp(!signUp)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
