import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Btn, H1, Muted } from '../src/components/ui';
import { colors } from '../src/theme';

export default function Privacy() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <Btn kind="ghost" icon="back" label={t('common.back')} onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <H1>{t('privacy.title')}</H1>
      <Muted style={{ fontSize: 16, lineHeight: 24 }}>{t('privacy.body')}</Muted>
    </ScrollView>
  );
}
