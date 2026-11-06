// 03-q04 判別可能なユニオン型
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 問題
// 1. 図形を表す型 Shape を、次の3つのユニオン型として定義して export してください。
//    kind プロパティで、どの図形かを見分けられるようにする
//    - 円:     kind が "circle"、radius（半径）
//    - 長方形: kind が "rect"、width、height
//    - 三角形: kind が "triangle"、base（底辺）、height
//
// 2. area(shape) を書いてください。面積を返す
//    円は Math.PI × 半径 × 半径、三角形は 底辺 × 高さ ÷ 2
//
// 3. describeShape(shape) を書いてください
//    例: 円（半径 2）、長方形（3 × 4）、三角形（底辺 3・高さ 4）
//
// switch を使うときは、すべての kind の case を書くこと（switch は04章で詳しく扱う）

export type Shape = unknown;

export function area() {}

export function describeShape() {}
