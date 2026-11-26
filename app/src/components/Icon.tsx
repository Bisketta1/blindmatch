import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/shared/theme';

export type IconName = 'heart' | 'chat' | 'calendar' | 'people' | 'person' | 'plus' | 'more' | 'userplus' | 'flag' | 'ban' | 'exit' | 'close' | 'check' | 'back' | 'next' | 'minus' | 'up' | 'pin' | 'clock' | 'share' | 'star';

const PATHS: Record<IconName, string> = {
  heart: 'M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.65-7 10-7 10z',
  chat: 'M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M3 10h18 M8 3v4 M16 3v4',
  people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 19c0-3 2.7-5 6-5s6 2 6 5 M16.5 11a2.5 2.5 0 1 0 0-5 M17 14c2.5.3 4 2 4 5',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  more: 'M12 5.5v.01 M12 12v.01 M12 18.5v.01',
  userplus: 'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M3 20c0-3.5 3.1-6 7-6 M18 8v6 M15 11h6',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M5.6 5.6l12.8 12.8',
  exit: 'M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4 M16 8l4 4-4 4 M20 12H9',
  close: 'M6 6l12 12 M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  up: 'M12 19V5 M6 11l6-6 6 6',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z M12 12.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5.2l3.2 1.9',
  share: 'M12 15V4 M8 7.5L12 3.5l4 4 M6 11.5H5.5A1.5 1.5 0 0 0 4 13v6a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-6a1.5 1.5 0 0 0-1.5-1.5H18',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z',
};

export function Icon({ name, size = 22, color = colors.text, strokeWidth = 2, filled = false }:
  { name: IconName; size?: number; color?: string; strokeWidth?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={PATHS[name]} stroke={color} strokeWidth={name === 'more' ? 3.4 : strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={filled ? color : 'none'} />
    </Svg>
  );
}

/** Own logo: two overlapping circles (two friends) with a small heart where they meet. */
export function Logo({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="24" cy="32" r="17" fill={colors.primary} opacity={0.95} />
      <Circle cx="40" cy="32" r="17" fill={colors.accent} opacity={0.9} />
      <Path d="M32 41s-8-4.8-8-10.6a4.4 4.4 0 0 1 8-2.5 4.4 4.4 0 0 1 8 2.5C40 36.2 32 41 32 41z" fill="#fff" />
    </Svg>
  );
}
