import { describe, expect, it } from "vitest";
import { submissionFixture } from "../testing/task-submission.js";
import type { TaskManifest } from "./manifest.js";
import type { RunStepId, RunStepResult, StepStatus } from "./run-result.js";
import {
  contentHash,
  decodeFile,
  isRunResult,
  parseTaskSubmission,
  type TaskSubmissionInput,
  verifyTaskSubmission,
} from "./submission.js";

function step(id: RunStepId, status: StepStatus = "passed"): RunStepResult {
  return { id, status, label: id, durationMs: 0, summary: status };
}

describe("実行結果の形式", () => {
  it("import 先のファイルの記録が正しいか、省略されていれば受け入れる", async () => {
    const { input } = await submissionFixture();
    const imported = { path: "src/price.ts", sha256: "a".repeat(64), bytes: 10 };
    expect(isRunResult(input.localResult)).toBe(true);
    expect(isRunResult({ ...input.localResult, importedFiles: undefined })).toBe(true);
    expect(isRunResult({ ...input.localResult, importedFiles: [] })).toBe(true);
    expect(isRunResult({ ...input.localResult, importedFiles: [imported] })).toBe(true);
  });

  it("import 先のファイルの記録が不正なら拒否する", async () => {
    const { input } = await submissionFixture();
    const imported = { path: "src/price.ts", sha256: "a".repeat(64), bytes: 10 };
    for (const importedFiles of [
      null,
      {},
      [null],
      [{ ...imported, path: "../price.ts" }],
      [{ ...imported, sha256: "invalid" }],
      [{ ...imported, bytes: -1 }],
      [imported, imported],
    ]) {
      expect(isRunResult({ ...input.localResult, importedFiles })).toBe(false);
    }
  });
});

