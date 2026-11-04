import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { canSubmit } from "@stella/shared/tasks/run-result";
import { describe, expect, it } from "vitest";
import { liveDotnet } from "../testing/dotnet.js";
import {
  CI_TEMPLATE_RUNNER,
  DOTNET_TEMPLATE_RUNNER,
  readEnvironmentFile,
  readTaskFields,
  SAMPLES_DIR,
  TEMPLATE_RUNNERS,
  templateFile,
  templateFiles,
} from "../testing/templates.js";
import { listFiles, matchPatterns } from "./files.js";
import { loadTask, runTask } from "./run-task.js";

/** `apps/vscode/samples/` の見本が、定義として正しく、意図どおりの結果になること。 */
function sample(name: string): string {
  return path.join(SAMPLES_DIR, name);
}

const FIRST_PAGE_FAILURE =
  "<h1> の文字が「今日の学習予定」になっていません (いまは「Web学習を始めました」)";

describe("samples", () => {
  it("first-page は定義が正しく、見出しを直す前は要修正になる", async () => {
    const loaded = await loadTask(sample("first-page"));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const result = await runTask({
      root: loaded.root,
      manifest: loaded.manifest,
      manifestSha256: loaded.manifestSha256,
      env: { PATH: "" },
    });
    expect(result.outcome).toBe("failed");
    const failed = result.steps[0]?.tests?.filter((t) => t.status === "failed");
    expect(failed?.map((t) => t.message)).toEqual([FIRST_PAGE_FAILURE]);
  });

  it("first-page は日本語・空白を含む長いパス (260 文字超) に置いても同じ結果になる", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "stella-sample-"));
    const deep = Array.from({ length: 25 }, () => "とても長いフォルダー名");
    const root = path.join(base, "山田 太郎", "web-training", ...deep, "first-page");
    expect(root.length).toBeGreaterThan(260);
    await cp(sample("first-page"), root, { recursive: true });
    const loaded = await loadTask(root);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const result = await runTask({
      root: loaded.root,
      manifest: loaded.manifest,
      manifestSha256: loaded.manifestSha256,
      env: { PATH: "" },
    });
    expect(result.outcome).toBe("failed");
    expect(result.steps[0]?.tests?.find((t) => t.status === "failed")?.message).toBe(
      FIRST_PAGE_FAILURE,
    );
    // 結果に残るパスは課題フォルダーからの相対パスだけ (受講者の名前やフォルダー名を含めない)。
    expect(result.files.map((f) => f.path)).toEqual(["index.html"]);
    expect(JSON.stringify(result)).not.toContain("山田");
  });

  it("env-check は定義が正しい", async () => {
    const loaded = await loadTask(sample("env-check"));
    expect(loaded.ok).toBe(true);
  });

  it("テンプレートを用意した runner には、すべて見本がある", async () => {
    const loaded = await Promise.all(TEMPLATE_RUNNERS.map((runner) => loadTask(sample(runner))));
    expect(loaded.map((l) => (l.ok ? l.manifest.runner : l.errors.join("\n")))).toEqual([
      ...TEMPLATE_RUNNERS,
    ]);
  });

  // 依存パッケージを入れて実際に動かす確認は、ネットワークが要るので手で行う (samples/README.md)。
  describe.each(TEMPLATE_RUNNERS)("%s (テンプレートから作った見本)", (runner) => {
    it("定義が正しく、テンプレートの項目と環境台帳に合う", async () => {
      const loaded = await loadTask(sample(runner));
      if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
      const fields = await readTaskFields(runner);
      expect(loaded.manifest).toMatchObject({
        runner,
        submit: fields.submit,
        protected: fields.protected,
        // 見本では lint・整形の手順も通す。
        checks: { lint: true, format: true },
      });
      const env = await readEnvironmentFile(fields.environment);
      expect(loaded.manifest.environment).toEqual({
        ...env.requirements,
        id: `${env.id}@${env.version}`,
      });
    });

    it("提出ファイルのほかはテンプレートと同じで、提出ファイルは直す前の状態になっている", async () => {
      const files = await listFiles(sample(runner));
      expect(files).toEqual(await templateFiles(runner));
      const fields = await readTaskFields(runner);
      const submit = matchPatterns(files, fields.submit.files).files;
      const changed: string[] = [];
      for (const file of files) {
        const actual = await readFile(path.join(sample(runner), ...file.split("/")));
        const template = await readFile(templateFile(runner, file));
        if (actual.equals(template)) continue;
        expect(submit, `${file} はテンプレートと同じにしてください`).toContain(file);
        changed.push(file);
      }
      // テンプレートの提出ファイルが「直した後」の形。見本は直す前から始める。
      expect(changed.length).toBeGreaterThan(0);
    });
  });

  describe("ci-deploy (テンプレートから作った見本)", () => {
    const runner = CI_TEMPLATE_RUNNER;
    const execFileAsync = promisify(execFile);

    it("定義が正しく、テンプレートの項目と環境台帳に合う", async () => {
      const loaded = await loadTask(sample(runner));
      if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
      const fields = await readTaskFields(runner);
      expect(loaded.manifest).toMatchObject({
        runner,
        submit: fields.submit,
        protected: fields.protected,
        checks: fields.checks,
        ci: fields.ci,
      });
      const env = await readEnvironmentFile(fields.environment);
      expect(loaded.manifest.environment).toEqual({
        ...env.requirements,
        id: `${env.id}@${env.version}`,
      });
    });

    it("提出ファイルのほかはテンプレートと同じで、ワークフローはテストを待たずに公開する (直す前)", async () => {
      const files = await listFiles(sample(runner));
      expect(files).toEqual(await templateFiles(runner));
      const fields = await readTaskFields(runner);
      const submit = matchPatterns(files, fields.submit.files).files;
      const changed: string[] = [];
      for (const file of files) {
        const actual = await readFile(path.join(sample(runner), ...file.split("/")));
        if (actual.equals(await readFile(templateFile(runner, file)))) continue;
        expect(submit, `${file} はテンプレートと同じにしてください`).toContain(file);
        changed.push(file);
      }
      expect(changed).toEqual([".github/workflows/deploy.yml"]);
      const workflow = await readFile(templateFile(runner, ".github/workflows/deploy.yml"), "utf8");
      const before = await readFile(
        path.join(sample(runner), ".github", "workflows", "deploy.yml"),
        "utf8",
      );
      expect(workflow).toMatch(/^ {4}needs: test$/m);
      expect(before).not.toMatch(/needs: test/);
    });

    it("見本をリポジトリにしてコミットすると、手元の確認が通って提出できる結果になる", async () => {
      const root = path.join(await mkdtemp(path.join(tmpdir(), "stella-sample-")), "公開 の課題");
      await cp(sample(runner), root, { recursive: true });
      const env = {
        ...process.env,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: path.join(tmpdir(), "stella-no-gitconfig"),
        GIT_AUTHOR_NAME: "学習者",
        GIT_AUTHOR_EMAIL: "learner@example.com",
        GIT_COMMITTER_NAME: "学習者",
        GIT_COMMITTER_EMAIL: "learner@example.com",
      };
      const git = (...args: string[]) => execFileAsync("git", args, { cwd: root, env });
      await git("init", "-q");
      await git("add", "-A");
      await git("commit", "-q", "-m", "見本");
      const loaded = await loadTask(root);
      if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
      const ci = {
        runUrl: "https://github.com/yamada/ci-deploy-sample/actions/runs/1",
        deployUrl: "https://yamada.github.io/ci-deploy-sample/",
      };
      const result = await runTask({
        root,
        manifest: loaded.manifest,
        manifestSha256: loaded.manifestSha256,
        ci,
        env,
      });
      expect(result.steps.map((step) => [step.id, step.status])).toEqual([
        ["test", "passed"],
        ["files", "passed"],
      ]);
      expect(result.ci).toEqual({
        ...ci,
        commit: (await git("rev-parse", "HEAD")).stdout.trim(),
      });
      expect(canSubmit(result)).toBe(true);
      expect(JSON.stringify(result)).not.toContain(root);
    });
  });
});

