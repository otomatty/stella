// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//
// ★総合問題（配列のユーティリティ）で使う書き方を繰り返します。生徒を表す型 Student は定義済みです。
// 引数の配列は readonly Student[] にし、元の配列や生徒のオブジェクトは変えないこと。引数と戻り値には型注釈を付けること。
// map、filter、some、every、find、sort（コピーしてから）などを使ってよい。

export type Student = { name: string; grade: number; score: number };

// 問15 全員が border 点以上なら true（every を使う）
//     例: everyonePassed(students, 60) → true
export function everyonePassed() {}
