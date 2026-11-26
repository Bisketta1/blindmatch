import { clampInt, daysInMonth, pickDate } from './dates';

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
