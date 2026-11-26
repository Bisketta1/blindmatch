import sv from './sv.json';

describe('i18n', () => {
  it('has the keys the screens use', () => {
    expect(sv.swipe.left).toContain('{{n}}');
    expect(sv.dates.credit).toContain('{{names}}');
    expect(Object.keys(sv.gender)).toEqual(['man', 'kvinna', 'icke-binar']);
  });
});
