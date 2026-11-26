import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Btn, Chip, Muted } from '@/shared/ui/ui';
import { Sheet } from '@/shared/ui/Sheet';
import { hapticSuccess } from '@/shared/lib/haptics';
import { notify } from '@/shared/lib/notify';
import { useSession } from '@/features/auth/session';
import { colors } from '@/shared/theme';
import { FriendLite, MyShare, checkin, getFriendsLite, getMyShare, revokeShare, shareDate } from './api';

/** A single shares one confirmed date with one friend, and can check in. All rules live in Postgres. */
export function SafetySection({ proposalId }: { proposalId: string }) {
  const { t } = useTranslation();
  const { session } = useSession();
  const [state, setState] = useState<MyShare | null>(null);
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<FriendLite[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => setState(await getMyShare(proposalId)), [proposalId]);
  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  async function openSheet() {
    setFailed(false); setPick(null); setOpen(true);
    setFriends(await getFriendsLite(session!.user.id));
  }
  async function send() {
    if (!pick) return;
    if (await shareDate(proposalId, pick)) { hapticSuccess(); setOpen(false); load(); } else setFailed(true);
  }
  async function mark(s: 'arrived' | 'ok' | 'home' | 'left') {
    if (await checkin(proposalId, s)) { hapticSuccess(); notify(t('safety.sent')); load(); } else notify(t('safety.checkinFail'));
  }

  if (!state) return null;
  const s = state.share;

  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 18, padding: 14, gap: 10 }}>
      {!s ? (
        <>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t('safety.title')}</Text>
          <Muted>{t('safety.hint')}</Muted>
          <Btn kind="soft" icon="people" label={t('safety.share')} onPress={openSheet} />
        </>
      ) : (
        <>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t('safety.sharedWith', { name: s.trusted_name })}</Text>
          <Muted>{s.checkin === 'none' ? t('safety.noCheckin') : t(`safety.status.${s.checkin}`)}</Muted>
          {state.window_open ? (
            <View style={{ gap: 8 }}>
              <Btn icon="pin" label={t('safety.arrived')} kind="soft" onPress={() => mark('arrived')} />
              <Btn icon="check" label={t('safety.ok')} kind="soft" onPress={() => mark('ok')} />
              <Btn icon="exit" label={t('safety.home')} kind="soft" onPress={() => mark('home')} />
              <Btn kind="ghost" label={t('safety.left')} onPress={() => mark('left')} />
            </View>
          ) : <Muted>{t('safety.windowLater')}</Muted>}
          <Btn kind="ghost" label={t('safety.stop')} onPress={async () => { await revokeShare(proposalId); load(); }} />
        </>
      )}
      <Muted>{t('safety.notEmergency')}</Muted>
      <Btn kind="ghost" label={t('safety.call112')} onPress={() => Linking.openURL('tel:112')} />

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('safety.sheetTitle')}>
        <Muted>{t('safety.sheetHint')}</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 14 }}>
          {friends.length === 0 && <Muted>{t('safety.noFriends')}</Muted>}
          {friends.map((f) => <Chip key={f.id} label={f.first_name} active={pick === f.id} onPress={() => setPick(f.id)} />)}
        </View>
        {failed && <Text style={{ color: colors.danger, marginBottom: 8 }}>{t('safety.failed')}</Text>}
        <Btn label={t('safety.confirm')} disabled={!pick} onPress={send} />
      </Sheet>
    </View>
  );
}
