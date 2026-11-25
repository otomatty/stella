// 問題
// 生徒を表す型 Student は定義済みです。生徒の配列を集計する関数を書いてください。
// 引数の配列は readonly Student[] にし、元の配列や生徒のオブジェクトは変えないこと。引数と戻り値には型注釈を付けること。
//
// 1. groupBy(students, keyFn)
//    keyFn(生徒) が返す文字列ごとに、生徒をまとめる。戻り値は { [key: string]: Student[] }
//    例: groupBy(students, (s) => `${s.grade}年`) → { "1年": [...], "2年": [...] }
//
// 2. countBy(students, keyFn)
//    keyFn(生徒) が返す文字列ごとに、人数を数える。戻り値は { [key: string]: number }
//
// 3. partition(students, predicate)
//    predicate が true の生徒と false の生徒に分け、[true の配列, false の配列] を返す
//
// 4. topN(students, n)
//    点数の高い順に n 人を返す。同じ点数なら元の順のまま。n が負なら空の配列、人数より多ければ全員
//
// 5. averageBy(students, keyFn)
//    keyFn(生徒) が返す文字列ごとに、点数の平均を小数第1位までに四捨五入して返す。戻り値は { [key: string]: number }
//    groupBy を使うと短く書ける
//
// このファイルに書く関数（export は不要）
// - clamp(value, min, max): 数値の value を min 以上 max 以下に収めて返す。
//   min が max より大きければ Error を投げる。topN の n を 0 以上・生徒の人数以下に収めるときに使う。
// - sumAll(...numbers): 数値を残余引数で受け取り、すべての合計を返す。引数がなければ 0。
//   averageBy で点数の合計を出すときに使う。

function clamp() {}

function sumAll() {}

export type Student = { name: string; grade: number; score: number };

export function groupBy() {}

export function countBy() {}

export function partition() {}

export function topN() {}

export function averageBy() {}
