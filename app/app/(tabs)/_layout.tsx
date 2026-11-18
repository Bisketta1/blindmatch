import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon, IconName } from '../../src/components/Icon';
import { useBadges } from '../../src/lib/badges';
import { colors } from '../../src/theme';

const icon = (name: IconName) => ({ color, focused }: { color: any; focused: boolean }) =>
  <Icon name={name} color={String(color)} size={24} filled={focused && name === 'heart'} strokeWidth={focused ? 2.4 : 2} />;

export default function TabsLayout() {
  const { t } = useTranslation();
  const { badges } = useBadges();
  const b = (n: number) => (n > 0 ? n : undefined);
  const badgeStyle = { backgroundColor: colors.badge, color: '#fff' };
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line } }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.swipe'), tabBarIcon: icon('heart') }} />
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats'), tabBarIcon: icon('chat'), tabBarBadge: b(badges.chats), tabBarBadgeStyle: badgeStyle }} />
      <Tabs.Screen name="dates" options={{ title: t('tabs.dates'), tabBarIcon: icon('calendar'), tabBarBadge: b(badges.dates), tabBarBadgeStyle: badgeStyle }} />
      <Tabs.Screen name="friends" options={{ title: t('tabs.friends'), tabBarIcon: icon('people'), tabBarBadge: b(badges.friends), tabBarBadgeStyle: badgeStyle }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
