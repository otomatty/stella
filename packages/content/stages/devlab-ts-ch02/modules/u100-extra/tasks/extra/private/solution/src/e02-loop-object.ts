// 問題
// 名前と得点の組を表す型 Scores は定義済みです。次の3つの関数を書いてください。
// 引数と戻り値には型注釈を付けること。
//
// 1. totalScore(scores)
//    得点の合計を返す
//
// 2. topScorer(scores)
//    最高得点の人の名前を返す。同点なら先に出てきた人。scores が空なら undefined を返す
//
// 3. passedNames(scores, border)
//    border 点以上の人の名前を、出てきた順に配列で返す
//
// ヒント: Object.keys、Object.values、Object.entries

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
