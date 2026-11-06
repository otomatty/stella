// 06-q01 クラスの基本
//
// 教材: https://typescriptbook.jp/reference/object-oriented/class/constructor
//       https://typescriptbook.jp/reference/object-oriented/class/fields
//       https://typescriptbook.jp/reference/object-oriented/class/methods
//
// 問題
// 次の2つのクラスを書いてください。フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けること。
//
// 1. Counter
//    - フィールド count（数値）: 今の値
//    - コンストラクタ: 始めの値 start を受け取る。省略したら 0
//    - increment(): 1増やして、増やした後の値を返す
//    - decrement(): 1減らして、減らした後の値を返す。ただし 0 より小さくはしない
//    - reset(): 始めの値に戻す。何も返さない（始めの値を覚えておくフィールドが要る）
//
// 2. Temperature
//    - コンストラクタ: 摂氏 celsius を受け取り、フィールド celsius に入れる
//    - toFahrenheit(): 華氏（摂氏 × 9 ÷ 5 + 32）を返す
//    - isFreezing(): 0 以下なら true
//    - label(): "25℃" の形の文字列を返す

export class Counter {}

export class Temperature {}
