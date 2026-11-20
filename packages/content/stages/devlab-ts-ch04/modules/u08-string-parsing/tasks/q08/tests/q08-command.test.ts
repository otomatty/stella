import { describe, expect, expectTypeOf, test } from "vitest";
import { type Command, type RunResult, execute, parseCommand, run, runAll } from "../src/q08-command";

describe("parseCommand", () => {
  test("コマンドを読み取る", () => {
    expect(parseCommand("add 3 5")).toEqual({ op: "add", a: 3, b: 5 });
    expect(parseCommand("  div   10  -2.5 ")).toEqual({ op: "div", a: 10, b: -2.5 });
  });

  test("3つに区切れなければ Error", () => {
    expect(() => parseCommand("add 3")).toThrow("書き方が正しくありません: add 3");
    expect(() => parseCommand("add 1 2 3")).toThrow("書き方が正しくありません: add 1 2 3");
  });

  test("知らない計算なら Error", () => {
    expect(() => parseCommand("pow 2 3")).toThrow("知らない計算です: pow");
  });

  test("数値でなければ Error", () => {
    expect(() => parseCommand("add x 3")).toThrow("数値ではありません: x");
    expect(() => parseCommand("add 3 Infinity")).toThrow("数値ではありません: Infinity");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(parseCommand).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(parseCommand).returns.toEqualTypeOf<Command>();
  });
});

describe("execute", () => {
  test("4つの計算", () => {
    expect(execute({ op: "add", a: 3, b: 5 })).toBe(8);
    expect(execute({ op: "sub", a: 3, b: 5 })).toBe(-2);
    expect(execute({ op: "mul", a: 3, b: 5 })).toBe(15);
    expect(execute({ op: "div", a: 10, b: 4 })).toBe(2.5);
  });

  test("0 で割ると Error", () => {
    expect(() => execute({ op: "div", a: 1, b: 0 })).toThrow("0で割ることはできません");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(execute).parameters.toEqualTypeOf<[Command]>();
    expectTypeOf(execute).returns.toEqualTypeOf<number>();
  });
});

describe("run", () => {
  test("成功と失敗を値で返す", () => {
    expect(run("mul 4 5")).toEqual({ ok: true, value: 20 });
    expect(run("div 1 0")).toEqual({ ok: false, error: "0で割ることはできません" });
    expect(run("hello")).toEqual({ ok: false, error: "書き方が正しくありません: hello" });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(run).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(run).returns.toEqualTypeOf<RunResult>();
  });
});

describe("runAll", () => {
  test("1行ずつ結果を並べる", () => {
    expect(runAll([" add 3 5 ", "sub 1 x", "div 9 3"])).toEqual([
      "add 3 5 = 8",
      "エラー: 数値ではありません: x",
      "div 9 3 = 3",
    ]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(runAll).parameters.toEqualTypeOf<[readonly string[]]>();
    expectTypeOf(runAll).returns.toEqualTypeOf<string[]>();
  });
});
