export type SwipeDirection = 'yes' | 'no';

/** Decide whether a finished drag counts as a swipe. Fling or drag past 30% of the width. */
export function decideSwipe(dx: number, vx: number, width: number): SwipeDirection | null {
  const threshold = width * 0.3;
  if (dx > threshold || (dx > 40 && vx > 0.8)) return 'yes';
  if (dx < -threshold || (dx < -40 && vx < -0.8)) return 'no';
  return null;
}
