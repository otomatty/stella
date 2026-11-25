// 問7 点数の高い順に「1位 佐藤」「2位 山田」…と並べた配列を返す
//     例: rankLabels(students) → ["1位 佐藤", "2位 山田"]
// 引数と戻り値には型注釈を付けてください。
// ファイル内に定義済みの Student 型を使ってください。
// 元の配列や生徒のオブジェクトは変更しないでください。
// sort を使う場合は、配列をコピーしてから並べ替えてください。

export type Student = { name: string; grade: number; score: number };

export function rankLabels(students: readonly Student[]): string[] {
  return [...students].sort((a, b) => b.score - a.score).map((s, i) => `${i + 1}位 ${s.name}`);
}
