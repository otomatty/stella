// 問8 学年ごとにまとめる。キーは学年の文字列（"1"、"2" …）
//     例: groupByGrade(students) → { "1": [...], "2": [...] }
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。

export type Student = { name: string; grade: number; score: number };

export function groupByGrade(students: readonly Student[]): { [grade: string]: Student[] } {
  const groups: { [grade: string]: Student[] } = {};
  for (const s of students) {
    const key = String(s.grade);
    groups[key] = [...(groups[key] ?? []), s];
  }
  return groups;
}
