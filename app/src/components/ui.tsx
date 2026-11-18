import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, radius, shadow } from '../theme';
import { Display } from './Display';
import { Icon, IconName } from './Icon';

export function Btn(props: { label: string; icon?: IconName; onPress: () => void; kind?: 'primary' | 'soft' | 'danger' | 'ghost'; disabled?: boolean; loading?: boolean; style?: ViewStyle }) {
  const kind = props.kind ?? 'primary';
  const bg = kind === 'primary' ? colors.primary : kind === 'danger' ? colors.danger : kind === 'soft' ? colors.primarySoft : 'transparent';
  const fg = kind === 'primary' || kind === 'danger' ? '#fff' : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      disabled={props.disabled || props.loading}
      style={({ pressed }) => [styles.btn, kind === 'primary' && !props.disabled && shadow.button, { backgroundColor: bg, opacity: props.disabled ? 0.45 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }, props.style]}>
      {props.loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {props.icon ? <Icon name={props.icon} size={18} color={fg} strokeWidth={2.4} /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{props.label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Wiggles sideways each time `trigger` changes (not on first render). */
export function Shake({ trigger, children, style }: { trigger?: number; children: React.ReactNode; style?: ViewStyle }) {
  const x = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!trigger) return;
    Animated.sequence([-10, 10, -8, 8, -4, 4, 0].map((v) => Animated.timing(x, { toValue: v, duration: 45, useNativeDriver: true }))).start();
  }, [trigger, x]);
  return <Animated.View style={[style, { transform: [{ translateX: x }] }]}>{children}</Animated.View>;
}

export function Field(props: TextInputProps & { label?: string; error?: boolean; errorText?: string; shake?: number }) {
  const { label, style, error, errorText, shake, ...rest } = props;
  return (
    <Shake trigger={shake} style={{ marginBottom: 16 }}>
      {label ? <Text style={[styles.label, error && { color: colors.danger }]}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted}
        style={[styles.input, error && { borderColor: colors.danger, borderWidth: 2, backgroundColor: '#FFF1F0', paddingVertical: 11, paddingHorizontal: 13 }, style]} {...rest} />
      {error && errorText ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errorText}</Text> : null}
    </Shake>
  );
}

export function Chip(props: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={[styles.chip, props.active && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
      <Text style={{ color: props.active ? '#fff' : colors.text, fontWeight: '600' }}>{props.label}</Text>
    </Pressable>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Display style={styles.h1}>{children}</Display>;
}
export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[{ color: colors.muted, fontSize: 14, lineHeight: 20 }, style]}>{children}</Text>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  btnText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4, letterSpacing: 0.2 },
  input: { backgroundColor: colors.card, borderRadius: radius.field, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, color: colors.text, minHeight: 52 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', borderRadius: radius.chip, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, marginRight: 8, marginBottom: 8 },
  h1: { fontSize: 32, lineHeight: 38, color: colors.text, marginBottom: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.line, ...shadow.card },
});

/** Titled block with consistent spacing, used to group form fields. */
export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Display style={{ fontSize: 21, lineHeight: 28, marginBottom: hint ? 4 : 12 }}>{title}</Display>
      {hint ? <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 }}>{hint}</Text> : null}
      {children}
    </View>
  );
}
