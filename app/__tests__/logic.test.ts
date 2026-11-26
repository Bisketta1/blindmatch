import { ageFromBirthDate, isAdult, isValidBirthDate } from '@/shared/lib/age';
import { decideSwipe } from '@/features/swipe/decision';
import sv from '@/shared/i18n/sv.json';

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

import { clampInt, daysInMonth, pickDate } from '@/shared/lib/dates';
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

import { addressLabel, isMapsLink, isValidAddress, mapsUrl } from '@/features/dates/maps';
import { formatCountdown } from '@/features/dates/countdown';
import { suggestIdeas } from '@/features/dates/ideas';
import { matchmakerTitle } from '@/features/matchmaker/matchmaker';

describe('maps links', () => {
  it('builds a search link from a plain address', () => {
    expect(mapsUrl('Drottninggatan 1, Stockholm')).toBe('https://www.google.com/maps/search/?api=1&query=Drottninggatan%201%2C%20Stockholm');
  });
  it('accepts real map links only', () => {
    expect(isMapsLink('https://maps.app.goo.gl/abc123')).toBe(true);
    expect(isMapsLink('https://www.google.com/maps/place/Bollhuset')).toBe(true);
    expect(isMapsLink('https://www.google.com/search?q=x')).toBe(false);
    expect(isMapsLink('https://evil.example.com/maps')).toBe(false);
    expect(isMapsLink('http://maps.app.goo.gl/abc')).toBe(false);
    expect(isMapsLink('javascript:alert(1)')).toBe(false);
  });
  it('never turns an unknown link into a clickable maps url', () => {
    expect(mapsUrl('https://evil.example.com/x')).toContain('https://www.google.com/maps/search/?api=1&query=');
  });
  it('shortens pasted links in the label', () => {
    expect(addressLabel('https://maps.app.goo.gl/abc', 'Plats via kartlänk')).toBe('Plats via kartlänk');
    expect(addressLabel(' Storgatan 5 ', 'x')).toBe('Storgatan 5');
  });
});

describe('countdown', () => {
  const now = new Date('2026-11-19T12:00:00Z');
  it('speaks Swedish and rounds down', () => {
    expect(formatCountdown('2026-11-21T16:30:00Z', now)).toBe('Om 2 dygn och 4 timmar');
    expect(formatCountdown('2026-11-20T12:00:00Z', now)).toBe('Om 1 dygn');
    expect(formatCountdown('2026-11-19T15:20:00Z', now)).toBe('Om 3 timmar och 20 minuter');
    expect(formatCountdown('2026-11-19T12:25:00Z', now)).toBe('Om 25 minuter');
    expect(formatCountdown('2026-11-19T11:30:00Z', now)).toBe('Nu');
    expect(formatCountdown('2026-11-10T11:30:00Z', now)).toBe('Dejten har varit');
  });
});

describe('date ideas and matchmaker title', () => {
  it('puts matching ideas first', () => {
    const s = suggestIdeas('Jag älskar sushi och bokhandlar');
    expect(s[0].match).toBe(true);
    expect(['sushi', 'bok']).toContain(s[0].idea.key);
    expect(s.length).toBeGreaterThan(5);
  });
  it('gives a calm title ladder', () => {
    expect(matchmakerTitle(0).title).toBe('Ny matchmaker');
    expect(matchmakerTitle(2).title).toBe('Kopplare');
    expect(matchmakerTitle(12).next).toBeNull();
  });
});

describe('address validation', () => {
  it('accepts real addresses and map links only', () => {
    expect(isValidAddress('Drottninggatan 1, Stockholm')).toBe(true);
    expect(isValidAddress('https://maps.app.goo.gl/abc')).toBe(true);
    expect(isValidAddress('abc')).toBe(false);
    expect(isValidAddress('   ')).toBe(false);
    expect(isValidAddress('https://evil.example.com/x')).toBe(false);
    expect(isValidAddress('javascript:alert(1)')).toBe(false);
  });
});
