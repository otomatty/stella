// 問2 点数の平均を返す。空の配列なら 0
//     例: averageScore([80点, 90点]) → 85
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。

export type Student = { name: string; grade: number; score: number };

export function averageScore(students: readonly Student[]): number {
  if (students.length === 0) {
    return 0;
  }
  let total = 0;
  for (const s of students) {
    total += s.score;
  }
  return total / students.length;
}
