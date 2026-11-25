// 問3 点数がいちばん高い生徒を返す。同じなら先の方。空なら undefined
//     例: bestStudent(students) → 佐藤
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。

export type Student = { name: string; grade: number; score: number };

export function bestStudent(students: readonly Student[]): Student | undefined {
  let best: Student | undefined;
  for (const s of students) {
    if (best === undefined || s.score > best.score) {
      best = s;
    }
  }
  return best;
}
