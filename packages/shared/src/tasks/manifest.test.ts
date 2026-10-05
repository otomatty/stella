import { describe, expect, it } from "vitest";
import { isSafeRelativePattern, parseTaskManifest } from "./manifest.js";

function base(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "javascript-data-basics/u03-filter/q01",
    title: "整数から k 以上を選ぶ",
    kind: "basic",
    runner: "node-test",
    submit: { files: ["src/filter.js"] },
    ...overrides,
  };
}

describe("parseTaskManifest", () => {
  it("最小の定義に既定値を埋める", () => {
    const result = parseTaskManifest(base());
    expect(result).toEqual({
      ok: true,
      manifest: {
        schemaVersion: 1,
        id: "javascript-data-basics/u03-filter/q01",
        title: "整数から k 以上を選ぶ",
        kind: "basic",
        runner: "node-test",
        submit: { files: ["src/filter.js"] },
        protected: [],
        checks: { lint: false, format: false },
      },
    });
  });

  it("protected・checks・environment を読む", () => {
    const result = parseTaskManifest(
      base({
        protected: ["tests/**", "vitest.config.js"],
        checks: { lint: true, format: true },
        environment: { id: "web-training-01", node: { min: "22.12.0", maxMajor: 24 } },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.manifest.protected).toEqual(["tests/**", "vitest.config.js"]);
    expect(result.manifest.checks).toEqual({ lint: true, format: true });
    expect(result.manifest.environment?.node).toEqual({ min: "22.12.0", maxMajor: 24 });
  });

  it("オブジェクトでなければ落とす", () => {
    expect(parseTaskManifest(null)).toEqual({
      ok: false,
      errors: ["task.json はオブジェクトで書いてください"],
    });
  });

  it("未知の runner と kind をまとめて報告する", () => {
    const result = parseTaskManifest(base({ runner: "bash", kind: "quiz" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(2);
    expect(result.errors.join("\n")).toMatch(/runner/);
    expect(result.errors.join("\n")).toMatch(/kind/);
  });

  it("id は講座・単元・課題の形に限る", () => {
    for (const id of ["q01", "Course/Unit/Task", "a//b", "../x/y"]) {
      expect(parseTaskManifest(base({ id })).ok).toBe(false);
    }
  });

  it("課題フォルダーの外を指すパスを受け付けない", () => {
    for (const pattern of [
      "../secret.txt",
      "/etc/passwd",
      "C:/Users/a.txt",
      "src\\a.js",
      "!src/a.js",
    ]) {
      const result = parseTaskManifest(base({ submit: { files: [pattern] } }));
      expect(result.ok, pattern).toBe(false);
    }
  });

  it("提出ファイルが無い課題は env-diagnose だけに許す", () => {
    expect(parseTaskManifest(base({ submit: { files: [] } })).ok).toBe(false);
    expect(parseTaskManifest(base({ runner: "env-diagnose", submit: { files: [] } })).ok).toBe(
      true,
    );
  });

  it("static-preview には検査が要る", () => {
    expect(parseTaskManifest(base({ runner: "static-preview" })).ok).toBe(false);
    const ok = parseTaskManifest(
      base({
        runner: "static-preview",
        submit: { files: ["index.html"] },
        static: {
          checks: [
            { type: "html-document", path: "index.html" },
            { type: "element-text", path: "index.html", tag: "h1", text: "今日の学習予定" },
            { type: "element-count", path: "index.html", tag: "a", min: 1 },
            { type: "links-resolve", path: "index.html" },
            { type: "stylesheet-linked", path: "index.html", href: "style.css" },
            { type: "file-exists", path: "about.html", name: "別ページがある" },
          ],
        },
      }),
    );
    expect(ok.ok).toBe(true);
  });

  it("静的検査の書き間違いを指摘する", () => {
    const result = parseTaskManifest(
      base({
        runner: "static-preview",
        static: {
          checks: [
            { type: "element-text", path: "index.html", tag: "H1", text: "" },
            { type: "element-count", path: "*.html", tag: "a" },
            { type: "screenshot", path: "index.html" },
          ],
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      'static.checks[0].tag は小文字のタグ名で書いてください (例 "h1")',
      "static.checks[0].text は空でない文字列で書いてください",
      "static.checks[1].path は課題フォルダーからの相対パスで書いてください (glob は使えません)",
      "static.checks[1] には min か max のどちらかが要ります",
      "static.checks[2].type は file-exists / html-document / element-text / element-count / links-resolve / stylesheet-linked のどれかにしてください",
    ]);
  });

  it("環境の要件の書き間違いを指摘する", () => {
    const result = parseTaskManifest(
      base({ environment: { node: { min: "latest" }, python: {} } }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      "environment.python は使えません (使えるのは node / npm / git)",
      'environment.node.min は "22.12.0" のような版番号で書いてください',
    ]);
  });
});

describe("isSafeRelativePattern", () => {
  it("相対の glob を通す", () => {
    for (const pattern of [
      "src/**/*.js",
      "index.html",
      "tests/*.test.{js,ts}",
      ".prettierrc.json",
    ]) {
      expect(isSafeRelativePattern(pattern), pattern).toBe(true);
    }
  });

  it("空・末尾の / を落とす", () => {
    expect(isSafeRelativePattern("")).toBe(false);
    expect(isSafeRelativePattern("src/")).toBe(false);
  });
});
