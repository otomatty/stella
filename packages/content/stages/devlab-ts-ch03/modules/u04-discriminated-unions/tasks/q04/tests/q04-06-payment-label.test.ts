// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { paymentLabel, type Payment } from "../src/q04-06-payment-label";
test("問6 paymentLabel", () => {
  expect(paymentLabel({ method: "cash" })).toBe("現金");
  expect(paymentLabel({ method: "card", cardNumber: "4111111111111234" })).toBe(
    "カード（末尾1234）",
  );
  expect(paymentLabel({ method: "bank", bankName: "みらい銀行" })).toBe("振込（みらい銀行）");
  expectTypeOf(paymentLabel).parameters.toEqualTypeOf<[Payment]>();
  expectTypeOf(paymentLabel).returns.toEqualTypeOf<string>();
});
