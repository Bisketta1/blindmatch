/** Turn an address, or a pasted map link, into a link that opens in Google Maps. Only known map hosts are accepted as links. */
const MAP_HOSTS = ['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl', 'maps.apple.com'];

export function isMapsLink(text: string): boolean {
  const t = text.trim();
  if (!/^https:\/\//i.test(t) || /\s/.test(t)) return false;
  try {
    const u = new URL(t);
    if (!MAP_HOSTS.includes(u.hostname.toLowerCase())) return false;
    if ((u.hostname === 'google.com' || u.hostname === 'www.google.com') && !u.pathname.startsWith('/maps')) return false;
    if (u.hostname === 'goo.gl' && !u.pathname.startsWith('/maps')) return false;
    return true;
  } catch { return false; }
}

export function mapsUrl(address: string): string {
  const t = address.trim();
  if (isMapsLink(t)) return t;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t)}`;
}

/** Human readable address line: hide long pasted links. */
export function addressLabel(address: string, linkLabel: string): string {
  return isMapsLink(address) ? linkLabel : address.trim();
}

/** A usable address: a known map link, or plain text of at least 5 characters that is not some other link. */
export function isValidAddress(text: string): boolean {
  const t = text.trim();
  if (isMapsLink(t)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return false; // other links and schemes
  return t.length >= 5;
}
