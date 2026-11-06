// 02-q08 ★総合問題 在庫の集計
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       02章のこれまでの教材
//
// 問題
// 商品を表す型 Item は定義済みです。在庫を集計する関数を書いてください。
// 引数の配列は readonly Item[] にし、元の配列や商品のオブジェクトは変えないこと。
//
// 1. 型 CategoryTotals を、インデックス型（キーがカテゴリ名の文字列、値が数値）として定義して export する
//
// 2. outOfStock(items)
//    在庫が0の商品の名前を、配列の順に並べて返す
//
// 3. totalByCategory(items)
//    カテゴリごとの在庫金額（price × stock）の合計を、CategoryTotals で返す
//    例: { 文具: 20000, 飲料: 4500 }
//
// 4. applySale(items, category, percentOff)
//    category の商品だけを percentOff パーセント引きの価格にした、新しい配列を返す。
//    1円未満は切り捨てる。ほかのカテゴリの商品は、そのまま入れる
//    ヒント: 小数の誤差を避けるため、price * (100 - percentOff) / 100 の順で計算する
//
// 5. inventoryReport(items)
//    商品数（items の要素の数）、在庫切れ（在庫が0の商品の数）、在庫金額（price × stock の合計。
//    3桁ごとにカンマで区切る）を、"商品数 4、在庫切れ 1、在庫金額 24,500円" の形の文字列にして返す
//
// 前の問題を使う
// 使う問題: q04（sum）
// 5. の在庫金額は、q04 で書いた sum で合計すること。sum は、このファイルの先頭で import してある。
// q04 が解けていないと、この問題のテストも通らない

import { sum } from "./q04-array-type";

export type Item = {
  name: string;
  category: string;
  price: number;
  stock: number;
};

export type CategoryTotals = unknown;

export function outOfStock() {}

export function totalByCategory() {}

export function applySale() {}

export function inventoryReport() {}
