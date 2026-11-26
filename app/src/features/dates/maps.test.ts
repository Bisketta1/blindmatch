import { addressLabel, isMapsLink, isValidAddress, mapsUrl } from './maps';

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
