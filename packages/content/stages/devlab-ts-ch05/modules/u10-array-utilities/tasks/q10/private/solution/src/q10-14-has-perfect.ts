// 問14 100点の生徒が1人でもいれば true（some を使う）
//     例: hasPerfect(students) → false
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。

export type Student = { name: string; grade: number; score: number };

export function hasPerfect(students: readonly Student[]): boolean {
  return students.some((s) => s.score === 100);
}
