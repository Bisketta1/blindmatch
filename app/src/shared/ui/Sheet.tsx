import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Display } from './Display';
import { colors } from '@/shared/theme';

/** Bottom sheet with grabber, dimmed backdrop and tap-outside to close (HIG: one sheet at a time, scoped task). */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable accessibilityLabel="Stäng" style={{ flex: 1, backgroundColor: '#0006' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(24, insets.bottom + 8) }}>
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 16 }} />
        <Display style={{ fontSize: 24, lineHeight: 30, textAlign: 'center', marginBottom: 8 }}>{title}</Display>
        {children}
      </View>
    </Modal>
  );
}
