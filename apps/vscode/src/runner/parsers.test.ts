import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  cleanMessage,
  parseEslintReport,
  parsePlaywrightReport,
  parsePrettierList,
  parseVitestReport,
  relativePath,
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

  it("すべて省略されたテストは通さない", () => {
    const parsed = parseVitestReport(
      {
        success: true,
        testResults: [
          {
            name: `${ROOT}/a.test.js`,
            status: "skipped",
            assertionResults: [{ title: "a", status: "skipped" }],
          },
        ],
      },
      ROOT,
    );
    expect(parsed?.status).toBe("failed");
    expect(parsed?.summary).toMatch(/すべて省略/);
    const playwright = parsePlaywrightReport(
      {
        suites: [
          {
            title: "a.spec.js",
            specs: [{ title: "x", file: "a.spec.js", tests: [{ status: "skipped", results: [] }] }],
          },
        ],
        errors: [],
      },
      ROOT,
    );
    expect(playwright?.status).toBe("failed");
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

  it("日本語・空白を含むパスは、符号化された file URL からも外す", () => {
    const root = "C:\\Users\\山田 太郎\\web-training\\javascript-basics\\u01\\q01";
    const message =
      "Error: Cannot find module 'file:///C:/Users/%E5%B1%B1%E7%94%B0%20%E5%A4%AA%E9%83%8E/web-training/javascript-basics/u01/q01/src/a.js' imported from C:\\Users\\山田 太郎\\web-training\\javascript-basics\\u01\\q01\\tests\\a.test.js";
    expect(relativize(message, root)).toBe(
      "Error: Cannot find module 'src/a.js' imported from tests\\a.test.js",
    );
    expect(relativize("at /Users/山田/課題/src/a.js", "/Users/山田/課題")).toBe("at src/a.js");
    expect(relativize("file:///Users/%E5%B1%B1%E7%94%B0/q01/src/a.js", "/Users/山田/q01")).toBe(
      "src/a.js",
    );
  });

  describe("フォルダー名に #・?・%・空白・日本語を含む", () => {
    // 符号化の違う file URL は、どの道具がどの書き方で出しても外す。
    const cases = [
      {
        os: "Windows",
        root: "C:\\Users\\山田 太郎\\web#1\\100%完了",
        forms: [
          // Node.js の pathToFileURL (`#`・`%` も符号化する)
          "file:///C:/Users/%E5%B1%B1%E7%94%B0%20%E5%A4%AA%E9%83%8E/web%231/100%25%E5%AE%8C%E4%BA%86",
          // encodeURI と同じ (`#` はそのまま)
          "file:///C:/Users/%E5%B1%B1%E7%94%B0%20%E5%A4%AA%E9%83%8E/web#1/100%25%E5%AE%8C%E4%BA%86",
          // ドライブ文字が小文字
          "file:///c:/Users/%E5%B1%B1%E7%94%B0%20%E5%A4%AA%E9%83%8E/web%231/100%25%E5%AE%8C%E4%BA%86",
          // 符号化しない
          "file:///C:/Users/山田 太郎/web#1/100%完了",
          "C:/Users/山田 太郎/web#1/100%完了",
        ],
        native: "C:\\Users\\山田 太郎\\web#1\\100%完了\\tests\\a.test.js",
      },
      {
        os: "POSIX",
        root: "/home/山田 太郎/課題 #1?/100%完了",
        forms: [
          "file:///home/%E5%B1%B1%E7%94%B0%20%E5%A4%AA%E9%83%8E/%E8%AA%B2%E9%A1%8C%20%231%3F/100%25%E5%AE%8C%E4%BA%86",
          "file:///home/%E5%B1%B1%E7%94%B0%20%E5%A4%AA%E9%83%8E/%E8%AA%B2%E9%A1%8C%20#1?/100%25%E5%AE%8C%E4%BA%86",
          "file:///home/山田 太郎/課題 #1?/100%完了",
        ],
        native: "/home/山田 太郎/課題 #1?/100%完了/tests/a.test.js",
      },
    ];

    it.each(cases)("$os: どの書き方の file URL も、元のパスも外す", ({ root, forms, native }) => {
      for (const form of forms) {
        const message = `Error: Cannot find module '${form}/src/a.js' imported from ${native}`;
        const cleaned = relativize(message, root);
        expect(cleaned).toMatch(
          /^Error: Cannot find module 'src\/a\.js' imported from tests.a\.test\.js$/,
        );
        expect(cleaned).not.toContain("山田");
        expect(cleaned).not.toContain("%E5%B1%B1");
      }
    });

    it.each(cases)("$os: % を含む名前でも、似た別のフォルダーは消さない", ({ root }) => {
      // `100%完了` を符号化の目印と取り違えて、別のフォルダー (`100%25完了`) まで消さない。
      const other = root.replace("100%完了", "100%25完了");
      expect(relativize(`${other}/src/a.js`, root)).toBe(`${other}/src/a.js`);
    });
  });

  it("符号化できない名前 (対にならないサロゲート) のフォルダーでも止まらない", () => {
    expect(relativize("at C:\\a\uD800\\src\\x.js", "C:\\a\uD800")).toBe("at src\\x.js");
  });

  it("ドライブ文字の大小が違っても課題フォルダーと分かる", () => {
    // VS Code の fsPath は c:、道具の出力は C: になることがある。
    expect(relativize("at C:\\work\\task\\src\\a.js", "c:\\work\\task")).toBe("at src\\a.js");
    expect(relativize("file:///c:/work/task/src/a.js", "C:\\work\\task")).toBe("src/a.js");
  });
});

describe("relativePath", () => {
  it("Windows の日本語のパスと、ドライブ文字の大小違いを相対パスにする", () => {
    const root = "c:\\Users\\山田 太郎\\web-training\\dom-basics\\u02\\q03";
    expect(
      relativePath("C:/Users/山田 太郎/web-training/dom-basics/u02/q03/tests/a.test.js", root),
    ).toBe("tests/a.test.js");
    expect(relativePath(`${root}\\tests\\a.test.js`, root)).toBe("tests/a.test.js");
  });

  it("課題フォルダーの外のパスは、区切りだけをそろえて返す", () => {
    expect(relativePath("D:\\other\\a.js", "C:\\work\\task")).toBe("D:/other/a.js");
    expect(relativePath("/work/task2/a.js", "/work/task")).toBe("/work/task2/a.js");
  });

  it("行数を絞る", () => {
    expect(cleanMessage("1\n2\n3\n4", ROOT, 2)).toBe("1\n2");
  });
});
