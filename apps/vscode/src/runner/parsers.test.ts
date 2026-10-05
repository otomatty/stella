import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  cleanMessage,
  parseEslintReport,
  parsePlaywrightReport,
  parsePrettierList,
  parseVitestReport,
  relativize,
} from "./parsers.js";

/** フィクスチャは各道具の実際の出力。採取した場所を /work/task に置き換えてある。 */
const ROOT = "/work/task";

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));
}

describe("parseVitestReport", () => {
  it("失敗したテストと通ったテストを読む", () => {
    const parsed = parseVitestReport(fixture("vitest.json"), ROOT);
    expect(parsed?.status).toBe("failed");
    expect(parsed?.summary).toBe("2 件中 1 件が通りました");
    expect(parsed?.tests.map((t) => [t.name, t.file, t.status])).toEqual([
      ["selectAtLeast › k 以上を選ぶ", "tests/filter.test.js", "failed"],
      ["selectAtLeast › 空配列", "tests/filter.test.js", "passed"],
    ]);
    const message = parsed?.tests[0]?.message ?? "";
    expect(message).toContain("expected [ 7 ] to deeply equal [ 5, 7 ]");
    // スタックトレースと絶対パスは受講者に見せない。
    expect(message).not.toContain(" at ");
    expect(message).not.toContain(ROOT);
  });

  it("テストファイルが読み込めないときは失敗として出す", () => {
    const parsed = parseVitestReport(fixture("vitest-broken.json"), ROOT);
    expect(parsed?.status).toBe("failed");
    expect(parsed?.tests).toEqual([
      {
        name: "tests2/broken.test.js を読み込めませんでした",
        file: "tests2/broken.test.js",
        status: "failed",
        message: "Cannot find module '../src/missing.js' imported from tests2/broken.test.js",
      },
    ]);
  });

  it("テストが 1 件も無ければ環境の問題 (配布ファイルの不足)", () => {
    expect(parseVitestReport(fixture("vitest-none.json"), ROOT)?.status).toBe("error");
  });

  it("形が違えば null", () => {
    expect(parseVitestReport({}, ROOT)).toBeNull();
    expect(parseVitestReport(undefined, ROOT)).toBeNull();
  });

  it("全部通っていても success が false なら失敗にする", () => {
    const parsed = parseVitestReport(
      {
        success: false,
        testResults: [
          {
            name: `${ROOT}/a.test.js`,
            status: "passed",
            assertionResults: [{ title: "a", status: "passed" }],
          },
        ],
      },
      ROOT,
    );
    expect(parsed?.status).toBe("failed");
  });
});

describe("parsePlaywrightReport", () => {
  it("describe の題名をつないで、失敗の色指定を外す", () => {
    const parsed = parsePlaywrightReport(fixture("pw.json"), ROOT);
    expect(parsed?.status).toBe("failed");
    expect(parsed?.tests.map((t) => [t.name, t.file, t.status])).toEqual([
      ["一覧 › 合計を出す", "sample.spec.js", "passed"],
      ["一覧 › 間違い", "sample.spec.js", "failed"],
    ]);
    const message = parsed?.tests[1]?.message ?? "";
    expect(message).toContain("Expected: 3");
    expect(message).not.toMatch(/\[\d+m/);
  });

  it("テストを始められなかったときは環境の問題", () => {
    const parsed = parsePlaywrightReport(
      { suites: [], errors: [{ message: "Error: webServer did not start" }] },
      ROOT,
    );
    expect(parsed?.status).toBe("error");
    expect(parsed?.tests[0]?.message).toBe("Error: webServer did not start");
  });
});

describe("parseEslintReport", () => {
  it("エラーと警告を数え、相対パスにする", () => {
    const parsed = parseEslintReport(fixture("eslint.json"), ROOT);
    expect(parsed).toEqual({
      status: "failed",
      summary: "エラー 1 件・警告 0 件",
      lint: [
        {
          file: "src/filter.js",
          line: 8,
          column: 5,
          ruleId: "no-unused-vars",
          message: "'unused' is assigned a value but never used.",
          severity: "error",
        },
      ],
    });
  });

  it("警告だけなら通す", () => {
    const parsed = parseEslintReport(
      [{ filePath: `${ROOT}/a.js`, messages: [{ severity: 1, message: "w", line: 1, column: 1 }] }],
      ROOT,
    );
    expect(parsed?.status).toBe("passed");
  });
});

describe("parsePrettierList", () => {
  it("ファイル名だけを拾う", () => {
    expect(parsePrettierList("./src/a.js\r\nsrc/b.css\n[warn] something\n")).toEqual([
      "src/a.js",
      "src/b.css",
    ]);
  });
});

describe("relativize / cleanMessage", () => {
  it("Windows のパスと file URL も相対にする", () => {
    expect(relativize("at C:\\work\\task\\src\\a.js", "C:\\work\\task")).toBe("at src\\a.js");
    expect(relativize("file:///C:/work/task/src/a.js", "C:\\work\\task")).toBe("src/a.js");
  });

  it("行数を絞る", () => {
    expect(cleanMessage("1\n2\n3\n4", ROOT, 2)).toBe("1\n2");
  });
});
