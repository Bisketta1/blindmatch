import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { decideSwipe, SwipeDirection } from './decision';
import { colors, radius } from '../../theme';

export type Candidate = {
  candidate_id: string; first_name: string; age: number; city: string | null; bio: string | null; photos: string[];
  answers: { prompt: string; answer: string }[];
};
export type SwipeCardHandle = { swipe: (dir: SwipeDirection) => void };
type Props = { candidate: Candidate; onSwipe: (dir: SwipeDirection) => void; disabled?: boolean; yesLabel: string; noLabel: string };

const W = Dimensions.get('window').width;

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard({ candidate, onSwipe, disabled, yesLabel, noLabel }, ref) {
  const pos = useRef(new Animated.ValueXY()).current;
  const done = useRef(false);

  const fling = (dir: SwipeDirection, dy = 0) => {
    if (done.current) return;
    done.current = true;
    Animated.timing(pos, { toValue: { x: dir === 'yes' ? W * 1.5 : -W * 1.5, y: dy }, duration: 220, useNativeDriver: false }).start(() => onSwipe(dir));
  };
  useImperativeHandle(ref, () => ({ swipe: (d) => fling(d) }));

  const responder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_, g) => !disabled && Math.abs(g.dx) > 6,
      onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        const dir = decideSwipe(g.dx, g.vx, W);
        if (dir) fling(dir, g.dy);
        else Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, onSwipe],
  );

  const rotate = pos.x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-14deg', '0deg', '14deg'] });
  const yesOpacity = pos.x.interpolate({ inputRange: [0, W * 0.3], outputRange: [0, 1], extrapolate: 'clamp' });
  const noOpacity = pos.x.interpolate({ inputRange: [-W * 0.3, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Animated.View {...responder.panHandlers} style={[styles.card, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]}>
      {candidate.photos[0] ? <Image source={{ uri: candidate.photos[0] }} style={styles.photo} resizeMode="cover" /> : <View style={styles.photo} />}
      <Animated.View style={[styles.stamp, styles.stampYes, { opacity: yesOpacity }]}><Text style={[styles.stampText, { color: colors.yes }]}>{yesLabel}</Text></Animated.View>
      <Animated.View style={[styles.stamp, styles.stampNo, { opacity: noOpacity }]}><Text style={[styles.stampText, { color: colors.no }]}>{noLabel}</Text></Animated.View>
      <View style={styles.info}>
        <Text style={styles.name}>{candidate.first_name}, {candidate.age}</Text>
        {candidate.city ? <Text style={styles.sub}>{candidate.city}</Text> : null}
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
  card: { width: '100%', backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  photo: { width: '100%', height: 360, backgroundColor: colors.primarySoft },
  info: { padding: 16 },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginBottom: 6 },
  bio: { color: colors.text, marginBottom: 8 },
  answer: { backgroundColor: colors.bg, borderRadius: 14, padding: 10, marginTop: 6 },
  prompt: { color: colors.muted, fontSize: 12 },
  answerText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  stamp: { position: 'absolute', top: 28, borderWidth: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#ffffffcc' },
  stampYes: { left: 20, borderColor: colors.yes, transform: [{ rotate: '-12deg' }] },
  stampNo: { right: 20, borderColor: colors.no, transform: [{ rotate: '12deg' }] },
  stampText: { fontSize: 30, fontWeight: '900' },
});
