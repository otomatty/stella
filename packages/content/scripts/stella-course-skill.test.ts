import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const scaffold = join(repoRoot, ".claude", "skills", "stella-course", "scripts", "scaffold.mjs");
const installSkill = join(repoRoot, "scripts", "install-skill.mjs");
const content = join(repoRoot, "packages", "content");
const temps: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "stella-course-"));
  temps.push(dir);
  return dir;
}

function copyInstallScript(dir: string): string {
  const script = join(dir, "scripts", "install-skill.mjs");
  mkdirSync(join(dir, "scripts"), { recursive: true });
  cpSync(installSkill, script);
  return script;
}

function run(script: string, args: string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("node", [script, ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const failed = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failed.status ?? 1,
      stdout: failed.stdout ?? "",
      stderr: failed.stderr ?? "",
    };
  }
}

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("scaffold.mjs", () => {
  function taskArgs(stages: string, runner: string, task: string, kind = "basic"): string[] {
    return [
      "task",
      "--content",
      content,
      "--stages",
      stages,
      "--stage",
      "demo",
      "--unit",
      "m0",
      "--task",
      task,
      "--runner",
      runner,
      "--kind",
      kind,
      "--title",
      "下書き",
    ];
  }

  it("help を出す", () => {
    const result = run(scaffold, ["help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--runner");
  });

  it("node-test と dotnet-test の形を作り、既存のフォルダーは上書きしない", () => {
    const stages = tempDir();
    const node = run(scaffold, taskArgs(stages, "node-test", "q01-greet"));
    expect(node.status, node.stderr).toBe(0);
    const nodeDir = join(stages, "demo", "modules", "m0", "tasks", "q01-greet");
    const nodeTask = JSON.parse(readFileSync(join(nodeDir, "task.json"), "utf8")) as {
      id: string;
      runner: string;
      environment: string;
      pattern: string;
      checks: { lint: boolean };
      submit: { files: string[]; explanation: boolean };
      support: { hintLevels: number };
    };
    expect(nodeTask).toMatchObject({
      id: "demo/m0/q01-greet",
      runner: "node-test",
      environment: "node-test-01",
      pattern: "html-page",
      checks: { lint: true, format: true },
      support: { hintLevels: 2, solutionUnlock: "after-hints" },
    });
    expect(nodeTask.submit.files).toContain("src/greet.js");
    expect(nodeTask.submit.explanation).toBe(false);
    const greet = readFileSync(join(nodeDir, "starter", "src", "greet.js"), "utf8");
    expect(readFileSync(join(nodeDir, "private", "solution", "src", "greet.js"), "utf8")).toBe(
      greet,
    );
    expect(readFileSync(join(nodeDir, "tests", "greet.test.js"), "utf8")).toContain("greet");
    expect(readFileSync(join(nodeDir, "hints.md"), "utf8")).toContain("## ヒント2");
    expect(readFileSync(join(nodeDir, "private", "variants", ".gitkeep"), "utf8")).toBe("");

    writeFileSync(join(nodeDir, "starter", "src", "greet.js"), "export const kept = true;\n");
    const again = run(scaffold, taskArgs(stages, "node-test", "q01-greet"));
    expect(again.status).not.toBe(0);
    expect(again.stderr).toContain("上書きしません");
    expect(readFileSync(join(nodeDir, "starter", "src", "greet.js"), "utf8")).toContain("kept");

    const dotnet = run(scaffold, taskArgs(stages, "dotnet-test", "q02-sum", "debug"));
    expect(dotnet.status, dotnet.stderr).toBe(0);
    const dotnetDir = join(stages, "demo", "modules", "m0", "tasks", "q02-sum");
    const dotnetTask = JSON.parse(readFileSync(join(dotnetDir, "task.json"), "utf8")) as {
      runner: string;
      checks: { lint: boolean; format: boolean };
      submit: { debuggingRecord: boolean };
      pattern: string;
      protected: string[];
    };
    expect(dotnetTask.runner).toBe("dotnet-test");
    expect(dotnetTask.checks).toEqual({ lint: false, format: false });
    expect(dotnetTask.submit.debuggingRecord).toBe(true);
    expect(dotnetTask.pattern).toBe("html-page");
    expect(dotnetTask.protected).toContain("Task.csproj");
    expect(readFileSync(join(dotnetDir, "starter", "src", "Answers.cs"), "utf8")).toContain(
      "class Answers",
    );
    expect(
      readFileSync(join(dotnetDir, "private", "solution", "src", "Answers.cs"), "utf8"),
    ).toContain("class Answers");
    expect(readFileSync(join(dotnetDir, "tests", "AnswersTests.cs"), "utf8")).toContain("Fact");
  });

  it("同じ単元の既存の課題から pattern と skills を写す", () => {
    const stages = tempDir();
    const first = run(scaffold, taskArgs(stages, "node-test", "q01-greet"));
    expect(first.status, first.stderr).toBe(0);
    const sibling = join(stages, "demo", "modules", "m0", "tasks", "q01-greet", "task.json");
    const raw = JSON.parse(readFileSync(sibling, "utf8")) as { pattern: string };
    raw.pattern = "from-sibling";
    writeFileSync(sibling, JSON.stringify(raw));
    const second = run(scaffold, taskArgs(stages, "node-test", "q02-next", "assessment-a"));
    expect(second.status, second.stderr).toBe(0);
    const task = JSON.parse(
      readFileSync(join(stages, "demo", "modules", "m0", "tasks", "q02-next", "task.json"), "utf8"),
    ) as {
      pattern: string;
      support: { hintLevels: number; solutionUnlock: string };
      submit: { explanation: boolean };
    };
    expect(task.pattern).toBe("from-sibling");
    expect(task.support).toEqual({ hintLevels: 0, solutionUnlock: "passed" });
    expect(task.submit.explanation).toBe(true);
    expect(
      readFileSync(
        join(stages, "demo", "modules", "m0", "tasks", "q02-next", "hints.md"),
        "utf8",
      ).trim(),
    ).toMatch(/^<!--/);
  });
});

describe("install-skill.mjs", () => {
  it("スキルを写し、前の中身を消し、SOURCE.json を書く", () => {
    const dest = tempDir();
    const previous = join(dest, "stella-course", "obsolete.txt");
    mkdirSync(join(dest, "stella-course"), { recursive: true });
    writeFileSync(previous, "old");

    const result = run(installSkill, ["--dest", dest]);
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(dest, "stella-course", "SKILL.md"), "utf8")).toContain(
      "name: stella-course",
    );
    expect(readFileSync(join(dest, "stella-course", "references", "csharp.md"), "utf8")).toContain(
      "dotnet-test",
    );
    expect(() => readFileSync(previous, "utf8")).toThrow();
    const source = JSON.parse(readFileSync(join(dest, "stella-course", "SOURCE.json"), "utf8")) as {
      repository: string;
      commit?: string;
      copiedAt: string;
    };
    expect(source.repository).toBe("otomatty/stella");
    expect(source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(Number.isNaN(Date.parse(source.copiedAt))).toBe(false);
  });

  it("無いスキルでは止まって行き先を作らない", () => {
    const dest = tempDir();
    const result = run(installSkill, ["missing-skill", "--dest", dest]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("スキルがありません");
    expect(() => readFileSync(join(dest, "missing-skill", "SOURCE.json"), "utf8")).toThrow();
  });

  it("シンボリックリンクがあると写さない", () => {
    const name = `stella-course-link-probe-${process.pid}-${Date.now().toString(36)}`;
    const source = join(repoRoot, ".claude", "skills", name);
    const dest = tempDir();
    mkdirSync(source);
    mkdirSync(join(source, "nested"), { recursive: true });
    writeFileSync(join(source, "SKILL.md"), "# probe\n");
    writeFileSync(join(source, "nested", "a.txt"), "a\n");
    let linked = true;
    try {
      symlinkSync(join(source, "nested"), join(source, "linked"), "junction");
    } catch {
      try {
        symlinkSync(join(source, "SKILL.md"), join(source, "link.md"));
      } catch {
        linked = false;
      }
    }
    try {
      expect(linked).toBe(true);
      const result = run(installSkill, [name, "--dest", dest]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("シンボリックリンク");
      expect(() => readFileSync(join(dest, name, "SOURCE.json"), "utf8")).toThrow();
    } finally {
      rmSync(source, { recursive: true, force: true });
    }
  });

  it("行き先のリンクがスキル自身なら消さない", () => {
    const name = `stella-course-self-dest-${process.pid}-${Date.now().toString(36)}`;
    const skillsDir = join(repoRoot, ".claude", "skills");
    const source = join(skillsDir, name);
    const destParent = tempDir();
    const link = join(destParent, "skills");
    mkdirSync(source);
    try {
      writeFileSync(join(source, "SKILL.md"), "# probe\n");
      let linked = true;
      try {
        symlinkSync(skillsDir, link, "junction");
      } catch {
        linked = false;
      }
      expect(linked).toBe(true);
      const result = run(installSkill, [name, "--dest", link]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("行き先がスキル自身です");
      expect(readFileSync(join(source, "SKILL.md"), "utf8")).toBe("# probe\n");
    } finally {
      try {
        unlinkSync(link);
      } catch {
        // リンクを作れなかったときは外すものがない
      }
      let body: string | undefined;
      try {
        body = readFileSync(join(source, "SKILL.md"), "utf8");
      } catch {
        body = undefined;
      }
      rmSync(source, { recursive: true, force: true });
      expect(body).toBe("# probe\n");
    }
  });

  it("親のリポジトリのコミットを記録しない", () => {
    const outer = join(tempDir(), "outer");
    mkdirSync(outer);
    execFileSync("git", ["init"], { cwd: outer, stdio: "ignore" });
    execFileSync(
      "git",
      [
        "-c",
        "user.name=t",
        "-c",
        "user.email=t@example.com",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "--allow-empty",
        "-m",
        "init",
      ],
      { cwd: outer, stdio: "ignore" },
    );
    const checkout = join(outer, "vendor", "stella");
    const script = copyInstallScript(checkout);
    mkdirSync(join(checkout, ".claude", "skills", "probe"), { recursive: true });
    writeFileSync(join(checkout, ".claude", "skills", "probe", "SKILL.md"), "# probe\n");
    const dest = tempDir();

    const result = run(script, ["probe", "--dest", dest]);
    expect(result.status, result.stderr).toBe(0);
    const source = JSON.parse(readFileSync(join(dest, "probe", "SOURCE.json"), "utf8")) as {
      repository?: string;
      commit?: string;
    };
    expect(source.repository).toBe("otomatty/stella");
    expect(source.commit).toBeUndefined();
  });

  it("`..` で始まる名前のフォルダーも親として見る", () => {
    const root = tempDir();
    const checkout = join(root, "stella-course", "..work");
    const script = copyInstallScript(checkout);
    const skill = join(checkout, ".claude", "skills", "stella-course", "SKILL.md");
    mkdirSync(join(checkout, ".claude", "skills", "stella-course"), { recursive: true });
    writeFileSync(skill, "# probe\n");

    const result = run(script, ["stella-course", "--dest", root]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("行き先がスキル自身です");
    expect(readFileSync(skill, "utf8")).toBe("# probe\n");
  });
});
