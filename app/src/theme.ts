// Design tokens. Warm ivory + espresso ink + deep terracotta, with champagne-gold accents.
// All text/background pairs below meet WCAG AA (>= 4.5:1): ink on bg 14.7, muted on bg 5.8, white on primary 6.0, primary on soft 5.0.
export const colors = {
  bg: '#FAF5EE',
  card: '#FFFFFF',
  primary: '#A8432F',
  primarySoft: '#F7E9E1',
  accent: '#E9C9A8',
  gold: '#C9A26B',
  goldText: '#8A6128',
  text: '#2A201C',
  muted: '#6B5E57',
  line: '#EADFD4',
  yes: '#2F7D5B',
  no: '#A8432F',
  danger: '#B3261E',
  badge: '#C62828',
  ink: '#2A201C',
};
export const radius = { card: 24, button: 999, field: 16, chip: 999 };
export const space = (n: number) => n * 4;
export const shadow = {
  card: { shadowColor: '#3A2418', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  lift: { shadowColor: '#3A2418', shadowOpacity: 0.16, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
  button: { shadowColor: '#A8432F', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
};
export const fonts = { display: 'Fraunces_600SemiBold' };
