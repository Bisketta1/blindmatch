import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

export function Btn(props: { label: string; onPress: () => void; kind?: 'primary' | 'soft' | 'danger' | 'ghost'; disabled?: boolean; loading?: boolean; style?: ViewStyle }) {
  const kind = props.kind ?? 'primary';
  const bg = kind === 'primary' ? colors.primary : kind === 'danger' ? colors.danger : kind === 'soft' ? colors.primarySoft : 'transparent';
  const fg = kind === 'primary' || kind === 'danger' ? '#fff' : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      disabled={props.disabled || props.loading}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: props.disabled ? 0.5 : pressed ? 0.85 : 1 }, props.style]}>
      {props.loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{props.label}</Text>}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function Chip(props: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={[styles.chip, props.active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={{ color: props.active ? '#fff' : colors.text, fontWeight: '600' }}>{props.label}</Text>
    </Pressable>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[{ color: colors.muted, fontSize: 14 }, style]}>{children}</Text>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4, marginLeft: 4 },
  input: { backgroundColor: colors.card, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.chip, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, marginRight: 8, marginBottom: 8 },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 12 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
});
