import { formatCountdown } from './countdown';

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
