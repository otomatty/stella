import { describe, expect, test } from "vitest";
import { Report, SalesReport, TodoReport } from "../src/e01-abstract-class";

describe("Report", () => {
  test("抽象クラスは new できない", () => {
    const make = () => {
      // @ts-expect-error 抽象クラスからは new できない
      new Report();
    };
    expect(typeof make).toBe("function");
  });

  test("子クラスは Report として扱える", () => {
    const reports: Report[] = [new SalesReport([100]), new TodoReport([])];
    expect(reports.map((r) => r.title())).toEqual(["売上レポート", "ToDo"]);
  });
});

describe("SalesReport", () => {
  test("render", () => {
    expect(new SalesReport([100, 200, 300]).render()).toBe("# 売上レポート\n- 件数 3\n- 合計 600");
  });
});

describe("TodoReport", () => {
  test("render", () => {
    expect(new TodoReport(["買い物", "掃除"]).render()).toBe("# ToDo\n- 買い物\n- 掃除");
    expect(new TodoReport([]).render()).toBe("# ToDo\n- なし");
  });
});
