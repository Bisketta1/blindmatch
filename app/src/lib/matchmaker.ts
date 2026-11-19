export type MatchmakerTitle = { title: string; next: number | null };

/** Calm title ladder based on dates that actually happened (confirmed). */
export function matchmakerTitle(datesMade: number): MatchmakerTitle {
  if (datesMade >= 10) return { title: 'Mästare', next: null };
  if (datesMade >= 5) return { title: 'Stjärnkopplare', next: 10 };
  if (datesMade >= 2) return { title: 'Kopplare', next: 5 };
  if (datesMade >= 1) return { title: 'Nybörjare', next: 2 };
  return { title: 'Ny matchmaker', next: 1 };
}
