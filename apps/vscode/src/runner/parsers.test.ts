import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  cleanMessage,
  parseEslintReport,
  parseMsbuildDiagnostics,
  parsePlaywrightReport,
  parsePrettierList,
  parseTrxReport,
  parseVitestReport,
  relativePath,
  relativize,
} from "./parsers.js";

/** フィクスチャは各道具の実際の出力。採取した場所を /work/task に置き換えてある。 */
const ROOT = "/work/task";

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));
}

function textFixture(name: string): string {
  return readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");
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

describe("parseTrxReport", () => {
  const symbolMessage = [
    "Assert.Equal() Failure: Strings differ",
    "           ↓ (pos 0)",
    'Expected: "[a&b]"',
    'Actual:   "<a&b>"',
    "           ↑ (pos 0)",
  ].join("\n");

  it("失敗と成功を読み、文字参照と改行を戻す", () => {
    const tests = parseTrxReport(textFixture("dotnet-test.trx"));
    expect(tests?.map((test) => [test.name, test.status, test.file])).toEqual([
      ['記号 <a> & "b" を囲む', "failed", undefined],
      ["Q11 1 から N の合計(n: 1, expected: 1)", "failed", undefined],
      ["Q11 1 から N の合計(n: 4, expected: 10)", "failed", undefined],
      ["Q01 1 から N", "passed", undefined],
    ]);
    expect(tests?.[0]?.message).toBe(symbolMessage);
    expect(tests?.[1]?.message).toBe(
      "Assert.Equal() Failure: Values differ\nExpected: 1\nActual:   0",
    );
    expect(tests?.[2]?.message).toBe(
      "Assert.Equal() Failure: Values differ\nExpected: 10\nActual:   6",
    );
    expect(tests?.[3]?.message).toBeUndefined();
    expect(tests?.[0]?.message).not.toContain("\r");
    expect(tests?.[0]?.message).not.toContain("AnswersTests.cs");
  });

  it("TestRun が無ければ null", () => {
    expect(parseTrxReport('<UnitTestResult testName="a" outcome="Passed" />')).toBeNull();
  });

  it("UnitTestResult が無ければ空配列", () => {
    expect(parseTrxReport("<TestRun><Results></Results></TestRun>")).toEqual([]);
  });

  it("自己終了の要素と NotExecuted を読む", () => {
    const xml = `<TestRun><Results>
      <UnitTestResult testName="done" outcome="Passed" />
      <UnitTestResult outcome="NotExecuted" testName="later" />
    </Results></TestRun>`;
    expect(parseTrxReport(xml)).toEqual([
      { name: "done", status: "passed" },
      { name: "later", status: "skipped" },
    ]);
  });
});

describe("parseMsbuildDiagnostics", () => {
  const root = "C:\\Users\\山田 太郎\\web-training\\csharp\\u02\\t01";
  const compile = `${root}\\src\\Answers.cs(5,22): error CS1002: ; が必要です [${root}\\Task.csproj]`;

  it("課題フォルダーの中は相対パスにし、外・警告・NU1004・重複は読まない", () => {
    const output = [
      compile,
      compile,
      `${root}\\src\\Answers.cs(5,22): warning CS0219: 未使用です [${root}\\Task.csproj]`,
      `${root}\\Task.csproj : error NU1004: パッケージ参照が lock ファイルと一致しません`,
      "C:\\Users\\山田 太郎\\other\\Foo.cs(1,1): error CS1002: ; が必要です",
    ].join("\n");
    expect(parseMsbuildDiagnostics(output, root, "win32")).toEqual([
      {
        file: "src/Answers.cs",
        line: 5,
        column: 22,
        ruleId: "CS1002",
        message: "; が必要です",
        severity: "error",
      },
      {
        file: "Foo.cs",
        line: 1,
        column: 1,
        ruleId: "CS1002",
        message: "; が必要です",
        severity: "error",
      },
    ]);
  });

  it("POSIX のパスを相対パスにする", () => {
    const posixRoot = "/work/task";
    const output = `${posixRoot}/src/Answers.cs(3,1): error CS0103: 名前が存在しません [${posixRoot}/Task.csproj]`;
    expect(parseMsbuildDiagnostics(output, posixRoot, "linux")).toEqual([
      {
        file: "src/Answers.cs",
        line: 3,
        column: 1,
        ruleId: "CS0103",
        message: "名前が存在しません",
        severity: "error",
      },
    ]);
  });
});
