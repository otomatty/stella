// 問4 grade 年生の生徒だけを返す
//     例: inGrade(students, 1) → 1年生の配列
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。

export type Student = { name: string; grade: number; score: number };

export function inGrade(students: readonly Student[], grade: number): Student[] {
  return students.filter((s) => s.grade === grade);
}
