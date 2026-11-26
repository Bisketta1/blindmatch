import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Btn, Muted } from '@/shared/ui/ui';
import { Sheet } from '@/shared/ui/Sheet';
import { DateField, toDateString, toTimeString } from '@/shared/ui/DateField';
import { hapticError, hapticSuccess } from '@/shared/lib/haptics';
import { notify } from '@/shared/lib/notify';
import { colors } from '@/shared/theme';
import { RescheduleState, cancelReschedule, getReschedule, proposeReschedule, respondReschedule } from './api';

const fmt = (iso: string) => new Date(iso).toLocaleString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Change-the-time controls for a confirmed date. Either single proposes, the other accepts. All rules are enforced in Postgres. */
export function RescheduleSection({ proposalId, startsAt, onChanged }: { proposalId: string; startsAt: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<RescheduleState | null>(null);
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setState(await getReschedule(proposalId)), [proposalId]);
  useEffect(() => { load(); const i = setInterval(load, 20000); return () => clearInterval(i); }, [load, startsAt]);

  function openSheet() {
    const base = new Date(new Date(startsAt).getTime() + 86400000);
    setDay(toDateString(base)); setTime(toTimeString(new Date(startsAt))); setError(''); setOpen(true);
  }

  async function send() {
    const [y, mo, d] = day.split('-').map(Number); const [h, mi] = time.split(':').map(Number);
    const when = new Date(y, mo - 1, d, h, mi);
    if (Number.isNaN(when.getTime())) { setError(t('reschedule.errSoon')); hapticError(); return; }
    setBusy(true);
    const res = await proposeReschedule(proposalId, when);
    setBusy(false);
    if (res.error) {
      const key = { soon: 'errSoon', far: 'errFar', same: 'errSame', late: 'errLate', limit: 'errLimit', pending: 'errPending', other: 'errSoon' }[res.error];
      setError(t(`reschedule.${key}`)); hapticError(); return;
    }
    hapticSuccess(); setOpen(false); await load(); onChanged();
  }

  async function answer(accept: boolean) {
    if (!state?.pending) return;
    const res = await respondReschedule(state.pending.id, accept);
    if (res === 'accepted') { hapticSuccess(); notify(t('reschedule.done')); }
    else if (res === 'expired') notify(t('reschedule.expired'));
    else if (res === 'declined') notify(t('reschedule.kept'));
    await load(); onChanged();
  }

  if (!state) return null;
  const p = state.pending;

  if (p && !p.mine) {
    return (
      <View style={{ backgroundColor: colors.bg, borderRadius: 18, padding: 14, gap: 10 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t('reschedule.theirs', { name: p.by, time: fmt(p.new_starts_at) })}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn label={t('reschedule.yes')} onPress={() => answer(true)} style={{ flex: 1 }} />
          <Btn kind="soft" label={t('reschedule.no')} onPress={() => answer(false)} style={{ flex: 1 }} />
        </View>
      </View>
    );
  }
  if (p && p.mine) {
    return (
      <View style={{ backgroundColor: colors.bg, borderRadius: 18, padding: 14, gap: 6 }}>
        <Muted>{t('reschedule.mine', { time: fmt(p.new_starts_at) })}</Muted>
        <Btn kind="ghost" label={t('reschedule.undo')} onPress={async () => { await cancelReschedule(p.id); await load(); }} />
      </View>
    );
  }
  if (state.can_propose) {
    return (
      <>
        <Btn kind="soft" icon="clock" label={t('reschedule.button')} onPress={openSheet} />
        <Sheet visible={open} onClose={() => setOpen(false)} title={t('reschedule.title')}>
          <Muted style={{ textAlign: 'center', marginBottom: 16 }}>{t('reschedule.hint')}</Muted>
          <DateField label={t('reschedule.date')} mode="date" value={day} onChange={setDay} minimumDate={new Date()} initial={new Date(day || Date.now())} doneLabel={t('common.done')} error={!!error} />
          <DateField label={t('reschedule.time')} mode="time" value={time} onChange={setTime} doneLabel={t('common.done')} error={!!error} />
          {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
          <Btn label={t('reschedule.send')} onPress={send} loading={busy} />
        </Sheet>
      </>
    );
  }
  if (state.accepted >= 2 || state.total >= 3) return <Muted>{t('reschedule.limit')}</Muted>;
  return null;
}
