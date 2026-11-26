import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/shared/ui/Icon';
import { colors, shadow } from '@/shared/theme';

/** Floating message bar with a round send button. */
export function ChatInput({ value, onChange, onSend, placeholder, editable = true, bottomInset = 0 }:
  { value: string; onChange: (v: string) => void; onSend: () => void; placeholder: string; editable?: boolean; bottomInset?: number }) {
  const can = editable && value.trim().length > 0;
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: Math.max(12, bottomInset), backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 30, borderWidth: 1, borderColor: colors.line, paddingLeft: 18, paddingRight: 6, paddingVertical: 6, ...shadow.card }}>
        <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} editable={editable}
          onSubmitEditing={onSend} returnKeyType="send" style={{ flex: 1, fontSize: 17, color: colors.text, paddingVertical: 10, minHeight: 44 }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Skicka" onPress={onSend} disabled={!can}
          style={({ pressed }) => ({ opacity: can ? 1 : 0.4, transform: [{ scale: pressed ? 0.92 : 1 }] })}>
          <LinearGradient colors={['#B64F39', '#9A3A27']} style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="up" size={22} color="#fff" strokeWidth={2.8} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
