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

  it("id はステージ・単元・課題の形に限る", () => {
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
      "environment.python は使えません (使えるのは node / npm / git / dotnet)",
      'environment.node.min は "22.12.0" のようなバージョン番号で書いてください',
    ]);
  });
});

describe("parseTaskManifest (CI と公開の課題)", () => {
  const ci = (overrides: Record<string, unknown> = {}) =>
    base({
      runner: "ci-deploy",
      submit: { files: [".github/workflows/deploy.yml", "site/**"] },
      protected: ["tests/**"],
      ci: { workflow: ".github/workflows/deploy.yml" },
      ...overrides,
    });

  it("確かめるワークフローを読む", () => {
    const result = parseTaskManifest(ci());
    expect(result.ok && result.manifest.ci).toEqual({ workflow: ".github/workflows/deploy.yml" });
  });

  it("ci-deploy の課題にはワークフローの指定が要る", () => {
    const result = parseTaskManifest(ci({ ci: undefined }));
    expect(result.ok ? [] : result.errors).toEqual([
      "runner が ci-deploy の課題には ci.workflow (確かめる GitHub Actions のワークフロー) が要ります",
    ]);
  });

  it("ほかの runner には書けない", () => {
    const result = parseTaskManifest(base({ ci: { workflow: ".github/workflows/deploy.yml" } }));
    expect(result.ok ? [] : result.errors).toEqual([
      "ci は runner が ci-deploy の課題だけに書けます",
    ]);
  });

  it(".github/workflows/ の下の YAML だけを受け付ける", () => {
    for (const workflow of [
      "deploy.yml",
      ".github/workflows/../deploy.yml",
      ".github/workflows/sub/deploy.yml",
      ".github/workflows/deploy.json",
      "/.github/workflows/deploy.yml",
      ".github/workflows/.yml",
      ".github\\workflows\\deploy.yml",
      42,
    ]) {
      const result = parseTaskManifest(ci({ ci: { workflow } }));
      expect(result.ok, String(workflow)).toBe(false);
    }
    expect(
      parseTaskManifest(
        ci({
          ci: { workflow: ".github/workflows/ci.yaml" },
          submit: { files: [".github/workflows/*.yaml"] },
        }),
      ).ok,
    ).toBe(true);
  });

  it("ワークフローは提出か配布のファイルにする (中身を誰かが確かめる)", () => {
    const result = parseTaskManifest(ci({ submit: { files: ["site/**"] }, protected: [] }));
    expect(result.ok ? [] : result.errors).toEqual([
      "ci.workflow は submit.files か protected に当たるパスにしてください",
    ]);
    expect(
      parseTaskManifest(ci({ submit: { files: ["site/**"] }, protected: [".github/**"] })).ok,
    ).toBe(true);
  });
});

