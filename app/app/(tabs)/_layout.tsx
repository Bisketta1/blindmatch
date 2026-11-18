import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { colors } from '../../src/theme';

const icon = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line } }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.swipe'), tabBarIcon: icon('💞') }} />
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats'), tabBarIcon: icon('💬') }} />
      <Tabs.Screen name="dates" options={{ title: t('tabs.dates'), tabBarIcon: icon('🍽️') }} />
      <Tabs.Screen name="friends" options={{ title: t('tabs.friends'), tabBarIcon: icon('👯') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('🙂') }} />
    </Tabs>
  );
}
