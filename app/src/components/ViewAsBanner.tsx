import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/lib/session';
import { Btn } from '@/components/ui';
import { colors } from '@/shared/theme';

export function ViewAsBanner() {
  const { t } = useTranslation();
  const { viewAs, exitViewAs } = useSession();
  const insets = useSafeAreaInsets();
  if (!viewAs) return null;
  return (
    <View style={{ backgroundColor: colors.ink, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: '#fff', fontWeight: '700', flex: 1 }}>{t('viewAs.banner', { name: viewAs })}</Text>
      <Btn kind="soft" label={t('viewAs.back')} onPress={exitViewAs} style={{ minHeight: 44, paddingVertical: 8, paddingHorizontal: 16 }} />
    </View>
  );
}
