// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems
//
// 関数の中身を書いてください。引数と戻り値の型は書いてあります。
// 変数は const で宣言し、後から値を入れ直す変数だけ let にすること。var は使わない。
// 引数に値を入れ直すことはできない（ESLint の no-param-reassign）。入れ直したいときは let の変数に写してから使う。

// 問15 送料を返す。基本は500円。小計が3000円以上なら0円。会員なら小計に関係なく0円
//     例: shippingFee(2000, false) → 500
export function shippingFee(subtotal: number, isMember: boolean): number {
  // ここに書く
}
