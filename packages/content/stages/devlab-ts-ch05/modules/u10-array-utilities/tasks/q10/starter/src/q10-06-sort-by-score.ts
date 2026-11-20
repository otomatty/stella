// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//
// ★総合問題（配列のユーティリティ）で使う書き方を繰り返します。生徒を表す型 Student は定義済みです。
// 引数の配列は readonly Student[] にし、元の配列や生徒のオブジェクトは変えないこと。引数と戻り値には型注釈を付けること。
// map、filter、some、every、find、sort（コピーしてから）などを使ってよい。

export type Student = { name: string; grade: number; score: number };

// 問6 点数の高い順に並べた新しい配列を返す。同じ点数なら元の順
//     例: sortByScore(students) → 高い順の配列
export function sortByScore() {}
