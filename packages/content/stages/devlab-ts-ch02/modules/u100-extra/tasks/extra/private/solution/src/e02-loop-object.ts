export type Scores = { [name: string]: number };

export function totalScore(scores: Scores): number {
  let total = 0;
  for (const score of Object.values(scores)) {
    total += score;
  }
  return total;
}

export function topScorer(scores: Scores): string | undefined {
  let top: string | undefined;
  let best = -Infinity;
  for (const [name, score] of Object.entries(scores)) {
    if (score > best) {
      top = name;
      best = score;
    }
  }
  return top;
}

export function passedNames(scores: Scores, border: number): string[] {
  return Object.entries(scores)
    .filter(([, score]) => score >= border)
    .map(([name]) => name);
}
