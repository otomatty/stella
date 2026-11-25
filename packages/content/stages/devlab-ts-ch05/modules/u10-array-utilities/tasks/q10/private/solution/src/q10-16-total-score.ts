// 問16 点数の合計
//     例: totalScore(students) → 235
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。

export type Student = { name: string; grade: number; score: number };

export function totalScore(students: readonly Student[]): number {
  let total = 0;
  for (const s of students) {
    total += s.score;
  }
  return total;
}
