// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

// 問9
export function topScorer(scores: Record<string, number>): string | undefined {
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
