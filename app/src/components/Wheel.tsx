import React, { useEffect, useRef, useState } from 'react';
import { Animated, NativeScrollEvent, NativeSyntheticEvent, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticTick } from '../lib/haptics';
import { playTick } from '../lib/sound';
import { colors } from '../theme';

export const ITEM_H = 48;
const ROWS = 5;

/** Drum-style wheel: items tilt away, shrink and fade as they leave the middle row. Snaps, ticks and vibrates per step. */
export function Wheel({ items, index, onIndex, flex = 1, fade = colors.card }: { items: string[]; index: number; onIndex: (i: number) => void; flex?: number; fade?: string }) {
  const ref = useRef<any>(null);
  const timer = useRef<any>(null);
  const offset = useRef(index * ITEM_H);
  const lastTick = useRef(index);
  const scrollY = useRef(new Animated.Value(index * ITEM_H)).current;
  const [live, setLive] = useState(index);

  useEffect(() => {
    if (Math.abs(offset.current - index * ITEM_H) > 1) { ref.current?.scrollTo({ y: index * ITEM_H, animated: false }); offset.current = index * ITEM_H; }
    setLive(index);
  }, [index, items.length]);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScrollEvent(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    offset.current = y;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    if (i !== lastTick.current) { lastTick.current = i; setLive(i); hapticTick(); playTick(); }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
      offset.current = i * ITEM_H;
      onIndex(i);
    }, 130);
  }

  return (
    <View style={{ flex, height: ITEM_H * ROWS }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: ITEM_H * 2, left: 4, right: 4, height: ITEM_H, borderRadius: 16, backgroundColor: colors.primarySoft }} />
      <Animated.ScrollView ref={ref} showsVerticalScrollIndicator={false} scrollEventThrottle={16}
        snapToInterval={ITEM_H} decelerationRate="fast" nestedScrollEnabled contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true, listener: onScrollEvent })}>
        {items.map((label, i) => {
          const r = [(i - 2) * ITEM_H, (i - 1) * ITEM_H, i * ITEM_H, (i + 1) * ITEM_H, (i + 2) * ITEM_H];
          return (
            <Animated.View key={label + i} style={{
              height: ITEM_H, opacity: scrollY.interpolate({ inputRange: r, outputRange: [0.18, 0.5, 1, 0.5, 0.18], extrapolate: 'clamp' }),
              transform: [
                { perspective: 520 },
                { rotateX: scrollY.interpolate({ inputRange: r, outputRange: ['58deg', '30deg', '0deg', '-30deg', '-58deg'], extrapolate: 'clamp' }) },
                { scale: scrollY.interpolate({ inputRange: r, outputRange: [0.8, 0.92, 1.08, 0.92, 0.8], extrapolate: 'clamp' }) },
              ],
            }}>
              <Pressable onPress={() => ref.current?.scrollTo({ y: i * ITEM_H, animated: true })} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 21, fontWeight: i === live ? '700' : '500', color: colors.text, fontVariant: ['tabular-nums'] }}>{label}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
      <LinearGradient pointerEvents="none" colors={[fade, `${fade}00`]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 1.5 }} />
      <LinearGradient pointerEvents="none" colors={[`${fade}00`, fade]} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 1.5 }} />
    </View>
  );
}