describe("提出の機械照合", () => {
  it.each([
    ["node-test", ["deps"], ["test"]],
    ["e2e", ["deps", "browsers"], ["e2e"]],
    ["next-app", ["deps", "browsers"], ["build", "e2e"]],
  ] as const)(
    "%s は準備済みの手順を省略して再実行しても照合に通る",
    async (runner, cached, checks) => {
      const { input, bundle } = await submissionFixture({ runner });
      input.localResult.steps = [
        ...cached.map((id) => step(id, "skipped")),
        ...checks.map((id) => step(id)),
        step("files"),
      ];
      expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(true);
      input.localResult.steps = input.localResult.steps.filter((s) => s.id !== "deps");
      expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(false);
    },
  );
  it("Git の課題は Git と指定された static の結果を必須にする", async () => {
    const { input, bundle } = await submissionFixture({
      runner: "git-record",
      git: { checks: [{ type: "learning-folder-root" }] },
      static: { checks: [{ type: "file-absent", path: "old.txt" }] },
    });
    input.localResult.steps = [step("static"), step("git"), step("files")];
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(true);
    input.localResult.steps = [step("git"), step("files")];
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(false);
    bundle.manifest.static = undefined;
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(true);
    input.localResult.steps = [step("files")];
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(false);
  });
  it("提出ファイルを持たない環境診断は、通っていれば照合に通る", async () => {
    const { input, bundle } = await submissionFixture({
      runner: "env-diagnose",
      submit: { files: [] },
      protected: [],
    });
    input.files = [];
    input.protected = [];
    input.localResult.files = [];
    input.localResult.protected = [];
    input.localResult.steps = [step("diagnose")];
    expect((await verifyTaskSubmission(input, bundle)).check).toEqual({
      matched: true,
      reasons: [],
    });
    input.localResult.steps = [step("diagnose", "failed")];
    input.localResult.outcome = "failed";
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(false);
  });
  it("JavaScriptを提出しない課題はlint対象なしの省略を受け入れる", async () => {
    const { input, bundle } = await submissionFixture({
      runner: "node-test",
      checks: { lint: true, format: false },
    });
    input.localResult.steps = [step("deps", "skipped"), step("lint", "skipped"), step("test")];
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(true);
  });
  it.each(["lint", "format", "test", "build", "e2e"] as const)(
    "必須検査 %s の省略は準備の再利用として受け入れない",
    async (skipped) => {
      const { input, bundle } = await submissionFixture({
        runner: skipped === "test" ? "node-test" : "next-app",
        submit: { files: ["index.js"] },
        checks: { lint: true, format: true },
      });
      input.files[0].path = "index.js";
      input.localResult.files[0].path = "index.js";
      input.localResult.steps = [
        step("deps", "skipped"),
        step("browsers", "skipped"),
        step("lint"),
        step("format"),
        ...(skipped === "test" ? [step("test")] : [step("build"), step("e2e")]),
      ];
      input.localResult.steps = input.localResult.steps.map((s) =>
        s.id === skipped ? { ...s, status: "skipped" } : s,
      );
      expect((await verifyTaskSubmission(input, bundle)).check.reasons).toContain(
        "必要な確認の結果が不足しています",
      );
    },
  );
  it("宣言したファイル・手元の結果・配布ハッシュを照合する", async () => {
    const { input, bundle } = await submissionFixture();
    expect((await verifyTaskSubmission(parseTaskSubmission(input), bundle)).check).toEqual({
      matched: true,
      reasons: [],
    });
  });
  it("Windows の BOM・CRLF を配布ハッシュと同じ正規化で照合する", async () => {
    const { input, bundle, source } = await submissionFixture();
    const content = Buffer.from(`\uFEFF${source.replaceAll("\n", "\r\n")}`);
    input.files[0].content = content.toString("base64");
    input.localResult.files[0].bytes = content.length;
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(true);
  });
  it.each(["source", "test", "manifest", "missing-step", "fake-passed", "task"])(
    "%s の食い違いは人に回す",
    async (mismatch) => {
      const { input, bundle } = await submissionFixture();
      if (mismatch === "source") input.files[0].content = Buffer.from("changed").toString("base64");
      if (mismatch === "test") {
        input.protected[0].sha256 = "b".repeat(64);
        input.localResult.protected[0].sha256 = "b".repeat(64);
      }
      if (mismatch === "manifest") input.localResult.manifestSha256 = "b".repeat(64);
      if (mismatch === "missing-step")
        input.localResult.steps = input.localResult.steps.filter((s) => s.id !== "static");
      if (mismatch === "fake-passed") input.localResult.steps[0].status = "failed";
      if (mismatch === "task") input.localResult.taskId = "another/task";
      expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(false);
    },
  );
  it("未宣言ファイルは保存しない", async () => {
    const { input, bundle } = await submissionFixture();
    input.files.push({ path: ".env", content: "" });
    await expect(verifyTaskSubmission(input, bundle)).rejects.toThrow("提出対象ではない");
  });
  it.each([
    "../secret",
    "/secret",
    "x/../secret",
    "node_modules/a.js",
    ".stella/task.json",
    "x/./a.js",
  ])("危険なパス %s を拒否する", async (path) => {
    const { input } = await submissionFixture();
    input.files[0].path = path;
    expect(() => parseTaskSubmission(input)).toThrow();
  });
  it("空ファイルは許し、不正な base64 と容量超過を拒否する", () => {
    expect(decodeFile("").length).toBe(0);
    expect(() => decodeFile("!!!!")).toThrow();
    expect(() => decodeFile("A".repeat(1400000))).toThrow();
  });
  it("同一ファイルの重複と壊れた結果を拒否する", async () => {
    const { input } = await submissionFixture();
    input.files.push(input.files[0]);
    expect(() => parseTaskSubmission(input)).toThrow();
    input.files.pop();
    input.localResult.steps = [null] as unknown as typeof input.localResult.steps;
    expect(() => parseTaskSubmission(input)).toThrow();
  });
  it("相談は合格した実行結果でも人に回す", async () => {
    const { input, bundle } = await submissionFixture();
    input.mode = "consult";
    expect((await verifyTaskSubmission(input, bundle)).check.reasons).toContain(
      "受講者が講師への相談を求めています",
    );
  });
});

