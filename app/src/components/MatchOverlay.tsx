import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBadges } from '../lib/badges';
import { Btn } from './ui';
import { Display } from './Display';
import { Icon } from './Icon';
import { hapticSuccess } from '../lib/haptics';
import { colors } from '../theme';

const DOTS = Array.from({ length: 12 }, (_, i) => ({ angle: (i / 12) * Math.PI * 2, dist: 110 + (i % 3) * 25, size: 8 + (i % 3) * 3, color: i % 2 ? colors.primary : colors.accent }));

export function MatchOverlay() {
  const { t } = useTranslation();
  const router = useRouter();
  const { match, dismissMatch } = useBadges();
  const fade = useRef(new Animated.Value(0)).current;
  const left = useRef(new Animated.Value(-160)).current;
  const right = useRef(new Animated.Value(160)).current;
  const heart = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!match) return;
    hapticSuccess();
    [fade, heart, burst, text].forEach((v) => v.setValue(0));
    left.setValue(-160); right.setValue(160);
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(left, { toValue: -26, friction: 6, tension: 70, useNativeDriver: true }),
        Animated.spring(right, { toValue: 26, friction: 6, tension: 70, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(heart, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(text, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  }, [match, fade, left, right, heart, burst, text]);

  if (!match) return null;
  const goChat = () => { const id = match.matchId; dismissMatch(); router.push(`/chat/${id}`); };

  return (
    <Modal transparent animationType="none" visible onRequestClose={dismissMatch}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <View style={styles.stage}>
          {DOTS.map((d, i) => (
            <Animated.View key={i} style={{
              position: 'absolute', width: d.size, height: d.size, borderRadius: d.size, backgroundColor: d.color,
              opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(d.angle) * d.dist] }) },
                { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(d.angle) * d.dist] }) },
              ],
            }} />
          ))}
          <Animated.View style={[styles.circle, { backgroundColor: colors.primary, transform: [{ translateX: left }] }]} />
          <Animated.View style={[styles.circle, { backgroundColor: colors.accent, opacity: 0.92, transform: [{ translateX: right }] }]} />
          <Animated.View style={{ position: 'absolute', transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }] }}>
            <Icon name="heart" size={64} color="#fff" filled strokeWidth={1} />
          </Animated.View>
        </View>
        <Animated.View style={{ opacity: text, alignItems: 'center', transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
          <Display style={styles.title}>{t('match.title')}</Display>
          <Text style={styles.body}>{match.body}</Text>
          <Btn label={t('match.chat')} icon="chat" onPress={goChat} style={{ alignSelf: 'stretch', marginTop: 24 }} />
          <Btn kind="ghost" label={t('match.continue')} onPress={dismissMatch} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#FAF5EEf5', alignItems: 'center', justifyContent: 'center', padding: 32 },
  stage: { width: 260, height: 180, alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', width: 120, height: 120, borderRadius: 60 },
  title: { fontSize: 36, lineHeight: 42, textAlign: 'center' },
  body: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
