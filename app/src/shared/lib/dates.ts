export const MONTHS_SV = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();
export const clampInt = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Build a local Date at noon from wheel indexes and clamp it into [min, max]. */
export function pickDate(year: number, monthIndex: number, day: number, min?: Date, max?: Date): Date {
  let d = new Date(year, monthIndex, clampInt(day, 1, daysInMonth(year, monthIndex)), 12, 0);
  const lo = min ? new Date(min.getFullYear(), min.getMonth(), min.getDate(), 12) : undefined;
  const hi = max ? new Date(max.getFullYear(), max.getMonth(), max.getDate(), 12) : undefined;
  if (lo && d < lo) d = lo;
  if (hi && d > hi) d = hi;
  return d;
}
