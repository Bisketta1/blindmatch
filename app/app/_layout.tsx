import '@/i18n';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fraunces_600SemiBold, useFonts } from '@expo-google-fonts/fraunces';
import { SessionProvider, useSession } from '../src/lib/session';
import { BadgeProvider } from '../src/lib/badges';
import { MatchOverlay } from '../src/components/MatchOverlay';
import { ViewAsBanner } from '../src/components/ViewAsBanner';
import { colors } from '../src/theme';

function Gate() {
  const { session, profile, loading, viewAs } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (loading) return;
    const top = segments[0] as string | undefined;
    if (!session) { if (top !== '(auth)') router.replace('/(auth)/sign-in'); return; }
    if (!profile) { if (top !== 'onboarding') router.replace('/onboarding'); return; }
    if (top === '(auth)' || top === 'onboarding' || top === undefined) router.replace('/(tabs)');
  }, [loading, session, profile, segments, router]);

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ViewAsBanner />
      <View key={session?.user.id ?? 'anon'} style={{ flex: 1, paddingTop: viewAs ? 0 : insets.top }}><Slot /></View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fraunces_600SemiBold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <SessionProvider>
      <BadgeProvider>
        <StatusBar style="dark" />
        <Gate />
        <MatchOverlay />
      </BadgeProvider>
    </SessionProvider>
  );
}
