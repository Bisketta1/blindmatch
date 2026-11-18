import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Display } from '../../src/components/Display';
import { Btn, Field, Muted } from '../../src/components/ui';
import { Logo } from '../../src/components/Icon';
import { hapticError } from '../../src/lib/haptics';
import { colors, shadow } from '../../src/theme';

export default function SignIn() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUp, setSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [shake, setShake] = useState(0);
  const [authFailed, setAuthFailed] = useState(false);
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const pwOk = password.length >= 8;

  async function submit() {
    setSubmitted(true); setAuthFailed(false);
    if (!emailOk || !pwOk) { setShake((n) => n + 1); hapticError(); return; }
    setBusy(true); setMsg('');
    const creds = { email: email.trim(), password };
    const { data, error } = signUp ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds);
    if (error) { setMsg(signUp ? error.message : t('errors.wrongLogin')); setAuthFailed(true); setShake((n) => n + 1); hapticError(); }
    else if (signUp && !data.session) setMsg(t('auth.checkEmail'));
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#F1DCCB', colors.bg]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 48, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Logo size={88} />
          <Display style={{ fontSize: 44, lineHeight: 52, marginTop: 12 }}>{t('appName')}</Display>
          <Muted style={{ fontSize: 17, marginTop: 4, textAlign: 'center' }}>{t('tagline')}</Muted>
        </View>
        <View style={{ backgroundColor: colors.card, borderRadius: 28, padding: 22, borderWidth: 1, borderColor: colors.line, ...shadow.lift }}>
          <Display style={{ fontSize: 24, lineHeight: 30, marginBottom: 18 }}>{signUp ? t('auth.signUp') : t('auth.title')}</Display>
          <Field label={t('auth.email')} value={email} onChangeText={setEmail} error={(submitted && !emailOk) || authFailed} errorText={t('errors.email')} shake={shake} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label={t('auth.password')} value={password} onChangeText={setPassword} error={(submitted && !pwOk) || authFailed} errorText={t('errors.password')} shake={shake} secureTextEntry autoComplete={signUp ? 'new-password' : 'current-password'} />
          {msg ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{msg}</Text> : null}
          <Btn label={signUp ? t('auth.signUp') : t('auth.signIn')} onPress={submit} loading={busy} />
          <Btn kind="ghost" label={signUp ? t('auth.switchToSignIn') : t('auth.switchToSignUp')} onPress={() => setSignUp(!signUp)} style={{ marginTop: 4 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