describe("parseTaskManifest (C# の課題)", () => {
  const dotnet = (overrides: Record<string, unknown> = {}) =>
    base({
      id: "csharp-basics/u02/t01",
      title: "合計を求める",
      runner: "dotnet-test",
      submit: { files: ["src/**/*.cs"] },
      protected: [
        "Task.csproj",
        "packages.lock.json",
        "Directory.Build.props",
        "Directory.Build.targets",
        "NuGet.config",
        "tests/**",
      ],
      ...overrides,
    });

  it("dotnet-test の定義を通す", () => {
    expect(parseTaskManifest(dotnet()).ok).toBe(true);
  });

  it("checks.lint は使えない", () => {
    const result = parseTaskManifest(dotnet({ checks: { lint: true } }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(
      "runner が dotnet-test の課題では checks.lint・checks.format を使えません (ESLint・Prettier は C# を検査しません)",
    );
  });

  it("protected に Task.csproj が要る", () => {
    const result = parseTaskManifest(
      dotnet({
        protected: [
          "packages.lock.json",
          "Directory.Build.props",
          "Directory.Build.targets",
          "NuGet.config",
          "tests/**",
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(
      "runner が dotnet-test の課題では protected に Task.csproj を入れてください",
    );
  });

  it("submit.files に packages.lock.json を入れられない", () => {
    const result = parseTaskManifest(
      dotnet({ submit: { files: ["src/**/*.cs", "packages.lock.json"] } }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(
      "packages.lock.json は配布したファイルなので submit.files に入れられません",
    );
  });

  it("protected に tests/** という文字列が要る", () => {
    const message =
      "runner が dotnet-test の課題では protected に tests/** を入れてください (配布したテストの改変を提出で照合するため)";
    for (const testsPattern of [undefined, "tests/AnswersTests.cs", "tests/*.cs"] as const) {
      const result = parseTaskManifest(
        dotnet({
          protected: [
            "Task.csproj",
            "packages.lock.json",
            "Directory.Build.props",
            "Directory.Build.targets",
            "NuGet.config",
            ...(testsPattern === undefined ? [] : [testsPattern]),
          ],
        }),
      );
      expect(result.ok, String(testsPattern)).toBe(false);
      if (result.ok) return;
      expect(result.errors, String(testsPattern)).toContain(message);
    }
    expect(parseTaskManifest(dotnet()).ok).toBe(true);
  });

  it("submit.files は src/ の下のパターンだけ", () => {
    const message =
      "runner が dotnet-test の課題では submit.files を src/ の下のパターンにしてください (受講者のコードは src/ に置き、tests/ は配布したテストのため)";
    for (const pattern of [
      "**/ConsoleOutput.cs",
      "**/*.cs",
      "tests/ConsoleOutput.cs",
      "Answers.cs",
    ]) {
      const result = parseTaskManifest(dotnet({ submit: { files: [pattern] } }));
      expect(result.ok, pattern).toBe(false);
      if (result.ok) return;
      expect(result.errors, pattern).toContain(message);
    }
    expect(parseTaskManifest(dotnet({ submit: { files: ["src/**/*.cs"] } })).ok).toBe(true);
  });

  it("submit.files に src/**/*.cs という文字列が要る", () => {
    const message =
      "runner が dotnet-test の課題では submit.files に src/**/*.cs を入れてください (コンパイルする src/ の .cs をすべて提出するため)";
    const result = parseTaskManifest(dotnet({ submit: { files: ["src/Answers.cs"] } }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(message);
    expect(parseTaskManifest(dotnet({ submit: { files: ["src/**/*.cs"] } })).ok).toBe(true);
  });
});

describe("parseTaskManifest (TypeScript の課題)", () => {
  const typescript = (overrides: Record<string, unknown> = {}) =>
    base({
      id: "typescript-basics/u01/t01",
      title: "合計を求める",
      runner: "ts-test",
      submit: { files: ["src/**/*.ts"] },
      protected: [
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "eslint.config.js",
        "vitest.config.js",
        "tests/**",
      ],
      checks: { lint: true },
      ...overrides,
    });

  it("ts-test の定義を通す", () => {
    expect(parseTaskManifest(typescript()).ok).toBe(true);
  });

  it("checks.lint は true にする", () => {
    const result = parseTaskManifest(typescript({ checks: { lint: false } }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(
      "runner が ts-test の課題では checks.lint を true にしてください (any や @ts-ignore による型の逃げを ESLint で止めるため)",
    );
  });

  it("protected に tsconfig.json が要る", () => {
    const result = parseTaskManifest(
      typescript({
        protected: [
          "package.json",
          "package-lock.json",
          "eslint.config.js",
          "vitest.config.js",
          "tests/**",
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(
      "runner が ts-test の課題では protected に tsconfig.json を入れてください",
    );
  });

  it("protected に tests/** という文字列が要る", () => {
    const message =
      "runner が ts-test の課題では protected に tests/** を入れてください (配布したテストの改変を提出で照合するため)";
    const result = parseTaskManifest(
      typescript({
        protected: [
          "package.json",
          "package-lock.json",
          "tsconfig.json",
          "eslint.config.js",
          "vitest.config.js",
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(message);
  });

  it("submit.files は src/ の下のパターンだけ", () => {
    const message =
      "runner が ts-test の課題では submit.files を src/ の下のパターンにしてください (tsconfig.json が型を確かめるのは src/ と tests/ のため)";
    const result = parseTaskManifest(typescript({ submit: { files: ["index.ts"] } }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(message);
  });

  it("submit.files に src/**/*.ts という文字列が要る", () => {
    const message =
      "runner が ts-test の課題では submit.files に src/**/*.ts を入れてください (型を確かめる src/ の .ts をすべて提出するため)";
    const result = parseTaskManifest(typescript({ submit: { files: ["src/greet.ts"] } }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(message);
    expect(parseTaskManifest(typescript({ submit: { files: ["src/**/*.ts"] } })).ok).toBe(true);
  });
});

describe("parseTaskManifest (問題)", () => {
  const problems = [
    { id: "q01-add-tax", title: "税込価格を返す" },
    { id: "q02-split-bill", title: "割り勘" },
  ];

  it("vitest・typescript・dotnet の課題は問題を読む", () => {
    const node = parseTaskManifest(base({ problems }));
    expect(node.ok).toBe(true);
    if (!node.ok) return;
    expect(node.manifest.problems).toEqual(problems);
    const typescript = parseTaskManifest(
      base({
        runner: "ts-test",
        submit: { files: ["src/**/*.ts"] },
        protected: [
          "package.json",
          "package-lock.json",
          "tsconfig.json",
          "eslint.config.js",
          "vitest.config.js",
          "tests/**",
        ],
        checks: { lint: true },
        problems,
      }),
    );
    expect(typescript.ok).toBe(true);
    const dotnet = parseTaskManifest(
      base({
        runner: "dotnet-test",
        submit: { files: ["src/**/*.cs"] },
        protected: [
          "Task.csproj",
          "packages.lock.json",
          "Directory.Build.props",
          "Directory.Build.targets",
          "NuGet.config",
          "tests/**",
        ],
        problems,
      }),
    );
    expect(dotnet.ok).toBe(true);
  });

  it("問題の無い課題にはキーを足さない", () => {
    const result = parseTaskManifest(base());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.manifest).not.toHaveProperty("problems");
  });

  it(".. と空白と -p: を含む ID は落とす", () => {
    for (const id of ["..", "a b", "-p:b", "a/b", "A", ""]) {
      const result = parseTaskManifest(base({ problems: [{ id, title: "題" }] }));
      expect(result.ok, id).toBe(false);
    }
  });

  it("空・重複・題の無い問題と、書けない runner を落とす", () => {
    expect(parseTaskManifest(base({ problems: [] })).ok).toBe(false);
    expect(
      parseTaskManifest(
        base({
          problems: [
            { id: "a", title: "一つ" },
            { id: "a", title: "二つ" },
          ],
        }),
      ).ok,
    ).toBe(false);
    expect(parseTaskManifest(base({ problems: [{ id: "a", title: "  " }] })).ok).toBe(false);
    for (const runner of ["static-preview", "env-diagnose", "e2e", "next-app", "ci-deploy"]) {
      const result = parseTaskManifest(base({ runner, problems: [{ id: "a", title: "題" }] }));
      expect(result.ok, runner).toBe(false);
      if (result.ok) return;
      expect(result.errors.join("\n")).toMatch(/vitest/);
    }
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
