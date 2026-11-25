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

export type PendingOrder = {
  status: "pending";
  id: number;
  amount: number;
};

export type PaidOrder = {
  status: "paid";
  id: number;
  amount: number;
  paidAt: Date;
};

export type ShippedOrder = {
  status: "shipped";
  id: number;
  amount: number;
  paidAt: Date;
  shippedAt: Date;
  trackingNumber: string;
};

export type CancelledOrder = {
  status: "cancelled";
  id: number;
  amount: number;
  reason: string;
};

export type Order = PendingOrder | PaidOrder | ShippedOrder | CancelledOrder;

export type Transition = { ok: true; order: Order } | { ok: false; error: string };

const STATUS_NAMES = {
  pending: "未払い",
  paid: "支払済み",
  shipped: "発送済み",
  cancelled: "キャンセル済み",
} as const;

function fail(order: Order, action: string): Transition {
  return {
    ok: false,
    error: `注文${order.id}は${STATUS_NAMES[order.status]}なので${action}できません`,
  };
}

export function pay(order: Order, paidAt: Date): Transition {
  if (order.status !== "pending") {
    return fail(order, "支払い");
  }
  return { ok: true, order: { ...order, status: "paid", paidAt } };
}

export function ship(order: Order, shippedAt: Date, trackingNumber: string): Transition {
  if (order.status !== "paid") {
    return fail(order, "発送");
  }
  return { ok: true, order: { ...order, status: "shipped", shippedAt, trackingNumber } };
}

export function cancel(order: Order, reason: string): Transition {
  if (order.status === "shipped" || order.status === "cancelled") {
    return fail(order, "キャンセル");
  }
  return { ok: true, order: { status: "cancelled", id: order.id, amount: order.amount, reason } };
}

export function statusText(order: Order): string {
  const head = `注文${order.id}`;
  switch (order.status) {
    case "pending":
      return `${head}: 未払い（${order.amount.toLocaleString("ja-JP")}円）`;
    case "paid":
      return `${head}: 支払済み（${order.amount.toLocaleString("ja-JP")}円）`;
    case "shipped":
      return `${head}: 発送済み（追跡番号 ${order.trackingNumber}）`;
    case "cancelled":
      return `${head}: キャンセル（${order.reason}）`;
  }
}
