import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { canSubmit } from "@stella/shared/tasks/run-result";
import { describe, expect, it } from "vitest";
import {
  CI_TEMPLATE_RUNNER,
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
