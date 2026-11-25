// 問20 「人数 3、平均 78.3、最高 佐藤（95）」の形にする（平均は小数第1位まで。toFixed(1)）。空なら「人数 0」
//     例: summaryText(students) → "人数 3、平均 78.3、最高 佐藤（95）"
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。

export type Student = { name: string; grade: number; score: number };

export function summaryText(students: readonly Student[]): string {
  let best: Student | undefined;
  let total = 0;
  for (const s of students) {
    total += s.score;
    if (best === undefined || s.score > best.score) {
      best = s;
    }
  }
  if (best === undefined) {
    return "人数 0";
  }
  const average = (total / students.length).toFixed(1);
  return `人数 ${students.length}、平均 ${average}、最高 ${best.name}（${best.score}）`;
}
