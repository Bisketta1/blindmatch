import React, { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from 'react-native';
import { hapticTick } from '../lib/haptics';
import { colors } from '../theme';

export const ITEM_H = 44;
const ROWS = 5;

/** Vertical wheel picker: drag up/down, snaps to the middle row, ticks while you scroll. Same on iOS, Android and web. */
export function Wheel({ items, index, onIndex, flex = 1 }: { items: string[]; index: number; onIndex: (i: number) => void; flex?: number }) {
  const ref = useRef<any>(null);
  const timer = useRef<any>(null);
  const offset = useRef(index * ITEM_H);
  const lastTick = useRef(index);
  const [live, setLive] = useState(index);

  useEffect(() => {
    if (Math.abs(offset.current - index * ITEM_H) > 1) { ref.current?.scrollTo({ y: index * ITEM_H, animated: false }); offset.current = index * ITEM_H; }
    setLive(index);
  }, [index, items.length]);
  useEffect(() => { const t = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }), 0); return () => clearTimeout(t); // eslint-disable-next-line
  }, []);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    offset.current = y;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    if (i !== lastTick.current) { lastTick.current = i; setLive(i); hapticTick(); }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
      offset.current = i * ITEM_H;
      onIndex(i);
    }, 130);
  }

  return (
    <View style={{ flex, height: ITEM_H * ROWS }}>
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}
        snapToInterval={ITEM_H} decelerationRate="fast" nestedScrollEnabled contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}>
        {items.map((label, i) => (
          <Pressable key={label + i} onPress={() => { ref.current?.scrollTo({ y: i * ITEM_H, animated: true }); }} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: i === live ? 22 : 18, fontWeight: i === live ? '800' : '500', color: i === live ? colors.text : colors.muted, opacity: i === live ? 1 : 0.55 }}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', top: ITEM_H * 2, left: 4, right: 4, height: ITEM_H, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.primary, borderRadius: 10 }} />
    </View>
  );
}
