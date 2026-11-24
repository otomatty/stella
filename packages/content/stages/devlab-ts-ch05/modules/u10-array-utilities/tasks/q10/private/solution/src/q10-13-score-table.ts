// 問13 { 名前: 点数 } のオブジェクトを返す
//     例: scoreTable(students) → { 山田: 80, 佐藤: 95 }
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。

export type Student = { name: string; grade: number; score: number };

export function scoreTable(students: readonly Student[]): { [name: string]: number } {
  const table: { [name: string]: number } = {};
  for (const s of students) {
    table[s.name] = s.score;
  }
  return table;
}
