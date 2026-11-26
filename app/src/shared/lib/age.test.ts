import { ageFromBirthDate, isAdult, isValidBirthDate } from './age';

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
