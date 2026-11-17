import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type CancelledOrder,
  type Order,
  type PaidOrder,
  type PendingOrder,
  type ShippedOrder,
  type Transition,
  cancel,
  pay,
  ship,
  statusText,
} from "../src/q08-order-status";

const paidAt = new Date("2026-12-01T10:00:00Z");
const shippedAt = new Date("2026-12-02T15:00:00Z");

const pending: PendingOrder = { status: "pending", id: 1, amount: 1200 };
const paid: PaidOrder = { status: "paid", id: 1, amount: 1200, paidAt };
const shipped: ShippedOrder = {
  status: "shipped",
  id: 1,
  amount: 1200,
  paidAt,
  shippedAt,
  trackingNumber: "ABC123",
};
const cancelled: CancelledOrder = { status: "cancelled", id: 1, amount: 1200, reason: "在庫切れ" };

describe("型", () => {
  test("4つの注文の型", () => {
    expectTypeOf<PendingOrder>().toEqualTypeOf<{ status: "pending"; id: number; amount: number }>();
    expectTypeOf<PaidOrder>().toEqualTypeOf<{
      status: "paid";
      id: number;
      amount: number;
      paidAt: Date;
    }>();
    expectTypeOf<ShippedOrder>().toEqualTypeOf<{
      status: "shipped";
      id: number;
      amount: number;
      paidAt: Date;
      shippedAt: Date;
      trackingNumber: string;
    }>();
    expectTypeOf<CancelledOrder>().toEqualTypeOf<{
      status: "cancelled";
      id: number;
      amount: number;
      reason: string;
    }>();
  });

  test("Order と Transition の型", () => {
    expectTypeOf<Order>().toEqualTypeOf<PendingOrder | PaidOrder | ShippedOrder | CancelledOrder>();
    expectTypeOf<Transition>().toEqualTypeOf<
      { ok: true; order: Order } | { ok: false; error: string }
    >();
  });
});

describe("pay", () => {
  test("未払いなら支払済みにする", () => {
    expect(pay(pending, paidAt)).toEqual({ ok: true, order: paid });
  });

  test("未払い以外は失敗", () => {
    for (const order of [paid, shipped, cancelled]) {
      const result = pay(order, paidAt);
      expect(result.ok).toBe(false);
    }
  });

  test("元の注文は変えない", () => {
    const order: PendingOrder = { status: "pending", id: 1, amount: 1200 };
    pay(order, paidAt);
    expect(order).toEqual(pending);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(pay).parameters.toEqualTypeOf<[Order, Date]>();
    expectTypeOf(pay).returns.toEqualTypeOf<Transition>();
  });
});

describe("ship", () => {
  test("支払済みなら発送済みにする", () => {
    expect(ship(paid, shippedAt, "ABC123")).toEqual({ ok: true, order: shipped });
  });

  test("支払済み以外は失敗", () => {
    for (const order of [pending, shipped, cancelled]) {
      expect(ship(order, shippedAt, "ABC123").ok).toBe(false);
    }
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(ship).parameters.toEqualTypeOf<[Order, Date, string]>();
    expectTypeOf(ship).returns.toEqualTypeOf<Transition>();
  });
});

describe("cancel", () => {
  test("未払いと支払済みはキャンセルにする", () => {
    expect(cancel(pending, "在庫切れ")).toEqual({ ok: true, order: cancelled });
    expect(cancel(paid, "在庫切れ")).toEqual({ ok: true, order: cancelled });
  });

  test("発送済みとキャンセル済みは失敗", () => {
    expect(cancel(shipped, "在庫切れ").ok).toBe(false);
    expect(cancel(cancelled, "在庫切れ").ok).toBe(false);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(cancel).parameters.toEqualTypeOf<[Order, string]>();
    expectTypeOf(cancel).returns.toEqualTypeOf<Transition>();
  });
});

describe("statusText", () => {
  test("状態ごとの表示", () => {
    expect(statusText(pending)).toBe("注文1: 未払い（1,200円）");
    expect(statusText(paid)).toBe("注文1: 支払済み（1,200円）");
    expect(statusText(shipped)).toBe("注文1: 発送済み（追跡番号 ABC123）");
    expect(statusText(cancelled)).toBe("注文1: キャンセル（在庫切れ）");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(statusText).parameters.toEqualTypeOf<[Order]>();
    expectTypeOf(statusText).returns.toEqualTypeOf<string>();
  });
});
