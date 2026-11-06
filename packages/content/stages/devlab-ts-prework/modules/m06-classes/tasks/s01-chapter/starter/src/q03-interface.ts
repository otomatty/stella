// 06-q03 インターフェース
//
// 教材: https://typescriptbook.jp/reference/object-oriented/interface/implementing-interfaces
//       https://typescriptbook.jp/reference/object-oriented/interface/readonly-modifier-in-interfaces
//       https://typescriptbook.jp/reference/object-oriented/interface/interface-vs-type-alias
//
// 問題
// 1. インターフェース Shape を定義して export してください
//    - name: 図形の名前（文字列）。読み取り専用
//    - area(): 面積を返すメソッド
//    - perimeter(): 周りの長さを返すメソッド
//
// 2. Shape を実装する（implements Shape）クラスを2つ書いてください
//    - Circle: コンストラクタで半径 radius を受け取る。name は "円"
//    - Rectangle: コンストラクタで width と height を受け取る。name は "長方形"
//
// 3. totalArea(shapes): 面積の合計を返す。引数は readonly Shape[]
//
// 4. largest(shapes): 面積がいちばん大きい図形を返す。同じなら先の方。空なら undefined
//
// 説明すること（答えは、この下に // のコメントで書く）
// - interface と type のどちらで書いても同じことができる場面で、どちらを選ぶか。その理由

export type Shape = unknown;

export class Circle {}

export class Rectangle {}

export function totalArea() {}

export function largest() {}
