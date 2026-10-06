import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import { contentHash, verifyTaskSubmission } from "@stella/shared/tasks/submission";
import { describe, expect, it } from "vitest";
import { findTaskRoot, loadTask, runTask, saveRunResult } from "./run-task.js";

const NODE = process.execPath;

async function makeTask(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "stella-task-"));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, ...rel.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return root;
}

async function makeFile(root: string, rel: string, content: string): Promise<void> {
  const file = path.join(root, ...rel.split("/"));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

/**
 * 課題フォルダーに置く偽の道具。本物と同じ引数を受け取り、本物の出力形式
 * (`__fixtures__/` と同じ形) を書き出す。手順が正しい引数で道具を起動し、
 * その結果を読めることを、実際のプロセス起動ごと確かめる。
 */
function fakePackage(name: string, bin: string, script: string): Record<string, string> {
  return {
    [`node_modules/${name}/package.json`]: JSON.stringify({
      name,
      version: "1.0.0",
      bin: { [bin]: "./cli.cjs" },
    }),
    [`node_modules/${name}/cli.cjs`]: script,
  };
}

const FAKE_VITEST = `
const fs = require("node:fs");
const out = process.argv.find((a) => a.startsWith("--outputFile=")).slice("--outputFile=".length);
const pass = fs.readFileSync("src/filter.js", "utf8").includes(">=");
fs.writeFileSync(out, JSON.stringify({
  success: pass,
  testResults: [{ name: process.cwd() + "/tests/filter.test.js", status: pass ? "passed" : "failed", message: "",
    assertionResults: [{ ancestorTitles: ["selectAtLeast"], title: "k 以上を選ぶ", status: pass ? "passed" : "failed",
      failureMessages: pass ? [] : ["AssertionError: expected [ 7 ] to deeply equal [ 5, 7 ]\\n    at x"] }] }],
}));
process.exit(pass ? 0 : 1);
`;

const FAKE_ESLINT = `
const fs = require("node:fs");
const out = process.argv[process.argv.indexOf("--output-file") + 1];
const files = process.argv.slice(process.argv.indexOf("--output-file") + 2);
fs.writeFileSync(out, JSON.stringify(files.map((f) => ({ filePath: require("node:path").resolve(f), messages: [] }))));
`;

const FAKE_PRETTIER = `
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const broken = files.filter((f) => require("node:fs").readFileSync(f, "utf8").includes("((("));
if (broken.length > 0) {
  console.error("[error] " + broken[0] + ": SyntaxError: Unexpected token (2:1)");
  process.exit(2);
}
const ugly = files.filter((f) => require("node:fs").readFileSync(f, "utf8").includes("  ;"));
for (const f of ugly) console.log(f);
process.exit(ugly.length > 0 ? 1 : 0);
`;

const FAKE_NPM = `
const fs = require("node:fs");
fs.mkdirSync("node_modules", { recursive: true });
fs.writeFileSync("npm-args.json", JSON.stringify(process.argv.slice(2)));
`;

function manifest(overrides: Partial<TaskManifest> = {}): TaskManifest {
  return {
    schemaVersion: 1,
    id: "javascript-data-basics/u03-filter/q01",
    title: "整数から k 以上を選ぶ",
    kind: "basic",
    runner: "node-test",
    submit: { files: ["src/filter.js"] },
    protected: ["tests/**"],
    checks: { lint: true, format: true },
    ...overrides,
  };
}

async function vitestTask(source: string): Promise<{ root: string; npmCli: string }> {
  const root = await makeTask({
    "package.json": JSON.stringify({ name: "task", private: true }),
    "package-lock.json": "{}",
    "src/filter.js": source,
    "tests/filter.test.js": "// 配布したテスト\r\n",
    ...fakePackage("vitest", "vitest", FAKE_VITEST),
    ...fakePackage("eslint", "eslint", FAKE_ESLINT),
    ...fakePackage("prettier", "prettier", FAKE_PRETTIER),
  });
  const npmCli = path.join(root, "..", `${path.basename(root)}-npm-cli.cjs`);
  await writeFile(npmCli, FAKE_NPM);
  return { root, npmCli };
}

describe("runTask (Vitest の手順)", () => {
  it("依存の準備 → lint → 整形 → テスト → 提出ファイルの確認を通す", async () => {
    const { root, npmCli } = await vitestTask(
      "export const f = (v, k) => v.filter((x) => x >= k);\n",
    );
    const logs: string[] = [];
    const task = manifest();
    const manifestText = JSON.stringify(task);
    const manifestSha256 = await contentHash(Buffer.from(manifestText));
    const result = await runTask({
      root,
      manifest: task,
      manifestSha256,
      toolchain: { node: NODE, npm: { file: NODE, prefixArgs: [npmCli] } },
      log: (text) => logs.push(text),
    });
    expect(result.steps.map((s) => [s.id, s.status])).toEqual([
      ["deps", "passed"],
      ["lint", "passed"],
      ["format", "passed"],
      ["test", "passed"],
      ["files", "passed"],
    ]);
    expect(result.outcome).toBe("passed");
    expect(result.toolVersions.node).toBe(process.version);
    expect(result.files.map((f) => f.path)).toEqual(["src/filter.js"]);
    expect(result.protected.map((f) => f.path)).toEqual(["tests/filter.test.js"]);
    // lockfile があるので npm ci。
    expect(JSON.parse(await readFile(path.join(root, "npm-args.json"), "utf8"))).toEqual([
      "ci",
      "--no-audit",
      "--no-fund",
      "--loglevel=error",
    ]);
    expect(logs.join("")).toContain("▶ テスト (Vitest)");

    // 2 回目は依存の準備を省く。
    const again = await runTask({
      root,
      manifest: task,
      manifestSha256,
      toolchain: { node: NODE, npm: { file: NODE, prefixArgs: [npmCli] } },
    });
    expect(again.steps[0]).toMatchObject({
      id: "deps",
      status: "skipped",
      summary: "準備済みです",
    });
    const encodedFiles = {
      ".stella/task.json": Buffer.from(manifestText).toString("base64"),
      "src/filter.js": (await readFile(path.join(root, "src/filter.js"))).toString("base64"),
      "tests/filter.test.js": (await readFile(path.join(root, "tests/filter.test.js"))).toString(
        "base64",
      ),
    };
    // runnerが実際に返した再実行の結果を、そのまま提出の機械照合に通す。
    expect(
      (
        await verifyTaskSubmission(
          {
            taskId: task.id,
            contentHash: "a".repeat(64),
            mode: "submit",
            files: [{ path: "src/filter.js", content: encodedFiles["src/filter.js"] }],
            localResult: again,
            protected: again.protected,
            explanation: "境界値を含めて確認しました",
            support: [],
          },
          { manifest: task, contentHash: "a".repeat(64), files: encodedFiles },
        )
      ).check.matched,
    ).toBe(true);

    // 道具のパッケージが消えていれば、印が同じでも準備をやり直す。
    await rm(path.join(root, "node_modules", "vitest"), { recursive: true });
    const afterRemoval = await runTask({
      root,
      manifest: manifest(),
      manifestSha256: "m",
      toolchain: { node: NODE, npm: { file: NODE, prefixArgs: [npmCli] } },
    });
    expect(afterRemoval.steps[0]).toMatchObject({ id: "deps", status: "passed" });
  });

  it("テストと整形の失敗をまとめて返す (失敗では止めない)", async () => {
    const { root, npmCli } = await vitestTask(
      "export const f = (v, k) => v.filter((x) => x > k)  ;\n",
    );
    const result = await runTask({
      root,
      manifest: manifest(),
      manifestSha256: "m",
      toolchain: { node: NODE, npm: { file: NODE, prefixArgs: [npmCli] } },
    });
    expect(result.outcome).toBe("failed");
    const format = result.steps.find((s) => s.id === "format");
    expect(format).toMatchObject({ status: "failed", files: ["src/filter.js"] });
    const test = result.steps.find((s) => s.id === "test");
    expect(test?.status).toBe("failed");
    expect(test?.tests?.[0]).toMatchObject({
      name: "selectAtLeast › k 以上を選ぶ",
      file: "tests/filter.test.js",
      message: "AssertionError: expected [ 7 ] to deeply equal [ 5, 7 ]",
    });
  });

  it("構文の誤りで整形を確かめられないときは、環境ではなく要修正にする", async () => {
    const { root, npmCli } = await vitestTask("export const f = (((\n");
    const result = await runTask({
      root,
      manifest: manifest(),
      manifestSha256: "m",
      toolchain: { node: NODE, npm: { file: NODE, prefixArgs: [npmCli] } },
    });
    const format = result.steps.find((s) => s.id === "format");
    expect(format?.status).toBe("failed");
    expect(format?.summary).toMatch(/構文の誤り/);
  });

  it("lockfile が無ければ npm install。作られた lockfile で次から準備を省く", async () => {
    const { root } = await vitestTask("export const f = (v, k) => v.filter((x) => x >= k);\n");
    await rm(path.join(root, "package-lock.json"));
    const npmCli = path.join(root, "..", `${path.basename(root)}-npm-install.cjs`);
    await writeFile(
      npmCli,
      `${FAKE_NPM}\nfs.writeFileSync("package-lock.json", JSON.stringify({ lockfileVersion: 3 }));\n`,
    );
    const toolchain = { node: NODE, npm: { file: NODE, prefixArgs: [npmCli] } };
    const first = await runTask({ root, manifest: manifest(), manifestSha256: "m", toolchain });
    expect(first.steps[0]?.status).toBe("passed");
    expect(JSON.parse(await readFile(path.join(root, "npm-args.json"), "utf8"))[0]).toBe("install");
    const second = await runTask({ root, manifest: manifest(), manifestSha256: "m", toolchain });
    expect(second.steps[0]?.status).toBe("skipped");
  });

  it("Node.js が無ければ環境の問題として止め、残りは省略する", async () => {
    const { root } = await vitestTask("x");
    const result = await runTask({
      root,
      manifest: manifest(),
      manifestSha256: "m",
      toolchain: { node: null, npm: null },
    });
    expect(result.outcome).toBe("error");
    expect(result.steps.map((s) => [s.id, s.status])).toEqual([
      ["deps", "error"],
      ["lint", "skipped"],
      ["format", "skipped"],
      ["test", "skipped"],
      ["files", "passed"],
    ]);
    expect(result.steps[0]?.summary).toMatch(/Node\.js が見つかりません/);
  });

  it("提出が多すぎれば lint・整形に渡さず、提出ファイルの確認で要修正にする", async () => {
    const { root, npmCli } = await vitestTask(
      "export const f = (v, k) => v.filter((x) => x >= k);\n",
    );
    for (let i = 0; i < 51; i++) {
      await makeFile(root, `src/gen/f${i}.js`, "export {};\n");
    }
    const result = await runTask({
      root,
      manifest: manifest({ submit: { files: ["src/**/*.js"] } }),
      manifestSha256: "m",
      toolchain: { node: NODE, npm: { file: NODE, prefixArgs: [npmCli] } },
    });
    expect(result.steps.map((s) => [s.id, s.status])).toEqual([
      ["deps", "passed"],
      ["lint", "skipped"],
      ["format", "skipped"],
      ["test", "passed"],
      ["files", "failed"],
    ]);
    expect(result.steps[1]?.summary).toContain("提出するファイルが多すぎる");
    expect(result.steps[4]?.summary).toContain("提出するファイルが多すぎます");
    expect(result.outcome).toBe("failed");
  });

  it("提出ファイルや配布ファイルが見つからなければ要修正", async () => {
    const { root, npmCli } = await vitestTask(
      "export const f = (v, k) => v.filter((x) => x >= k);\n",
    );
    const result = await runTask({
      root,
      manifest: manifest({
        submit: { files: ["src/fliter.js"] },
        protected: ["tests/**", "vitest.config.js"],
      }),
      manifestSha256: "m",
      toolchain: { node: NODE, npm: { file: NODE, prefixArgs: [npmCli] } },
    });
    const files = result.steps.find((s) => s.id === "files");
    expect(files?.status).toBe("failed");
    expect(files?.files).toEqual(["src/fliter.js", "vitest.config.js"]);
  });
});

describe("runTask (提出の上限)", () => {
  it("上限を超えた提出は要修正にし、ファイルを読み込まない", async () => {
    const root = await makeTask({
      "index.html": "<h1>x</h1>",
      "movie.html": "x".repeat(1024 * 1024 + 1),
    });
    const result = await runTask({
      root,
      manifest: manifest({
        runner: "static-preview",
        submit: { files: ["*.html"] },
        protected: [],
        checks: { lint: false, format: false },
        static: { checks: [{ type: "file-exists", path: "index.html" }] },
      }),
      manifestSha256: "m",
      env: { PATH: "" },
    });
    const files = result.steps.find((s) => s.id === "files");
    expect(files?.status).toBe("failed");
    expect(files?.summary).toContain("movie.html が大きすぎます");
    expect(result.files).toEqual([]);
    expect(result.outcome).toBe("failed");
  });
});

describe("runTask (HTML の確認)", () => {
  it("Node.js が無くても動く", async () => {
    const root = await makeTask({
      "index.html":
        '<!doctype html><html lang="ja"><head><meta charset="UTF-8"><title>t</title></head><body><h1>今日の学習予定</h1></body></html>',
    });
    const result = await runTask({
      root,
      manifest: manifest({
        runner: "static-preview",
        submit: { files: ["index.html"] },
        protected: [],
        checks: { lint: false, format: false },
        static: {
          checks: [
            { type: "html-document", path: "index.html" },
            { type: "element-text", path: "index.html", tag: "h1", text: "今日の学習予定" },
          ],
        },
      }),
      manifestSha256: "m",
      env: { PATH: "" },
    });
    expect(result.outcome).toBe("passed");
    expect(result.steps.map((s) => s.id)).toEqual(["static", "files"]);
  });
});

describe("runTask (中断)", () => {
  it("始める前に中断されたら、何も確かめていないので合格にしない", async () => {
    const root = await makeTask({ "index.html": "<h1>x</h1>" });
    const controller = new AbortController();
    controller.abort();
    const result = await runTask({
      root,
      manifest: manifest({
        runner: "static-preview",
        submit: { files: ["index.html"] },
        protected: [],
        checks: { lint: false, format: false },
        static: { checks: [{ type: "file-exists", path: "index.html" }] },
      }),
      manifestSha256: "m",
      signal: controller.signal,
      env: { PATH: "" },
    });
    expect(result.outcome).toBe("cancelled");
    expect(result.steps.every((s) => s.status === "skipped")).toBe(true);
    expect(result.files).toEqual([]);
  });

  it("Node.js の版を調べている最中に中断しても、例外にせず中断として返す", async () => {
    const { root, npmCli } = await vitestTask("x");
    const controller = new AbortController();
    controller.abort();
    const result = await runTask({
      root,
      manifest: manifest(),
      manifestSha256: "m",
      signal: controller.signal,
      toolchain: { node: NODE, npm: { file: NODE, prefixArgs: [npmCli] } },
    });
    expect(result.outcome).toBe("cancelled");
  });
});

describe("runTask (環境の診断)", () => {
  it("要件と照合し、見つからない道具を報告する", async () => {
    const root = await makeTask({});
    const result = await runTask({
      root,
      manifest: manifest({
        runner: "env-diagnose",
        submit: { files: [] },
        protected: [],
        environment: { node: { min: "18.0.0" }, git: { min: "2.30.0" } },
      }),
      manifestSha256: "m",
      env: { PATH: "" },
      toolchain: { node: NODE, npm: null },
    });
    const diagnose = result.steps[0];
    expect(diagnose?.tests?.map((t) => t.status)).toEqual(["passed", "failed"]);
    expect(diagnose?.tests?.[1]?.message).toMatch(/見つかりません/);
    expect(result.toolVersions.node).toBe(process.version);
    expect(result.steps).toHaveLength(1);
    expect(result.outcome).toBe("failed");
  });

  it("使えない major 版 (Node.js 23 など) は、範囲の中でも要修正にする", async () => {
    const major = Number(process.versions.node.split(".")[0]);
    const root = await makeTask({});
    const result = await runTask({
      root,
      manifest: manifest({
        runner: "env-diagnose",
        submit: { files: [] },
        protected: [],
        environment: { node: { min: `${major - 1}.0.0`, majors: [major - 1, major + 1] } },
      }),
      manifestSha256: "m",
      env: { PATH: "" },
      toolchain: { node: NODE, npm: null },
    });
    const node = result.steps[0]?.tests?.[0];
    expect(node?.status).toBe("failed");
    expect(node?.message).toBe(
      `この版は使えません (${process.versions.node})。${major - 1}.0.0 以上、${major - 1}・${major + 1} 系 が必要です`,
    );
    expect(result.outcome).toBe("failed");
  });
});

describe("runTask (CI の課題)", () => {
  it("手元では実行しない", async () => {
    const root = await makeTask({ "a.yml": "" });
    const result = await runTask({
      root,
      manifest: manifest({ runner: "ci-deploy", submit: { files: ["a.yml"] }, protected: [] }),
      manifestSha256: "m",
    });
    expect(result.outcome).toBe("error");
    expect(result.steps[0]?.summary).toMatch(/GitHub Actions/);
  });
});

describe("findTaskRoot / loadTask / saveRunResult", () => {
  it("開いているファイルから課題フォルダーを探し、定義を読む", async () => {
    const root = await makeTask({
      ".stella/task.json": JSON.stringify({
        schemaVersion: 1,
        id: "dev-env-basics/u03-first-page/s01",
        title: "学習予定のページ",
        kind: "independent",
        runner: "static-preview",
        submit: { files: ["index.html"] },
        static: { checks: [{ type: "file-exists", path: "index.html" }] },
      }),
      "pages/sub/a.html": "",
    });
    const start = path.join(root, "pages", "sub", "a.html");
    expect(await findTaskRoot(start, [path.dirname(root)])).toBe(root);
    const loaded = await loadTask(root);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.manifest.id).toBe("dev-env-basics/u03-first-page/s01");
    expect(loaded.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ワークスペースの境界より上は探さない", async () => {
    const root = await makeTask({ ".stella/task.json": "{}", "inner/x.js": "" });
    expect(
      await findTaskRoot(path.join(root, "inner", "x.js"), [path.join(root, "inner")]),
    ).toBeNull();
  });

  it("大きすぎる task.json は読まない", async () => {
    const root = await makeTask({ ".stella/task.json": `{"x":"${"a".repeat(64 * 1024)}"}` });
    expect(await loadTask(root)).toEqual({
      ok: false,
      root,
      errors: [".stella/task.json が大きすぎます (64KB まで)"],
    });
  });

  it("BOM 付きの task.json も読める", async () => {
    const root = await makeTask({});
    await mkdir(path.join(root, ".stella"), { recursive: true });
    const body = JSON.stringify({
      schemaVersion: 1,
      id: "dev-env-basics/u03-first-page/q01",
      title: "BOM",
      kind: "basic",
      runner: "static-preview",
      submit: { files: ["index.html"] },
      static: { checks: [{ type: "file-exists", path: "index.html" }] },
    });
    await writeFile(
      path.join(root, ".stella", "task.json"),
      `\uFEFF${body.replace(/,/g, ",\r\n")}`,
    );
    const loaded = await loadTask(root);
    expect(loaded.ok).toBe(true);
    // ハッシュは BOM と改行の違いに左右されない。
    await writeFile(path.join(root, ".stella", "task.json"), body.replace(/,/g, ",\n"));
    const plain = await loadTask(root);
    expect(plain.ok && loaded.ok && plain.manifestSha256 === loaded.manifestSha256).toBe(true);
  });

  it("定義の誤りを返す", async () => {
    const root = await makeTask({ ".stella/task.json": "{ broken" });
    expect(await loadTask(root)).toEqual({
      ok: false,
      root,
      errors: [".stella/task.json が JSON として読めません"],
    });
  });

  it("last-run.json がリンクでも、リンク先を書き換えない", async () => {
    const outside = await makeTask({ "victim.txt": "keep" });
    const root = await makeTask({ ".stella/task.json": "{}" });
    await symlink(path.join(outside, "victim.txt"), path.join(root, ".stella", "last-run.json"));
    const result = await runTask({
      root,
      manifest: manifest({ runner: "ci-deploy", submit: { files: ["x"] }, protected: [] }),
      manifestSha256: "m",
    });
    await saveRunResult(root, result);
    expect(await readFile(path.join(outside, "victim.txt"), "utf8")).toBe("keep");
    const saved = JSON.parse(await readFile(path.join(root, ".stella", "last-run.json"), "utf8"));
    expect(saved.taskId).toBe("javascript-data-basics/u03-filter/q01");
  });

  it("結果と .gitignore を書く", async () => {
    const root = await makeTask({});
    const result = await runTask({
      root,
      manifest: manifest({ runner: "ci-deploy", submit: { files: ["x"] }, protected: [] }),
      manifestSha256: "m",
    });
    await saveRunResult(root, result);
    const saved = JSON.parse(await readFile(path.join(root, ".stella", "last-run.json"), "utf8"));
    expect(saved.taskId).toBe("javascript-data-basics/u03-filter/q01");
    expect(await readFile(path.join(root, ".stella", ".gitignore"), "utf8")).toContain(
      "last-run.json",
    );
  });
});
