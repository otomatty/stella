import { describe, expect, expectTypeOf, test } from "vitest";
import { type Shape, type TaskStatus, area, assertNever, statusLabel } from "../src/q07-never";

describe("assertNever", () => {
  test("呼ばれたら Error を投げる", () => {
    expect(() => assertNever("x" as never)).toThrow(Error);
  });

  test("引数と戻り値の型は never", () => {
    expectTypeOf(assertNever).parameters.toEqualTypeOf<[never]>();
    // 戻り値が never でなければ、この関数の戻り値の型注釈 never と合わずに型エラーになる
    const call = (value: never): never => assertNever(value);
    expect(() => call("x" as never)).toThrow(Error);
    // @ts-expect-error never 以外の値は渡せない
    expectTypeOf(assertNever).toBeCallableWith("x");
  });
});

describe("area", () => {
  test("図形ごとの面積", () => {
    expect(area({ kind: "circle", radius: 1 })).toBeCloseTo(Math.PI);
    expect(area({ kind: "square", size: 3 })).toBe(9);
    expect(area({ kind: "triangle", base: 3, height: 4 })).toBe(6);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(area).parameters.toEqualTypeOf<[Shape]>();
    expectTypeOf(area).returns.toEqualTypeOf<number>();
  });
});

describe("statusLabel", () => {
  test("状態ごとの表示名", () => {
    expect(statusLabel("todo")).toBe("未着手");
    expect(statusLabel("doing")).toBe("作業中");
    expect(statusLabel("review")).toBe("確認待ち");
    expect(statusLabel("done")).toBe("完了");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(statusLabel).parameters.toEqualTypeOf<[TaskStatus]>();
    expectTypeOf(statusLabel).returns.toEqualTypeOf<string>();
  });
});
