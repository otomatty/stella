// 問1 名前の配列を返す
//     例: namesOf(students) → ["山田", "佐藤", "鈴木"]
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。

export type Student = { name: string; grade: number; score: number };

export function namesOf(students: readonly Student[]): string[] {
  return students.map((s) => s.name);
}
