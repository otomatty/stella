// 09-q05 ★総合問題 モジュールに分ける
//
// 教材: https://typescriptbook.jp/reference/import-export-require
//
// 問題
// q05-modules.ts から、型 CartItem と、addItem・cartTotal・cartSummary をこのファイルに移し、名前付き export にする。
// q05-modules-price.ts と q05-modules-format.ts から、使うものを import する。
// 関数の中身は変えないこと。
//
// 前の問題を使う
// 使う問題: q04（ValidationError）
// addItem は、item.quantity が1以上の整数でなければ、q04 の ValidationError を
// new ValidationError("quantity", "数量は1以上の整数にしてください") の形で投げるようにする（元のコードにはない確かめなので足す）。
// ValidationError は "./q04-error" から import する。
// q04 が解けていないと、この問題のテストも通らない

export {};
