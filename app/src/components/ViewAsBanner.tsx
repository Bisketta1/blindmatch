import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSession } from '../lib/session';
import { Btn } from './ui';
import { colors } from '../theme';

export function ViewAsBanner() {
  const { t } = useTranslation();
  const { viewAs, exitViewAs } = useSession();
  if (!viewAs) return null;
  return (
    <View style={{ backgroundColor: colors.text, paddingTop: 44, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: '#fff', fontWeight: '700', flex: 1 }}>{t('viewAs.banner', { name: viewAs })}</Text>
      <Btn kind="soft" label={t('viewAs.back')} onPress={exitViewAs} style={{ minHeight: 36, paddingVertical: 8, paddingHorizontal: 14 }} />
    </View>
  );
}
