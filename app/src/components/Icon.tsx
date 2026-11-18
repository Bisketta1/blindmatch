import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

export type IconName = 'heart' | 'chat' | 'calendar' | 'people' | 'person' | 'plus' | 'close' | 'check' | 'back' | 'minus';

const PATHS: Record<IconName, string> = {
  heart: 'M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.65-7 10-7 10z',
  chat: 'M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M3 10h18 M8 3v4 M16 3v4',
  people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 19c0-3 2.7-5 6-5s6 2 6 5 M16.5 11a2.5 2.5 0 1 0 0-5 M17 14c2.5.3 4 2 4 5',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12 M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  back: 'M15 5l-7 7 7 7',
};

export function Icon({ name, size = 22, color = colors.text, strokeWidth = 2, filled = false }:
  { name: IconName; size?: number; color?: string; strokeWidth?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={PATHS[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={filled ? color : 'none'} />
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