describe("C# の課題の提出", () => {
  it("deps・build・test が通れば照合に通り、build が無いと不足になる", async () => {
    const { input, bundle } = await submissionFixture({
      runner: "dotnet-test",
      checks: { lint: false, format: false },
    });
    input.localResult.steps = [step("deps"), step("build"), step("test"), step("files")];
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(true);
    input.localResult.steps = [step("deps", "skipped"), step("build"), step("test"), step("files")];
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(true);
    input.localResult.steps = [step("deps"), step("test"), step("files")];
    expect((await verifyTaskSubmission(input, bundle)).check.reasons).toContain(
      "必要な確認の結果が不足しています",
    );
  });
});

describe("TypeScript の課題の提出", () => {
  it("deps・lint・format・typecheck・test が通れば照合に通り、typecheck が無い・失敗だと不足になる", async () => {
    const { input, bundle } = await submissionFixture({
      runner: "ts-test",
      checks: { lint: true, format: true },
    });
    input.localResult.steps = [
      step("deps"),
      step("lint"),
      step("format"),
      step("typecheck"),
      step("test"),
      step("files"),
    ];
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(true);
    input.localResult.steps = [
      step("deps"),
      step("lint"),
      step("format"),
      step("test"),
      step("files"),
    ];
    expect((await verifyTaskSubmission(input, bundle)).check.reasons).toContain(
      "必要な確認の結果が不足しています",
    );
    input.localResult.steps = [
      step("deps"),
      step("lint"),
      step("format"),
      step("typecheck", "failed"),
      step("test"),
      step("files"),
    ];
    expect((await verifyTaskSubmission(input, bundle)).check.reasons).toContain(
      "必要な確認の結果が不足しています",
    );
  });
});

describe("CI と公開の課題の提出 (07 §5.5)", () => {
  const claim = {
    runUrl: "https://github.com/yamada/web-deploy/actions/runs/123",
    deployUrl: "https://yamada.github.io/web-deploy/",
    commit: "0123456789abcdef0123456789abcdef01234567",
  };
  async function ciFixture() {
    const fixture = await submissionFixture({
      runner: "ci-deploy",
      static: undefined,
      ci: { workflow: ".github/workflows/deploy.yml" },
    });
    fixture.input.localResult.steps = [step("test"), step("files")];
    return fixture;
  }
  it("実行の URL と手元のコミットがそろえば、ファイルの照合は通る (GitHub の照合は API が行う)", async () => {
    const { input, bundle } = await ciFixture();
    input.localResult.ci = claim;
    expect((await verifyTaskSubmission(input, bundle)).check).toEqual({
      matched: true,
      reasons: [],
    });
  });
  it("申告が無い・コミットが無いときは人に回す", async () => {
    const { input, bundle } = await ciFixture();
    expect((await verifyTaskSubmission(input, bundle)).check.reasons).toContain(
      "CI の実行の URL と手元のコミットの記録がありません",
    );
    input.localResult.ci = { runUrl: claim.runUrl, deployUrl: claim.deployUrl };
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(false);
  });
  it("申告の形を確かめ、余分な項目は残さない", async () => {
    const { input } = await ciFixture();
    input.localResult.ci = { ...claim, note: "x" } as typeof claim;
    expect(parseTaskSubmission(input).localResult.ci).toEqual(claim);
    for (const bad of [
      { ...claim, runUrl: "https://evil.example/yamada/web-deploy/actions/runs/123" },
      { ...claim, deployUrl: "javascript:alert(1)" },
      { ...claim, commit: "HEAD" },
    ]) {
      input.localResult.ci = bad;
      expect(() => parseTaskSubmission(input)).toThrow("提出データの形式が不正です");
    }
  });
});

