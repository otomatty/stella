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
