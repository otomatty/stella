// 01-q01 letとconst
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems
//
// 問題
// 買い物かごの合計金額を計算する関数 checkout を完成させてください。
//
// 1. 小計は price × quantity
// 2. 小計から coupon（円）を引く。ただし0円より小さくはしない
// 3. 2の金額が5000円以上なら送料は無料。5000円未満なら送料500円を足す
// 4. 合計金額を返す
//
// 条件
// - 変数は const で宣言する。後から値を入れ直す変数だけ let にする
// - var は使わない
// （この条件は、書き方のチェック（ESLint）でも確かめます）

export function checkout(price: number, quantity: number, coupon: number): number {
  // ここに書く
}