describe("問題の提出の照合", () => {
  async function problemCase(source = "export const add = 1;\n") {
    const manifest: TaskManifest = {
      schemaVersion: 1,
      id: "csharp-foundations/u01/calc",
      title: "計算",
      kind: "basic",
      runner: "node-test",
      problems: [
        { id: "q01-add", title: "足す" },
        { id: "q02-sub", title: "引く" },
      ],
      submit: { files: ["src/**/*.ts"] },
      protected: ["tests/**/*.test.ts"],
      checks: { lint: false, format: false },
    };
    const manifestText = JSON.stringify(manifest);
    const encoder = new TextEncoder();
    const test = 'test("q01", () => {});\n';
    const testBytes = encoder.encode(test);
    const sourceBytes = encoder.encode(source);
    const protectedFiles = [
      {
        path: "tests/q01-add.test.ts",
        sha256: await contentHash(testBytes),
        bytes: testBytes.length,
      },
      {
        path: "tests/q02-sub.test.ts",
        sha256: await contentHash(testBytes),
        bytes: testBytes.length,
      },
    ];
    const hashed = {
      path: "src/q01-add.ts",
      sha256: await contentHash(sourceBytes),
      bytes: sourceBytes.length,
    };
    const bundle = {
      manifest,
      contentHash: "a".repeat(64),
      files: {
        ".stella/task.json": Buffer.from(manifestText).toString("base64"),
        "tests/q01-add.test.ts": Buffer.from(test).toString("base64"),
        "tests/q02-sub.test.ts": Buffer.from(test).toString("base64"),
      },
    };
    const input: TaskSubmissionInput = {
      taskId: manifest.id,
      contentHash: bundle.contentHash,
      mode: "submit",
      problemId: "q01-add",
      files: [{ path: hashed.path, content: Buffer.from(source).toString("base64") }],
      explanation: "",
      support: [],
      protected: protectedFiles,
      localResult: {
        schemaVersion: 1 as const,
        taskId: manifest.id,
        runner: manifest.runner,
        outcome: "passed" as const,
        startedAt: "2026-11-06T00:00:00Z",
        durationMs: 1,
        platform: "linux",
        toolVersions: {},
        problemId: "q01-add",
        steps: [step("deps"), step("test")],
        files: [hashed],
        protected: protectedFiles,
        manifestSha256: await contentHash(encoder.encode(manifestText)),
      },
    };
    return { input, bundle };
  }

  it("その問題のソース 1 ファイルだけを受け、問題 ID の形を確かめる", async () => {
    const { input, bundle } = await problemCase();
    expect((await verifyTaskSubmission(input, bundle)).check).toEqual({
      matched: true,
      reasons: [],
    });
    expect(parseTaskSubmission(input).problemId).toBe("q01-add");
    expect(() => parseTaskSubmission({ ...input, problemId: "Q1" })).toThrow(
      "提出データの形式が不正です",
    );
    expect(() =>
      parseTaskSubmission({
        ...input,
        localResult: { ...input.localResult, problemId: 1 },
      }),
    ).toThrow("提出データの形式が不正です");
  });

  it("一覧に無い問題・別ファイル・落ちたテスト・64KiB 超えは照合に落とす", async () => {
    const { input, bundle } = await problemCase();
    input.problemId = "q99-missing";
    input.localResult.problemId = "q99-missing";
    input.files[0].path = "src/q99-missing.ts";
    input.localResult.files[0].path = "src/q99-missing.ts";
    expect((await verifyTaskSubmission(input, bundle)).check.reasons).toContain(
      "問題の ID が一覧にありません",
    );

    const other = await problemCase();
    other.input.files[0].path = "src/q02-sub.ts";
    other.input.localResult.files[0].path = "src/q02-sub.ts";
    expect((await verifyTaskSubmission(other.input, other.bundle)).check.reasons).toEqual(
      expect.arrayContaining([
        "提出するファイルが不足しています",
        "提出するのはその問題のファイル 1 つだけです",
      ]),
    );

    const failed = await problemCase();
    failed.input.localResult.outcome = "failed";
    failed.input.localResult.steps = [step("deps"), step("test", "failed")];
    expect((await verifyTaskSubmission(failed.input, failed.bundle)).check.matched).toBe(false);

    const big = await problemCase(`${"a".repeat(64 * 1024 + 1)}`);
    expect((await verifyTaskSubmission(big.input, big.bundle)).check.reasons).toContain(
      "1 問のファイルは 64KiB までです",
    );
    const edge = await problemCase("a".repeat(64 * 1024));
    expect((await verifyTaskSubmission(edge.input, edge.bundle)).check.matched).toBe(true);
  });
});
