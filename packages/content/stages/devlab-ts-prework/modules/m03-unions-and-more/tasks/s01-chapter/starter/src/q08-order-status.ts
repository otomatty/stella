// 03-q08 ★総合問題 注文の状態遷移
//
// 教材: 03章のこれまでの教材
//
// 問題
// ネットショップの注文を、判別可能なユニオン型で表し、状態を進める関数を書いてください。
// どの関数も、元の注文オブジェクトは変えずに、新しいオブジェクトを作って返すこと。
//
// 1. 次の型を定義して export する
//    - PendingOrder（未払い）:    status が "pending"、id（数値）、amount（金額。数値）
//    - PaidOrder（支払済み）:     status が "paid"、id、amount、paidAt（支払日時。Date）
//    - ShippedOrder（発送済み）:  status が "shipped"、id、amount、paidAt、shippedAt（Date）、trackingNumber（追跡番号。文字列）
//    - CancelledOrder（キャンセル）: status が "cancelled"、id、amount、reason（理由。文字列）
//    - Order: 上の4つのユニオン型
//    - Transition: 状態を進めた結果。成功は { ok: true; order: Order }、失敗は { ok: false; error: string }
//
// 2. pay(order, paidAt)
//    未払いの注文だけを、支払済みにする。それ以外は失敗を返す
//
// 3. ship(order, shippedAt, trackingNumber)
//    支払済みの注文だけを、発送済みにする。それ以外は失敗を返す
//
// 4. cancel(order, reason)
//    未払いか支払済みの注文だけを、キャンセルにする。発送済みとキャンセル済みは失敗を返す
//
// 5. statusText(order)
//    未払い:     "注文1: 未払い（1,200円）"
//    支払済み:   "注文1: 支払済み（1,200円）"
//    発送済み:   "注文1: 発送済み（追跡番号 ABC123）"
//    キャンセル: "注文1: キャンセル（在庫切れ）"
//
// 失敗のときの error には、何がなぜできないのかが分かる文を書く
// （例: "注文1は発送済みなのでキャンセルできません"）

export type PendingOrder = unknown;
export type PaidOrder = unknown;
export type ShippedOrder = unknown;
export type CancelledOrder = unknown;
export type Order = unknown;
export type Transition = unknown;

export function pay() {}

export function ship() {}

export function cancel() {}

export function statusText() {}
