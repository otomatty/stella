import { describe, expect, expectTypeOf, test } from "vitest";
import { BankAccount } from "../src/q02-access-modifiers";

describe("BankAccount", () => {
  test("入金と出金", () => {
    const account = new BankAccount("A-001", 1000);
    expect(account.id).toBe("A-001");
    expect(account.deposit(500)).toBe(1500);
    expect(account.withdraw(300)).toBe(1200);
    expect(account.getBalance()).toBe(1200);
  });

  test("履歴はコピーを返す", () => {
    const account = new BankAccount("A-002");
    account.deposit(1000);
    account.withdraw(300);
    const history = account.getHistory();
    expect(history).toEqual(["入金 1000", "出金 300"]);
    history.push("いたずら");
    expect(account.getHistory()).toHaveLength(2);
  });

  test("おかしな金額は Error", () => {
    const account = new BankAccount("A-003", 100);
    expect(() => account.deposit(0)).toThrow(Error);
    expect(() => account.withdraw(-1)).toThrow(Error);
    expect(() => account.withdraw(101)).toThrow("残高が足りません");
    expect(() => new BankAccount("A-004", -1)).toThrow(Error);
  });

  test("id は書き換えられない", () => {
    const account = new BankAccount("A-005");
    // @ts-expect-error id は readonly
    account.id = "X";
  });

  test("残高と履歴は外から見えない", () => {
    // @ts-expect-error 残高は private
    expectTypeOf<BankAccount>().toHaveProperty("balance");
    // @ts-expect-error 履歴は private
    expectTypeOf<BankAccount>().toHaveProperty("history");
  });

  test("型", () => {
    expectTypeOf(BankAccount).constructorParameters.toEqualTypeOf<[id: string, initial?: number]>();
    expectTypeOf<BankAccount["id"]>().toEqualTypeOf<string>();
    expectTypeOf<BankAccount["deposit"]>().toEqualTypeOf<(amount: number) => number>();
    expectTypeOf<BankAccount["withdraw"]>().toEqualTypeOf<(amount: number) => number>();
    expectTypeOf<BankAccount["getBalance"]>().toEqualTypeOf<() => number>();
    expectTypeOf<BankAccount["getHistory"]>().toEqualTypeOf<() => string[]>();
  });
});
