import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon, IconName } from '../../src/components/Icon';
import { colors } from '../../src/theme';

const icon = (name: IconName) => ({ color, focused }: { color: any; focused: boolean }) =>
  <Icon name={name} color={String(color)} size={24} filled={focused && name === 'heart'} strokeWidth={focused ? 2.4 : 2} />;

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line } }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.swipe'), tabBarIcon: icon('heart') }} />
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats'), tabBarIcon: icon('chat') }} />
      <Tabs.Screen name="dates" options={{ title: t('tabs.dates'), tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="friends" options={{ title: t('tabs.friends'), tabBarIcon: icon('people') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
