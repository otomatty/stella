// 問10 学年ごとの平均点（小数第1位までに四捨五入）。キーは学年の文字列
//     例: averageByGrade(students) → { "1": 70, "2": 95 }
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。

export type Student = { name: string; grade: number; score: number };

export function averageByGrade(students: readonly Student[]): { [grade: string]: number } {
  const totals: { [grade: string]: number } = {};
  const counts: { [grade: string]: number } = {};
  for (const s of students) {
    const key = String(s.grade);
    totals[key] = (totals[key] ?? 0) + s.score;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const result: { [grade: string]: number } = {};
  for (const [key, total] of Object.entries(totals)) {
    result[key] = Math.round((total / (counts[key] ?? 1)) * 10) / 10;
  }
  return result;
}
