import { ageFromBirthDate, isAdult, isValidBirthDate } from '../src/lib/age';
import { decideSwipe } from '../src/features/swipe/decision';
import sv from '../src/i18n/sv.json';

describe('age', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  it('computes age around the birthday', () => {
    expect(ageFromBirthDate('2008-11-18', now)).toBe(18);
    expect(ageFromBirthDate('2008-11-19', now)).toBe(17);
  });
  it('only allows 18+ and real dates', () => {
    expect(isAdult('2008-11-18', now)).toBe(true);
    expect(isAdult('2008-11-19', now)).toBe(false);
    expect(isValidBirthDate('2000-02-30')).toBe(false);
    expect(isAdult('hej', now)).toBe(false);
  });
});

describe('decideSwipe', () => {
  it('needs a real drag or fling', () => {
    expect(decideSwipe(10, 0, 400)).toBeNull();
    expect(decideSwipe(130, 0, 400)).toBe('yes');
    expect(decideSwipe(-130, 0, 400)).toBe('no');
    expect(decideSwipe(60, 1.2, 400)).toBe('yes');
    expect(decideSwipe(-60, -1.2, 400)).toBe('no');
    expect(decideSwipe(20, 1.5, 400)).toBeNull();
  });
});

describe('i18n', () => {
  it('has the keys the screens use', () => {
    expect(sv.swipe.left).toContain('{{n}}');
    expect(sv.dates.credit).toContain('{{names}}');
    expect(Object.keys(sv.gender)).toEqual(['man', 'kvinna', 'icke-binar']);
  });
});

import { clampInt, daysInMonth, pickDate } from '../src/lib/dates';
describe('wheel date helpers', () => {
  it('knows month lengths', () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2026, 3)).toBe(30);
  });
  it('clamps day and range', () => {
    expect(clampInt(40, 1, 31)).toBe(31);
    expect(pickDate(2026, 1, 31).getDate()).toBe(28);
    const max = new Date(2008, 5, 1);
    expect(pickDate(2010, 0, 1, undefined, max).getFullYear()).toBe(2008);
    const min = new Date(2026, 10, 18);
    expect(pickDate(2026, 10, 1, min).getDate()).toBe(18);
  });
});
