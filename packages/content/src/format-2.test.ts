import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { buildContentManifest } from "./manifest.js";
import { collectPdfTargets } from "./material-pdf.js";
import { parseTaskDefinition, toRuntimeManifest } from "./task-schema.js";

const content = join(dirname(fileURLToPath(import.meta.url)), "..");
const sample = join(content, "courses/dev-env-basics");
const taskFile = join(sample, "modules/m0-first-page/tasks/q01-first-page/task.json");
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "stella-format-2-"));
  roots.push(root);
  mkdirSync(join(root, "courses"));
  cpSync(sample, join(root, "courses/dev-env-basics"), { recursive: true });
  for (const name of ["skills.json", "patterns.json", "environments"])
    cpSync(join(content, name), join(root, name), { recursive: true });
  return root;
}
describe("format 2 の教材", () => {
  it("単元と課題を読み込み、runtime に執筆用の情報と解答を混ぜない", () => {
    const manifest = buildContentManifest(join(fixture(), "courses"));
    expect(manifest.courses[0]).toMatchObject({
      format: 2,
      title: "開発環境とWebの入口",
      duration: 35,
      environment: "static-web-01",
    });
    expect(manifest.units[0].config.plannedHours).toBe(3);
    expect(manifest.units[0].config.skills.assesses).toContain("html-document");
    const task = manifest.tasks[0];
    expect(task.bundle.manifest.environment?.id).toBe("static-web-01@1");
    expect(task.bundle.manifest).not.toHaveProperty("review");
    expect(task.bundle.manifest).not.toHaveProperty("pattern");
    expect(Object.keys(task.bundle.files)).toEqual([
      "index.html",
      "tests/README.md",
      "README.md",
      ".stella/task.json",
    ]);
    expect(task.privateFiles["solution/index.html"]).toBeDefined();
    expect(manifest.quizzes[0].source).toBe("knowledge");
    expect(manifest.quizzes[0].questions.map((q) => q.kind)).toEqual([
      "single",
      "multiple",
      "boolean",
    ]);
  });
  it("非公開領域の本文は、公開用と似た名前でも bundle・レッスン・PDF に混ぜない", () => {
    const root = fixture();
    const taskDir = join(root, "courses/dev-env-basics/modules/m0-first-page/tasks/q01-first-page");
    const marker = "PRIVATE_CONTENT_MARKER_28";
    for (const rel of [
      "private/solution/README.md",
      "private/solution/index.html",
      "private/variants/README.md",
      "private/explanation.md",
      "private/review.md",
      "hints.md",
    ])
      writeFileSync(join(taskDir, rel), marker);
    const manifest = buildContentManifest(join(root, "courses"));
    const task = manifest.tasks[0];
    expect(
      Object.values(task.privateFiles).some((v) => Buffer.from(v, "base64").toString() === marker),
    ).toBe(true);
    const publicText = Object.values(task.bundle.files)
      .map((v) => Buffer.from(v, "base64").toString())
      .join("\n");
    expect(publicText).not.toContain(marker);
    expect(JSON.stringify(manifest.courses)).not.toContain(marker);
    expect(collectPdfTargets(manifest).some((target) => target.source.includes(marker))).toBe(
      false,
    );
  });
  it.each(["README.md", "readme.md", ".stella", "tests", "tests/README.md", "tests/readme.md"])(
    "starter/%s が予約済みの配布パスと衝突したら拒否する",
    (rel) => {
      const root = fixture();
      const file = join(
        root,
        "courses/dev-env-basics/modules/m0-first-page/tasks/q01-first-page/starter",
        rel,
      );
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, "starter must not replace authored files");
      expect(() => buildContentManifest(join(root, "courses"))).toThrow("配布ファイルが衝突");
    },
  );
  it("starter の .stella 内にはファイルを置けない", () => {
    const root = fixture();
    const dir = join(
      root,
      "courses/dev-env-basics/modules/m0-first-page/tasks/q01-first-page/starter/.stella",
    );
    mkdirSync(dir);
    writeFileSync(join(dir, "task.json"), "{}");
    expect(() => buildContentManifest(join(root, "courses"))).toThrow(".stella を置けません");
  });
  it("衝突しない starter/tests のファイルは課題側の tests と一緒に配布する", () => {
    const root = fixture();
    const dir = join(
      root,
      "courses/dev-env-basics/modules/m0-first-page/tasks/q01-first-page/starter/tests",
    );
    mkdirSync(dir);
    writeFileSync(join(dir, "learner-notes.txt"), "learner notes");
    const files = buildContentManifest(join(root, "courses")).tasks[0].bundle.files;
    expect(Buffer.from(files["tests/learner-notes.txt"], "base64").toString()).toBe(
      "learner notes",
    );
    expect(files["tests/README.md"]).toBeDefined();
  });
  it("台帳の未知ID・パスとIDの不一致は検査で落とす", () => {
    const root = fixture();
    const path = join(
      root,
      "courses/dev-env-basics/modules/m0-first-page/tasks/q01-first-page/task.json",
    );
    const original = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    for (const patch of [
      { pattern: "unknown" },
      { sources: ["unknown"] },
      { environment: "../private" },
      { skills: { uses: ["unknown"], assesses: [] } },
      { id: "dev-env-basics/m0-first-page/other" },
    ]) {
      writeFileSync(path, JSON.stringify({ ...original, ...patch }));
      expect(() => buildContentManifest(join(root, "courses"))).toThrow();
    }
  });
  it("確認A・Bの支援と修正課題の記録を検査する", () => {
    const raw = JSON.parse(readFileSync(taskFile, "utf8")) as Record<string, unknown>;
    expect(() => parseTaskDefinition({ ...raw, kind: "assessment-a" }, {})).toThrow();
    expect(() => parseTaskDefinition({ ...raw, kind: "debug" }, {})).toThrow();
    const parsed = parseTaskDefinition(raw, {});
    expect(toRuntimeManifest(parsed, {})).not.toHaveProperty("support");
  });
  it("新形式PDFは公開解説と課題文だけで、旧形式は解答編を維持する", () => {
    const targets = collectPdfTargets();
    const fresh = targets.filter((t) => t.courseSlug === "dev-env-basics");
    expect(fresh.map((t) => t.kind)).toEqual(["doc", "task"]);
    expect(fresh.find((t) => t.kind === "task")?.source).toContain("単元の参照元");
    expect(fresh.some((t) => /<details>|解答例/.test(t.source))).toBe(false);
    expect(
      targets.some(
        (t) =>
          t.courseSlug === "salesforce-dev-basics" &&
          t.kind === "practice" &&
          t.source.includes("解答例と解説"),
      ),
    ).toBe(true);
  });
});
