// Design tokens. Soft sage-ivory + espresso ink + forest green, with champagne-gold accents.
// Contrast (WCAG AA >= 4.5): white on primary 6.4, primary on soft 5.5, primary on bg 6.1, muted on bg 5.9.
export const colors = {
  bg: '#F7FAF4',
  card: '#FFFFFF',
  primary: '#2B6A4A',
  primarySoft: '#E2F0E6',
  accent: '#BFD9C6',
  gold: '#C9A26B',
  goldText: '#8A6128',
  text: '#2A201C',
  muted: '#6B5E57',
  line: '#DFE8DB',
  yes: '#2F7D5B',
  no: '#A8432F',
  danger: '#B3261E',
  badge: '#C62828',
  ink: '#2A201C',
};
export const radius = { card: 24, button: 999, field: 16, chip: 999 };
export const space = (n: number) => n * 4;
/** Spacing scale (pt) and screen gutter; use these instead of ad-hoc numbers. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, gutter: 20 };
/** Type scale after Apple HIG: size / line height. Titles use the Fraunces Display component. */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41 },
  title: { fontSize: 22, lineHeight: 28 },
  body: { fontSize: 17, lineHeight: 24 },
  subhead: { fontSize: 15, lineHeight: 21 },
  footnote: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
};
export const minTarget = 44;
export const shadow = {
  card: { shadowColor: '#3A2418', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  lift: { shadowColor: '#3A2418', shadowOpacity: 0.16, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
  button: { shadowColor: '#2B6A4A', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
};
export const fonts = { display: 'Fraunces_600SemiBold' };
