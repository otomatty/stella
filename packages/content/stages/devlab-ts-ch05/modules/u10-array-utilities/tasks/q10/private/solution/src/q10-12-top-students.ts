// 問12 点数の高い順に n 人を返す
//     例: topStudents(students, 1) → [佐藤]
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。
// sort を使う場合は、配列をコピーしてから並べ替えてください。

export type Student = { name: string; grade: number; score: number };

export function topStudents(students: readonly Student[], n: number): Student[] {
  return [...students].sort((a, b) => b.score - a.score).slice(0, n);
}
