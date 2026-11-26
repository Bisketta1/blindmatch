export function ageFromBirthDate(birthDate: string, now: Date = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = now.getFullYear() - y;
  const hadBirthday = now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}
export function isValidBirthDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function isAdult(birthDate: string, now: Date = new Date()): boolean {
  return isValidBirthDate(birthDate) && ageFromBirthDate(birthDate, now) >= 18;
}
