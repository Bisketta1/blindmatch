import '../src/i18n';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from '../src/lib/session';
import { colors } from '../src/theme';

function Gate() {
  const { session, profile, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const top = segments[0] as string | undefined;
    if (!session) { if (top !== '(auth)') router.replace('/(auth)/sign-in'); return; }
    if (!profile) { if (top !== 'onboarding') router.replace('/onboarding'); return; }
    if (top === '(auth)' || top === 'onboarding' || top === undefined) router.replace('/(tabs)');
  }, [loading, session, profile, segments, router]);

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  return <Slot />;
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Gate />
    </SessionProvider>
  );
}
