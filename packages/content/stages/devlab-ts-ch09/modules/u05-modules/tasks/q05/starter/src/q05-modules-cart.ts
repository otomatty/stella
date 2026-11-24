// 問題
// q05-modules.ts から、型 CartItem と、addItem・cartTotal・cartSummary をこのファイルに移し、名前付き export にする。
// q05-modules-price.ts と q05-modules-format.ts から、使うものを import する。
// 関数の中身は変えないこと。
//
// このファイルに書くクラス
// ValidationError は Error を継承する。constructor(field, message) で、どの項目のエラーかを表す
// field（文字列）を readonly で持つ。name は "ValidationError" にする。
// テストがこのファイルから読み込めるように、名前付き export にする。
// addItem は、item.quantity が1以上の整数でなければ、
// new ValidationError("quantity", "数量は1以上の整数にしてください") を投げる（元のコードにはない確かめなので足す）。

export class ValidationError {}
