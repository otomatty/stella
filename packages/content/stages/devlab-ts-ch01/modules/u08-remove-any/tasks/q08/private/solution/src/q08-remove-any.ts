// バグ1: scores.lenght（length のつづり違い）で NaN になっていた
// バグ2: avg.toFixd（toFixed のつづり違い）で実行時に TypeError になっていた
export function average(scores: number[]): number {
  if (scores.length === 0) {
    throw new Error("点数が1つもありません");
  }
  let sum = 0;
  for (const score of scores) {
    sum += score;
  }
  return sum / scores.length;
}

export function toGrade(score: number): string {
  if (score >= 80) {
    return "A";
  }
  if (score >= 60) {
    return "B";
  }
  return "C";
}

export function report(name: string, scores: number[]): string {
  const avg = average(scores);
  return `${name}さんの平均点は${avg.toFixed(1)}点（${toGrade(avg)}）`;
}