const live = await liveDotnet();

describe("dotnet-test (テンプレートから作った見本)", () => {
  const runner = DOTNET_TEMPLATE_RUNNER;

  async function place(root: string): Promise<void> {
    await mkdir(path.dirname(root), { recursive: true });
    await cp(sample(runner), root, { recursive: true });
  }

  async function runAt(root: string) {
    const loaded = await loadTask(root);
    if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
    return runTask({
      root: loaded.root,
      manifest: loaded.manifest,
      manifestSha256: loaded.manifestSha256,
    });
  }

  it("定義が正しく、テンプレートの項目と環境台帳に合う", async () => {
    const loaded = await loadTask(sample(runner));
    if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
    const fields = await readTaskFields(runner);
    expect(loaded.manifest).toMatchObject({
      runner,
      submit: fields.submit,
      protected: fields.protected,
      checks: fields.checks,
    });
    const env = await readEnvironmentFile(fields.environment);
    expect(loaded.manifest.environment).toEqual({
      ...env.requirements,
      id: `${env.id}@${env.version}`,
    });
  });

  it("提出ファイルのほかはテンプレートと同じで、提出ファイルは直す前の状態になっている", async () => {
    const files = await listFiles(sample(runner));
    expect(files).toEqual(await templateFiles(runner));
    const fields = await readTaskFields(runner);
    const submit = matchPatterns(files, fields.submit.files).files;
    const changed: string[] = [];
    for (const file of files) {
      const actual = await readFile(path.join(sample(runner), ...file.split("/")));
      if (actual.equals(await readFile(templateFile(runner, file)))) continue;
      expect(submit, `${file} はテンプレートと同じにしてください`).toContain(file);
      changed.push(file);
    }
    expect(changed).toEqual(["src/Answers.cs"]);
  });

  it.runIf(live.run)(
    "直す前はテストが失敗し、テンプレートの答えを重ねると通って提出できる",
    async () => {
      if (live.command === null) throw new Error(live.reason);
      const base = await mkdtemp(path.join(tmpdir(), "stella-dotnet-sample-"));
      const root = path.join(base, "task");
      try {
        await place(root);
        const before = await runAt(root);
        expect(before.outcome).toBe("failed");
        expect(before.steps.find((step) => step.id === "build")?.status).toBe("passed");
        const testStep = before.steps.find((step) => step.id === "test");
        expect(testStep?.status).toBe("failed");
        const cases = testStep?.tests ?? [];
        const sum = cases.find((item) => item.name.includes("n: 4"));
        expect(sum?.status).toBe("failed");
        expect(sum?.message).toContain("Expected");
        expect(sum?.message).toContain("Actual");
        const shown = cases.find((item) => item.name.includes("1 行ずつ"));
        expect(shown?.status).toBe("failed");
        expect(shown?.message).toContain("Expected");
        expect(shown?.message).toContain("Actual");

        await writeFile(
          path.join(root, "src", "Answers.cs"),
          await readFile(templateFile(runner, "src/Answers.cs")),
        );
        const fixed = await runAt(root);
        expect(fixed.outcome).toBe("passed");
        expect(canSubmit(fixed)).toBe(true);
      } finally {
        await rm(base, { recursive: true, force: true });
      }
    },
    300_000,
  );

  it.runIf(live.run)(
    "コンパイルエラーはビルドの指摘になり、テストは省略する",
    async () => {
      if (live.command === null) throw new Error(live.reason);
      const base = await mkdtemp(path.join(tmpdir(), "stella-dotnet-build-"));
      const root = path.join(base, "task");
      try {
        await place(root);
        const source = await readFile(path.join(root, "src", "Answers.cs"), "utf8");
        expect(source).toContain("int total = 0;");
        await writeFile(
          path.join(root, "src", "Answers.cs"),
          source.replace("int total = 0;", "int total = 0"),
        );
        const result = await runAt(root);
        expect(result.outcome).toBe("failed");
        const build = result.steps.find((step) => step.id === "build");
        expect(build?.status).toBe("failed");
        expect(
          build?.lint?.some(
            (finding) => finding.file === "src/Answers.cs" && finding.ruleId?.startsWith("CS"),
          ),
        ).toBe(true);
        const testStep = result.steps.find((step) => step.id === "test");
        expect(testStep?.status).toBe("skipped");
        expect(testStep?.summary).toBe("「ビルド (C#)」が通らなかったため省略しました");
      } finally {
        await rm(base, { recursive: true, force: true });
      }
    },
    300_000,
  );

  it.runIf(live.run)(
    "自分自身を呼び続ける Sum はスタックオーバーフローで要修正になる",
    async () => {
      if (live.command === null) throw new Error(live.reason);
      const base = await mkdtemp(path.join(tmpdir(), "stella-dotnet-stack-"));
      const root = path.join(base, "task");
      try {
        await place(root);
        const source = await readFile(path.join(root, "src", "Answers.cs"), "utf8");
        const method = `    public static int Sum(int n)
    {
        int total = 0;
        for (int i = 1; i < n; i++)
        {
            total += i;
        }
        return total;
    }`;
        expect(source).toContain(method);
        await writeFile(
          path.join(root, "src", "Answers.cs"),
          source.replace(method, "    public static int Sum(int n) => n + Sum(n - 1);"),
        );
        const result = await runAt(root);
        expect(result.outcome).toBe("failed");
        const testStep = result.steps.find((step) => step.id === "test");
        expect(testStep?.status).toBe("failed");
        expect(testStep?.summary).toContain("スタックオーバーフロー");
      } finally {
        await rm(base, { recursive: true, force: true });
      }
    },
    300_000,
  );

  it.runIf(live.run)(
    "日本語と空白を含むパスでも、テンプレートの答えで通る",
    async () => {
      if (live.command === null) throw new Error(live.reason);
      const base = await mkdtemp(path.join(tmpdir(), "stella-dotnet-path-"));
      const root = path.join(base, "山田 太郎", "web-training", "課題 1");
      try {
        await place(root);
        await writeFile(
          path.join(root, "src", "Answers.cs"),
          await readFile(templateFile(runner, "src/Answers.cs")),
        );
        const result = await runAt(root);
        expect(result.outcome).toBe("passed");
        expect(canSubmit(result)).toBe(true);
      } finally {
        await rm(base, { recursive: true, force: true });
      }
    },
    300_000,
  );

  it.runIf(live.run)(
    "src の外の Helper.cs はコンパイルされず、src に置けばコンパイルされて提出に入る",
    async () => {
      if (live.command === null) throw new Error(live.reason);
      const base = await mkdtemp(path.join(tmpdir(), "stella-dotnet-compile-"));
      const root = path.join(base, "task");
      const helper = `public static class Helper
{
    public static int Ready() => 0;
}
`;
      try {
        await place(root);
        const source = await readFile(path.join(root, "src", "Answers.cs"), "utf8");
        expect(source).toContain("int total = 0;");
        await writeFile(
          path.join(root, "src", "Answers.cs"),
          source.replace("int total = 0;", "int total = Helper.Ready();"),
        );
        await writeFile(path.join(root, "Helper.cs"), helper);
        const outside = await runAt(root);
        const outsideBuild = outside.steps.find((step) => step.id === "build");
        expect(outsideBuild?.status).toBe("failed");
        expect(
          outsideBuild?.lint?.some(
            (finding) =>
              finding.file === "src/Answers.cs" &&
              finding.ruleId?.startsWith("CS") &&
              finding.message.includes("Helper"),
          ),
        ).toBe(true);

        await rm(path.join(root, "Helper.cs"));
        await writeFile(path.join(root, "src", "Helper.cs"), helper);
        const inside = await runAt(root);
        expect(inside.steps.find((step) => step.id === "build")?.status).toBe("passed");
        expect(inside.files.map((file) => file.path)).toContain("src/Helper.cs");
      } finally {
        await rm(base, { recursive: true, force: true });
      }
    },
    300_000,
  );
});
