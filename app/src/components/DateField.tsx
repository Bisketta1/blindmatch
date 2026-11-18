import React, { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Btn } from './ui';
import { colors, radius } from '../theme';

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeString = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function parse(mode: 'date' | 'time', v: string, fallback: Date): Date {
  if (mode === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d, 12, 0); }
  if (mode === 'time' && /^\d{2}:\d{2}$/.test(v)) { const [h, m] = v.split(':').map(Number); return new Date(2000, 0, 1, h, m); }
  return fallback;
}

type Props = {
  label: string; mode: 'date' | 'time'; value: string; onChange: (v: string) => void;
  placeholder?: string; minimumDate?: Date; maximumDate?: Date; initial?: Date; doneLabel?: string;
};

/** Date or time chooser: wheel/spinner on phones, native input on web. Never free text, so no invalid dates. */
export function DateField({ label, mode, value, onChange, placeholder, minimumDate, maximumDate, initial, doneLabel = 'Klar' }: Props) {
  const [open, setOpen] = useState(false);
  const fallback = initial ?? (mode === 'date' ? new Date(2000, 0, 1, 12) : new Date(2000, 0, 1, 18, 0));
  const current = parse(mode, value, fallback);
  const fmt = (d: Date) => (mode === 'date' ? toDateString(d) : toTimeString(d));

  const box = { backgroundColor: colors.card, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 12 };
  const labelEl = <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 4, marginLeft: 4 }}>{label}</Text>;

  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: 12 }}>
        {labelEl}
        {React.createElement('input', {
          type: mode, value, min: minimumDate ? toDateString(minimumDate) : undefined, max: maximumDate ? toDateString(maximumDate) : undefined,
          onChange: (e: any) => onChange(e.target.value),
          style: { ...box, fontSize: 16, color: colors.text, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
        })}
      </View>
    );
  }

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current, mode, display: 'spinner', is24Hour: true, minimumDate, maximumDate,
        onChange: (e, d) => { if (e.type === 'set' && d) onChange(fmt(d)); },
      });
    } else setOpen(true);
  }

  return (
    <View style={{ marginBottom: 12 }}>
      {labelEl}
      <Pressable onPress={openPicker} style={box}>
        <Text style={{ fontSize: 16, color: value ? colors.text : colors.muted }}>{value || placeholder || '—'}</Text>
      </Pressable>
      {Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={open} onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: '#0006' }} onPress={() => setOpen(false)} />
          <View style={{ backgroundColor: colors.card, padding: 16, paddingBottom: 32 }}>
            <DateTimePicker value={current} mode={mode} display="spinner" is24Hour minimumDate={minimumDate} maximumDate={maximumDate}
              onChange={(_, d) => { if (d) onChange(fmt(d)); }} locale="sv-SE" />
            <Btn label={doneLabel} onPress={() => setOpen(false)} />
          </View>
        </Modal>
      )}
    </View>
  );
}
