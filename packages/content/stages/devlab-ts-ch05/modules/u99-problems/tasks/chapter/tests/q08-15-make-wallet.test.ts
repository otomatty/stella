// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeWallet } from "../src/q08-15-make-wallet";
test("問15 makeWallet", () => {
  const wallet = makeWallet(1000);
  expect(wallet.withdraw(300)).toBe(700);
  expect(wallet.deposit(50)).toBe(750);
  expect(() => wallet.withdraw(1000)).toThrow("残高が足りません");
  expect(wallet.balance()).toBe(750);
  expectTypeOf(makeWallet).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(makeWallet).returns.toEqualTypeOf<{
    deposit: (n: number) => number;
    withdraw: (n: number) => number;
    balance: () => number;
  }>();
});
