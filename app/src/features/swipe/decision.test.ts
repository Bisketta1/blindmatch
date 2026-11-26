import { decideSwipe } from './decision';

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
