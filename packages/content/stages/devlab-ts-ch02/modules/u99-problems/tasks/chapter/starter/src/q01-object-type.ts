// 02-q01 オブジェクトの型
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names
//
// 問題
// 1. 本を表す型 Book を定義して export してください。プロパティは次の3つ
//    - title: 文字列
//    - author: 文字列
//    - price: 数値
//    （type による型の定義は03章で詳しく扱う）
//
// 2. describeBook(book) を書いてください。「『タイトル』著者（価格円）」の形の文字列を返す。
//    価格は3桁ごとにカンマで区切る
//    例: describeBook({ title: "TypeScript入門", author: "山田", price: 1200 })
//        → "『TypeScript入門』山田（1,200円）"
//
// 3. createBook(title, author, price) を書いてください。Book を返す
//    { title: title } ではなく { title } のように、プロパティ名の省略記法を使うこと

export type Book = unknown;

export function describeBook() {}

export function createBook() {}
