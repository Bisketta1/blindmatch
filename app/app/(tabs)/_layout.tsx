import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon, IconName } from '@/shared/ui/Icon';
import { useBadges } from '@/features/matches/badges';
import { colors } from '@/shared/theme';

const icon = (name: IconName) => ({ color, focused }: { color: any; focused: boolean }) =>
  <Icon name={name} color={String(color)} size={24} filled={focused && name === 'heart'} strokeWidth={focused ? 2.4 : 2} />;

export default function TabsLayout() {
  const { t } = useTranslation();
  const { badges } = useBadges();
  const b = (n: number) => (n > 0 ? n : undefined);
  const badgeStyle = { backgroundColor: colors.badge, color: '#fff' };
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 }, tabBarStyle: { ...Platform.select({ android: { height: 66, paddingBottom: 8, paddingTop: 6 }, web: { height: 68, paddingBottom: 10, paddingTop: 6 }, default: { paddingTop: 6 } }), backgroundColor: colors.card, borderTopColor: colors.line, borderTopWidth: 1, shadowColor: '#3A2418', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 } }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.swipe'), tabBarIcon: icon('heart') }} />
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats'), tabBarIcon: icon('chat'), tabBarBadge: b(badges.chats), tabBarBadgeStyle: badgeStyle }} />
      <Tabs.Screen name="dates" options={{ title: t('tabs.dates'), tabBarIcon: icon('calendar'), tabBarBadge: b(badges.dates), tabBarBadgeStyle: badgeStyle }} />
      <Tabs.Screen name="friends" options={{ title: t('tabs.friends'), tabBarIcon: icon('people'), tabBarBadge: b(badges.friends), tabBarBadgeStyle: badgeStyle }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
