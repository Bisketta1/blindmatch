export type DateIdea = { key: string; title: string; description: string; words: string[] };

/** Cozy, low-pressure first-date formats. Nothing here names a real venue. */
export const IDEAS: DateIdea[] = [
  { key: 'fika', title: 'Fika', description: 'Kaffe och något gott. Ingen brådska.', words: ['kaffe', 'fika', 'kanelbulle', 'bulle', 'bak', 'surdeg', 'te'] },
  { key: 'promenad', title: 'Promenad och glass', description: 'Gå en sväng, prata, avsluta med glass.', words: ['promenad', 'vandring', 'natur', 'gå', 'glass', 'cykla', 'hund'] },
  { key: 'bok', title: 'Bokhandel och kaffe', description: 'Bläddra bland böcker och visa varandra era favoriter.', words: ['bok', 'böcker', 'läsa', 'bokhandel', 'bibliotek'] },
  { key: 'sushi', title: 'Sushi och prat', description: 'Dela några rullar och se vem som vågar äta wasabi.', words: ['sushi', 'mat', 'laga', 'middag', 'restaurang', 'ramen'] },
  { key: 'brunch', title: 'Brunch', description: 'Sen frukost som blir lunch.', words: ['brunch', 'frukost', 'söndag', 'ägg', 'pannkak'] },
  { key: 'bowling', title: 'Bowling eller bordsspel', description: 'Lite tävlan gör det lättare att skratta.', words: ['bowling', 'spel', 'bordsspel', 'tävl', 'tennis', 'sport', 'träna'] },
  { key: 'utstallning', title: 'Utställning', description: 'Gå på museum eller galleri och prata om vad ni ser.', words: ['konst', 'museum', 'galleri', 'utställning', 'film', 'teater', 'kultur'] },
  { key: 'picknick', title: 'Picknick', description: 'Ta med varsin sak att dela och hitta en solig plats.', words: ['picknick', 'park', 'sol', 'sommar', 'utsikt', 'vatten'] },
  { key: 'middag', title: 'Middag', description: 'Sitt ner och ta god tid på er.', words: ['middag', 'vin', 'laga', 'restaurang', 'mat'] },
];

/** Put ideas that match words in the singles' profile answers first. */
export function suggestIdeas(profileText: string): { idea: DateIdea; match: boolean }[] {
  const text = profileText.toLowerCase();
  const scored = IDEAS.map((idea, i) => ({ idea, i, score: idea.words.filter((w) => text.includes(w)).length }));
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored.map((s) => ({ idea: s.idea, match: s.score > 0 }));
}
