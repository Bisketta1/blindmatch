import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { decideSwipe, SwipeDirection } from './decision';
import { hapticLight, hapticMedium } from '../../lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Display } from '../../components/Display';
import { colors, radius, shadow } from '../../theme';

export type Candidate = {
  candidate_id: string; first_name: string; age: number; city: string | null; bio: string | null; photos: string[];
  answers: { prompt: string; answer: string }[];
};
export type SwipeCardHandle = { swipe: (dir: SwipeDirection) => void };
type Props = {
  candidate: Candidate; onSwipe: (dir: SwipeDirection) => void; disabled?: boolean; yesLabel: string; noLabel: string;
  onDrag?: (active: boolean) => void;
};

const W = Dimensions.get('window').width;

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(props, ref) {
  const { candidate, yesLabel, noLabel } = props;
  // Always read the latest props from a ref, so re-renders in the middle of a drag never break the gesture.
  const latest = useRef(props);
  latest.current = props;
  const pos = useRef(new Animated.ValueXY()).current;
  const done = useRef(false);
  const crossed = useRef(false);

  const fling = (dir: SwipeDirection, dy = 0, vx = 0) => {
    if (done.current) return;
    done.current = true;
    hapticLight();
    const duration = Math.max(120, 240 - Math.abs(vx) * 60);
    Animated.timing(pos, { toValue: { x: dir === 'yes' ? W * 1.6 : -W * 1.6, y: dy * 0.6 }, duration, useNativeDriver: false })
      .start(() => latest.current.onSwipe(dir));
  };
  useImperativeHandle(ref, () => ({ swipe: (d) => fling(d) }));

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Capture horizontal drags so a parent ScrollView cannot steal the gesture.
      onMoveShouldSetPanResponderCapture: (_, g) => !latest.current.disabled && !done.current && Math.abs(g.dx) > 5 && Math.abs(g.dx) > Math.abs(g.dy),
      onMoveShouldSetPanResponder: (_, g) => !latest.current.disabled && !done.current && Math.abs(g.dx) > 5 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { pos.stopAnimation(); latest.current.onDrag?.(true); },
      onPanResponderMove: (_, g) => {
        pos.setValue({ x: g.dx, y: g.dy * 0.35 });
        const over = Math.abs(g.dx) > W * 0.3;
        if (over && !crossed.current) { crossed.current = true; hapticMedium(); }
        else if (!over && crossed.current) crossed.current = false;
      },
      onPanResponderRelease: (_, g) => {
        crossed.current = false;
        latest.current.onDrag?.(false);
        const dir = decideSwipe(g.dx, g.vx, W);
        if (dir) fling(dir, g.dy, g.vx);
        else Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 7, tension: 90, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => {
        latest.current.onDrag?.(false);
        Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 7, useNativeDriver: false }).start();
      },
    }),
  ).current;

  const rotate = pos.x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-16deg', '0deg', '16deg'] });
  const yesOpacity = pos.x.interpolate({ inputRange: [0, W * 0.25], outputRange: [0, 1], extrapolate: 'clamp' });
  const noOpacity = pos.x.interpolate({ inputRange: [-W * 0.25, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Animated.View {...responder.panHandlers} style={[styles.card, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]}>
      <View style={styles.photoWrap}>
        {candidate.photos[0] ? <Image source={{ uri: candidate.photos[0] }} style={styles.photo} resizeMode="cover" /> : <View style={styles.photo} />}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(47,125,91,0.42)', opacity: yesOpacity }]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(168,67,47,0.42)', opacity: noOpacity }]} />
        <LinearGradient colors={['transparent', 'rgba(30,18,12,0.78)']} style={styles.shade} pointerEvents="none" />
        <View style={styles.nameBlock} pointerEvents="none">
          <Display style={styles.name}>{candidate.first_name}<Text style={styles.age}>  {candidate.age}</Text></Display>
          {candidate.city ? <Text style={styles.city}>{candidate.city}</Text> : null}
        </View>
        <Animated.View style={[styles.stamp, styles.stampYes, { opacity: yesOpacity }]}><Text style={[styles.stampText, { color: colors.yes }]}>{yesLabel}</Text></Animated.View>
        <Animated.View style={[styles.stamp, styles.stampNo, { opacity: noOpacity }]}><Text style={[styles.stampText, { color: colors.no }]}>{noLabel}</Text></Animated.View>
      </View>
      <View style={styles.info}>
        {candidate.bio ? <Text style={styles.bio} numberOfLines={3}>{candidate.bio}</Text> : null}
        {candidate.answers.slice(0, 2).map((a) => (
          <View key={a.prompt} style={styles.answer}>
            <Text style={styles.prompt}>{a.prompt}</Text>
            <Text style={styles.answerText}>{a.answer}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { userSelect: 'none', width: '100%', backgroundColor: colors.card, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, ...shadow.lift },
  photoWrap: { width: '100%', height: 420, backgroundColor: colors.primarySoft },
  photo: { width: '100%', height: 420, backgroundColor: colors.primarySoft },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 190 },
  nameBlock: { position: 'absolute', left: 20, right: 20, bottom: 18 },
  name: { color: '#fff', fontSize: 36, lineHeight: 42 },
  age: { color: '#fff', fontSize: 28, opacity: 0.92 },
  city: { color: '#fff', fontSize: 15, opacity: 0.92, marginTop: 2, fontWeight: '600' },
  info: { padding: 18 },
  bio: { color: colors.text, fontSize: 16, lineHeight: 23, marginBottom: 10 },
  answer: { backgroundColor: colors.bg, borderRadius: 18, padding: 14, marginTop: 8 },
  prompt: { color: colors.muted, fontSize: 13, marginBottom: 2 },
  answerText: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  stamp: { position: 'absolute', top: 28, borderWidth: 4, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: '#ffffffe6' },
  stampYes: { left: 22, borderColor: colors.yes, transform: [{ rotate: '-12deg' }] },
  stampNo: { right: 22, borderColor: colors.no, transform: [{ rotate: '12deg' }] },
  stampText: { fontSize: 30, fontWeight: '900', letterSpacing: 1 },
});
