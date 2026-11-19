import React, { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { Btn, Shake } from './ui';
import { Display } from './Display';
import { Wheel } from './Wheel';
import { MONTHS_SV, clampInt, daysInMonth, pickDate } from '../lib/dates';

const MONTHS_FULL = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
import { colors, radius } from '../theme';

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeString = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

type Props = {
  label: string; mode: 'date' | 'time'; value: string; onChange: (v: string) => void;
  placeholder?: string; minimumDate?: Date; maximumDate?: Date; initial?: Date; doneLabel?: string;
  error?: boolean; shake?: number;
};
const MIN_STEP = 5;

function parseDate(v: string, fallback: Date): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d, 12); }
  return fallback;
}

/** Date or time chooser with wheels (all phones) and a native input on web. No free text, so no invalid dates. */
export function DateField({ label, mode, value, onChange, placeholder, minimumDate, maximumDate, initial, doneLabel = 'Klar', error, shake }: Props) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const fallback = initial ?? (mode === 'date' ? new Date(2000, 0, 1, 12) : new Date(2000, 0, 1, 18, 0));
  const startDate = parseDate(value, fallback);
  const [y, setY] = useState(startDate.getFullYear());
  const [m, setM] = useState(startDate.getMonth());
  const [d, setD] = useState(startDate.getDate());
  const initTime = /^\d{2}:\d{2}$/.test(value) ? value : toTimeString(fallback);
  const [hh, setHh] = useState(Number(initTime.slice(0, 2)));
  const [mm, setMm] = useState(Math.round(Number(initTime.slice(3, 5)) / MIN_STEP) * MIN_STEP % 60);

  const minYear = minimumDate?.getFullYear() ?? now.getFullYear() - 100;
  const maxYear = maximumDate?.getFullYear() ?? now.getFullYear() + 3;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i));
  const days = Array.from({ length: daysInMonth(y, m) }, (_, i) => String(i + 1));
  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = Array.from({ length: 60 / MIN_STEP }, (_, i) => pad(i * MIN_STEP));

  const box = {
    backgroundColor: error ? '#FFF1F0' : colors.card, borderRadius: radius.button, borderWidth: error ? 2 : 1,
    borderColor: error ? colors.danger : colors.line, paddingHorizontal: 14, paddingVertical: error ? 11 : 12,
  };
  const labelEl = <Text style={{ color: error ? colors.danger : colors.muted, fontSize: 13, marginBottom: 4, marginLeft: 4 }}>{label}</Text>;

  // Set EXPO_PUBLIC_FORCE_WHEELS=1 to exercise the phone wheels in a browser build.
  if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_FORCE_WHEELS !== '1') {
    return (
      <Shake trigger={shake} style={{ marginBottom: 12 }}>
        {labelEl}
        {React.createElement('input', {
          type: mode, value, min: minimumDate ? toDateString(minimumDate) : undefined, max: maximumDate ? toDateString(maximumDate) : undefined,
          onChange: (e: any) => onChange(e.target.value),
          style: { ...box, fontSize: 16, color: colors.text, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
        })}
      </Shake>
    );
  }

  function openSheet() {
    const sd = parseDate(value, fallback);
    setY(clampInt(sd.getFullYear(), minYear, maxYear)); setM(sd.getMonth()); setD(sd.getDate());
    const t = /^\d{2}:\d{2}$/.test(value) ? value : toTimeString(fallback);
    setHh(Number(t.slice(0, 2))); setMm((Math.round(Number(t.slice(3, 5)) / MIN_STEP) * MIN_STEP) % 60);
    setOpen(true);
  }
  function done() {
    if (mode === 'date') onChange(toDateString(pickDate(y, m, d, minimumDate, maximumDate)));
    else onChange(`${pad(hh)}:${pad(mm)}`);
    setOpen(false);
  }

  return (
    <Shake trigger={shake} style={{ marginBottom: 12 }}>
      {labelEl}
      <Pressable onPress={openSheet} style={box}>
        <Text style={{ fontSize: 16, color: value ? colors.text : colors.muted }}>{value || placeholder || '—'}</Text>
      </Pressable>
      <Modal transparent animationType="slide" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#0006' }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: colors.card, padding: 20, paddingBottom: 36, borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 16 }} />
          <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
          <Display style={{ textAlign: 'center', fontSize: 28, lineHeight: 34, marginTop: 4, marginBottom: 12 }}>
            {mode === 'date' ? `${clampInt(d, 1, daysInMonth(y, m))} ${MONTHS_FULL[m]} ${y}` : `${pad(hh)}:${pad(mm)}`}
          </Display>
          {mode === 'date' ? (
            <View style={{ flexDirection: 'row' }}>
              <Wheel flex={1} items={days} index={clampInt(d - 1, 0, days.length - 1)} onIndex={(i) => setD(i + 1)} />
              <Wheel flex={1.2} items={MONTHS_SV} index={m} onIndex={setM} />
              <Wheel flex={1.4} items={years} index={clampInt(y - minYear, 0, years.length - 1)} onIndex={(i) => setY(minYear + i)} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row' }}>
              <Wheel items={hours} index={hh} onIndex={setHh} />
              <Wheel items={minutes} index={Math.round(mm / MIN_STEP)} onIndex={(i) => setMm(i * MIN_STEP)} />
            </View>
          )}
          <Btn label={doneLabel} onPress={done} style={{ marginTop: 16 }} />
        </View>
      </Modal>
    </Shake>
  );
}
