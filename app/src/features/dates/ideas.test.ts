import { suggestIdeas } from './ideas';
import { matchmakerTitle } from '../matchmaker/matchmaker';

describe('date ideas and matchmaker title', () => {
  it('puts matching ideas first', () => {
    const s = suggestIdeas('Jag älskar sushi och bokhandlar');
    expect(s[0].match).toBe(true);
    expect(['sushi', 'bok']).toContain(s[0].idea.key);
    expect(s.length).toBeGreaterThan(5);
  });
  it('gives a calm title ladder', () => {
    expect(matchmakerTitle(0).title).toBe('Ny matchmaker');
    expect(matchmakerTitle(2).title).toBe('Kopplare');
    expect(matchmakerTitle(12).next).toBeNull();
  });
});
