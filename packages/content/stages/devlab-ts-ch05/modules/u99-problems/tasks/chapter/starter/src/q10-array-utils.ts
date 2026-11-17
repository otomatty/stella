// 05-q10 ★総合問題 配列のユーティリティ
//
// 教材: 05章のこれまでの教材
//
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
// 前の問題を使う
// 使う問題: q02（clamp）、q05（sumAll）
// - topN の n は、q02 の clamp で 0 以上・生徒の人数以下に収めてから使う
// - averageBy の点数の合計は、q05 の sumAll で出す
// どちらも、このファイルの先頭で import してある。前の問題が解けていないと、この問題のテストも通らない

import { clamp } from "./q02-params-return";
import { sumAll } from "./q05-rest-params";

export type Student = { name: string; grade: number; score: number };

export function groupBy() {}

export function countBy() {}

export function partition() {}

export function topN() {}

export function averageBy() {}
