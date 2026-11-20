import { describe, expect, expectTypeOf, test } from "vitest";
import { STATUSES, STATUS_LABELS, type Status, labelOf, nextStatus } from "../src/q07-as-const";

describe("STATUSES", () => {
  test("as const で、中身が型に残る", () => {
    expectTypeOf<typeof STATUSES>().toEqualTypeOf<readonly ["todo", "doing", "done"]>();
    expectTypeOf<Status>().toEqualTypeOf<"todo" | "doing" | "done">();
  });
});

describe("nextStatus", () => {
  test("1つ先のステータスを返す。done は done のまま", () => {
    expect(nextStatus("todo")).toBe("doing");
    expect(nextStatus("doing")).toBe("done");
    expect(nextStatus("done")).toBe("done");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(nextStatus).parameters.toEqualTypeOf<[Status]>();
    expectTypeOf(nextStatus).returns.toEqualTypeOf<Status>();
  });
});

describe("STATUS_LABELS", () => {
  test("値と型", () => {
    expect(STATUS_LABELS).toEqual({ todo: "未着手", doing: "作業中", done: "完了" });
    expectTypeOf<typeof STATUS_LABELS>().toEqualTypeOf<{
      readonly todo: "未着手";
      readonly doing: "作業中";
      readonly done: "完了";
    }>();
  });
});

describe("labelOf", () => {
  test("表示名を返す", () => {
    expect(labelOf("todo")).toBe("未着手");
    expect(labelOf("done")).toBe("完了");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(labelOf).parameters.toEqualTypeOf<[Status]>();
    expectTypeOf(labelOf).returns.toEqualTypeOf<"未着手" | "作業中" | "完了">();
  });
});
