// 問19 name の生徒の点数だけを score にした新しい配列を返す。元の配列と生徒は変えない
//     例: updateScore(students, "山田", 90) → 山田の点数が 90 の新しい配列
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。

export type Student = { name: string; grade: number; score: number };

export function updateScore(students: readonly Student[], name: string, score: number): Student[] {
  return students.map((s) => (s.name === name ? { ...s, score } : s));
}
