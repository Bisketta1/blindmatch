/** Swedish countdown text, e.g. "Om 2 dygn och 4 timmar". */
export function formatCountdown(startsAt: Date | string, now: Date = new Date()): string {
  const ms = new Date(startsAt).getTime() - now.getTime();
  if (ms <= 0) return ms > -6 * 3600000 ? 'Nu' : 'Dejten har varit';
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (days >= 1) return hours > 0 ? `Om ${plural(days, 'dygn', 'dygn')} och ${plural(hours, 'timme', 'timmar')}` : `Om ${plural(days, 'dygn', 'dygn')}`;
  if (hours >= 1) return m > 0 && hours < 6 ? `Om ${plural(hours, 'timme', 'timmar')} och ${plural(m, 'minut', 'minuter')}` : `Om ${plural(hours, 'timme', 'timmar')}`;
  return `Om ${plural(Math.max(1, m), 'minut', 'minuter')}`;
}

export function isPast(startsAt: Date | string, now: Date = new Date()): boolean {
  return new Date(startsAt).getTime() <= now.getTime();
}
