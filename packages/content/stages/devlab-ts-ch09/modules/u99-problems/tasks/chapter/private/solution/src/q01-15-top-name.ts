// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問15
export function topName(scores: Map<string, number>): string | undefined {
  let best: [string, number] | undefined;
  for (const entry of scores) {
    if (best === undefined || entry[1] > best[1]) {
      best = entry;
    }
  }
  return best?.[0];
}
