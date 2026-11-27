import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '@/shared/ui/Icon';
import { colors, shadow, type } from '@/shared/theme';

/** iOS-style inset grouped list: one white rounded container, hairline separators, 56 pt rows. */
export function ListGroup({ children }: { children: React.ReactNode }) {
  return <View style={[{ backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden' }, shadow.card]}>{children}</View>;
}

export function ListRow({ title, subtitle, badge, last, onPress, accessory }: {
  title: string; subtitle?: string; badge?: number; last?: boolean; onPress?: () => void; accessory?: React.ReactNode;
}) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} disabled={!onPress}
      style={({ pressed }) => ({ minHeight: 56, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: pressed ? colors.primarySoft : colors.card, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line })}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.body, fontWeight: '600', color: colors.text }}>{title}</Text>
        {subtitle ? <Text style={{ ...type.subhead, color: colors.muted }}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={{ backgroundColor: colors.badge, borderRadius: 12, minWidth: 24, height: 24, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{badge}</Text>
        </View>
      ) : null}
      {accessory}
      {onPress ? <Icon name="next" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

/** Calm empty state: icon, one sentence. */
export function EmptyState({ icon, text }: { icon: React.ComponentProps<typeof Icon>['name']; text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 12 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={{ ...type.subhead, color: colors.muted, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}
