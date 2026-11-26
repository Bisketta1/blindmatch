import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/api/supabase';
import { hapticError, hapticSuccess } from '@/shared/lib/haptics';
import { Display } from '@/shared/ui/Display';
import { Btn, Field, Muted } from '@/shared/ui/ui';
import { colors, shadow } from '@/shared/theme';

type State = { mine: 'again' | 'not_for_me' | null; mutual: boolean };

/** Private feedback after the date, with an optional thank-you to the matchmakers. */
export function FeedbackCard({ proposalId, otherName, matchmakers }: { proposalId: string; otherName: string; matchmakers: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState<State | null>(null);
  const [verdict, setVerdict] = useState<'again' | 'not_for_me' | null>(null);
  const [note, setNote] = useState('');
  const [thanks, setThanks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);

  const load = async () => { const { data } = await supabase.rpc('get_date_feedback', { p_proposal: proposalId }); if (data) setState(data as State); };
  useEffect(() => { load(); }, [proposalId]);

  async function send() {
    if (!verdict) { setError(t('errors.required')); setShake((n) => n + 1); hapticError(); return; }
    setBusy(true); setError('');
    const { error: e } = await supabase.rpc('submit_date_feedback', { p_proposal: proposalId, p_verdict: verdict, p_note: note.trim() || null, p_thanks: thanks.trim() || null });
    setBusy(false);
    if (e) { setError(t('common.error')); hapticError(); return; }
    hapticSuccess(); load();
  }

  if (!state) return null;
  const box = { backgroundColor: colors.card, borderRadius: 26, borderWidth: 1, borderColor: colors.line, padding: 20, marginBottom: 16, ...shadow.card };

  if (state.mine) {
    return (
      <View style={box}>
        <Display style={{ fontSize: 22, lineHeight: 28, marginBottom: 6 }}>{t('feedback.done')}</Display>
        <Muted>{state.mutual ? t('feedback.mutual') : state.mine === 'again' ? t('feedback.doneAgain', { name: otherName }) : t('feedback.doneNo')}</Muted>
      </View>
    );
  }
  const opt = (k: 'again' | 'not_for_me', label: string) => (
    <Btn kind={verdict === k ? 'primary' : 'soft'} label={label} onPress={() => { setVerdict(k); setError(''); }} style={{ flex: 1, paddingHorizontal: 12 }} />
  );
  return (
    <View style={box}>
      <Display style={{ fontSize: 24, lineHeight: 30, marginBottom: 4 }}>{t('feedback.title')}</Display>
      <Muted style={{ marginBottom: 14 }}>{t('feedback.private', { name: otherName })}</Muted>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>{opt('again', t('feedback.again'))}{opt('not_for_me', t('feedback.notForMe'))}</View>
      <Field label={t('feedback.note')} value={note} onChangeText={setNote} multiline maxLength={500} style={{ minHeight: 72, textAlignVertical: 'top' }} />
      <Field label={t('feedback.thanksLabel', { name: matchmakers })} value={thanks} onChangeText={setThanks} placeholder={t('feedback.thanksHint')} multiline maxLength={500} shake={shake} style={{ minHeight: 72, textAlignVertical: 'top' }} />
      {error ? <Text style={{ color: colors.danger, marginBottom: 10 }}>{error}</Text> : null}
      <Btn label={t('feedback.send')} onPress={send} loading={busy} />
    </View>
  );
}
