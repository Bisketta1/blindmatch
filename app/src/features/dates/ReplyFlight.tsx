import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLight, hapticMedium } from '@/shared/lib/haptics';
import { reduceMotion } from '@/shared/lib/motion';

export type FlightSpec = {
  text: string; color: string; tint: string; fg: string;
  from: { x: number; y: number; w: number; h: number };   // chip, window coordinates
  to: { x: number; y: number };                           // landing center, window coordinates
  onLand?: () => void;
};
export type ReplyFlightHandle = { play: (spec: FlightSpec) => void };

const ARC = [0, 47, 76, 76, 47, 0].map((v) => -v);
const PARTS = Array.from({ length: 18 }, (_, i) => ({
  angle: (i / 18) * Math.PI * 2 + (i % 2 ? 0.12 : 0), dist: 46 + (i % 3) * 18, streak: i % 2 === 0, size: 5 + (i % 3) * 2,
}));

/** A quick reply shrinks, flies in an arc to where the message will appear, pops back to full size and bursts into streaks and dots in its own color. */
export const ReplyFlight = forwardRef<ReplyFlightHandle>(function ReplyFlight(_, ref) {
  const box = useRef<any>(null);
  const [live, setLive] = useState<(FlightSpec & { ox: number; oy: number }) | null>(null);
  const shrink = useRef(new Animated.Value(1)).current;
  const p = useRef(new Animated.Value(0)).current;
  const look = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const playing = useRef(false);

  useImperativeHandle(ref, () => ({
    play(spec) {
      if (playing.current) return;
      if (reduceMotion()) { hapticMedium(); spec.onLand?.(); return; }
      playing.current = true;
      box.current?.measureInWindow((ox: number, oy: number) => {
        shrink.setValue(1); p.setValue(0); look.setValue(0); pop.setValue(1); burst.setValue(0); fade.setValue(1);
        setLive({ ...spec, ox, oy });
        hapticLight();
        Animated.sequence([
          Animated.timing(shrink, { toValue: 0.82, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(p, { toValue: 1, duration: 560, easing: Easing.bezier(0.25, 0.9, 0.3, 1), useNativeDriver: true }),
            Animated.timing(look, { toValue: 1, duration: 560, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        ]).start(() => {
          hapticMedium(); spec.onLand?.();
          Animated.parallel([
            Animated.sequence([
              Animated.timing(pop, { toValue: 1.14, duration: 110, useNativeDriver: true }),
              Animated.spring(pop, { toValue: 1, friction: 5, tension: 170, useNativeDriver: true }),
            ]),
            Animated.timing(burst, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.sequence([Animated.delay(520), Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true })]),
          ]).start(() => { setLive(null); playing.current = false; });
        });
      });
    },
  }));

  let content: React.ReactNode = null;
  if (live) {
    const { from, to, ox, oy } = live;
    const dx = to.x - (from.x + from.w / 2);
    const dy = to.y - (from.y + from.h / 2);
    const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
    const translateY = Animated.add(p.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }), p.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: ARC }));
    const grow = p.interpolate({ inputRange: [0, 1], outputRange: [1, 1 / 0.82] });
    const scale = Animated.multiply(Animated.multiply(shrink, grow), pop);
    const cx = to.x - ox, cy = to.y - oy;
    content = (
      <>
        <Animated.View style={{ position: 'absolute', left: from.x - ox, top: from.y - oy, width: from.w, height: from.h, opacity: fade, transform: [{ translateX }, { translateY }, { scale }] }}>
          <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 22, backgroundColor: live.tint, alignItems: 'center', justifyContent: 'center', opacity: look.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
            <Text style={{ color: live.fg, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{live.text}</Text>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: look, borderRadius: 22, borderBottomRightRadius: 7, overflow: 'hidden' }]}>
            <LinearGradient colors={['#B64F39', '#9A3A27']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fff', fontSize: 16 }} numberOfLines={1}>{live.text}</Text>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
        {PARTS.map((q, i) => {
          const tx = burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(q.angle) * q.dist] });
          const ty = burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(q.angle) * q.dist] });
          const opacity = burst.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 0] });
          return (
            <Animated.View key={i} style={{
              position: 'absolute', left: cx - (q.streak ? 9 : q.size / 2), top: cy - (q.streak ? 2 : q.size / 2),
              width: q.streak ? 18 : q.size, height: q.streak ? 4 : q.size, borderRadius: 4, backgroundColor: live.color, opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${q.angle}rad` }],
            }} />
          );
        })}
      </>
    );
  }
  return <View ref={box} collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill}>{content}</View>;
});
