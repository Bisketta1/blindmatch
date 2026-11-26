import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/api/supabase';
import { useSession } from '@/lib/session';
import { notify } from '@/shared/lib/notify';
import { hapticLight } from '@/shared/lib/haptics';
import { Btn, Muted } from '@/components/ui';
import { colors } from '@/shared/theme';

/** "Byt profil": pick one of the demo accounts (premium owners only). */
export function SwitchProfileSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { switchTo, viewAs } = useSession();
  const [demos, setDemos] = useState<{ id: string; first_name: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (visible) supabase.rpc('get_demo_accounts').then(({ data }) => setDemos((data as any[]) ?? []));
  }, [visible]);

  async function go(d: { id: string; first_name: string }) {
    setBusy(d.id); hapticLight();
    try { await switchTo(d.id, d.first_name); onClose(); }
    catch (e: any) { notify(t('viewAs.failed'), e.message); }
    setBusy(null);
  }

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#0006' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.card, padding: 20, paddingBottom: 36, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{t('viewAs.switchTitle')}</Text>
        <Muted style={{ textAlign: 'center', marginTop: 6, marginBottom: 18 }}>{t('viewAs.hint')}</Muted>
        <View style={{ gap: 10 }}>
          {demos.length === 0 && <Muted style={{ textAlign: 'center' }}>{t('viewAs.empty')}</Muted>}
          {demos.map((d) => (
            <Btn key={d.id} kind={viewAs === d.first_name ? 'primary' : 'soft'} icon="person" label={d.first_name}
              loading={busy === d.id} disabled={!!busy} onPress={() => go(d)} />
          ))}
          <Btn kind="ghost" label={t('common.cancel')} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
