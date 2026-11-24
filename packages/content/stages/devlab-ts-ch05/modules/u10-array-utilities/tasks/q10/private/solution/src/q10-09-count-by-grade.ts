// 問9 学年ごとの人数。キーは学年の文字列
//     例: countByGrade(students) → { "1": 2, "2": 1 }
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。

export type Student = { name: string; grade: number; score: number };

export function countByGrade(students: readonly Student[]): { [grade: string]: number } {
  const counts: { [grade: string]: number } = {};
  for (const s of students) {
    const key = String(s.grade);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
