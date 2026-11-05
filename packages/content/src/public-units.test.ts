import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { buildContentManifest } from "./manifest.js";

/**
 * ログインなしで読める単元 (`unit.json` の `public`。Issue #41)。
 *
 * dev-env-basics の見本単元を、課題を外した「公開の単元」に作り替えて確かめる。
 * U00〜U01 の本文はまだ無い (人が書く) ので、仕組みは fixture で検証する。
 */

const content = join(dirname(fileURLToPath(import.meta.url)), "..");
const sample = join(content, "stages/dev-env-basics");
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
}

/** dev-env-basics を写し、`m0-first-page` を課題の無い公開の単元にした教材の根。 */
function publicUnitFixture(): { root: string; unit: string; stage: string } {
  const root = mkdtempSync(join(tmpdir(), "stella-public-unit-"));
  roots.push(root);
  mkdirSync(join(root, "stages"));
  const stage = join(root, "stages/dev-env-basics");
  cpSync(sample, stage, { recursive: true });
  for (const name of ["skills.json", "patterns.json", "environments", "sources"])
    cpSync(join(content, name), join(root, name), { recursive: true });
  const unit = join(stage, "modules/m0-first-page");
  rmSync(join(unit, "tasks"), { recursive: true });
  const refs = readJson(join(unit, "references.json"));
  refs.uses = (refs.uses as { contentId: string }[]).filter(
    (u) => !u.contentId.startsWith("tasks/"),
  );
  writeFileSync(join(unit, "references.json"), JSON.stringify(refs, null, 2));
  const config = readJson(join(unit, "unit.json"));
  writeFileSync(join(unit, "unit.json"), JSON.stringify({ ...config, public: true }, null, 2));
  return { root, unit, stage };
}

function editJson(file: string, edit: (value: Record<string, unknown>) => void): void {
  const value = readJson(file);
  edit(value);
  writeFileSync(file, JSON.stringify(value, null, 2));
}

describe("ログインなしで読める単元", () => {
  it("スライドとまとめに印を付け、知識問題と課題には付けない", () => {
    const { root } = publicUnitFixture();
    const manifest = buildContentManifest(join(root, "stages"));
    expect(manifest.units[0].config.public).toBe(true);
    expect(manifest.tasks).toEqual([]);
    const lessons = manifest.stages[0].sections?.[0]?.lessons ?? [];
    expect(lessons.map((l) => [l.id, l.type, l.public === true])).toEqual([
      ["0-1-1", "slides", true],
      ["doc-0-1", "text", true],
      ["quiz-0-1", "quiz", false],
    ]);
    // 単元の参照元は公開のまとめに載る (出典を落とさない)。
    expect(lessons.find((l) => l.id === "doc-0-1")?.markdown).toContain("単元の参照元");
  });

  it("印の無い単元のレッスンには public を持たせない", () => {
    const manifest = buildContentManifest(join(content, "stages"));
    const lessons = manifest.stages.flatMap((c) => (c.sections ?? []).flatMap((s) => s.lessons));
    expect(lessons.length).toBeGreaterThan(0);
    expect(lessons.some((l) => "public" in l)).toBe(false);
  });

  it("課題 (tasks/) のある単元には付けられない", () => {
    const { root, unit } = publicUnitFixture();
    cpSync(join(sample, "modules/m0-first-page/tasks"), join(unit, "tasks"), { recursive: true });
    expect(() => buildContentManifest(join(root, "stages"))).toThrow("課題 (tasks/) を置けません");
  });

  it("専用星 (audience: granted) のステージには付けられない", () => {
    const { root, stage } = publicUnitFixture();
    // granted は前提が要る。親になるステージを足し、このステージをその子にする。
    const parent = join(root, "stages/parent-stage");
    mkdirSync(join(parent, "modules"), { recursive: true });
    writeFileSync(join(parent, "stage.json"), JSON.stringify({ title: "親のステージ" }));
    editJson(join(stage, "stage.json"), (c) => {
      c.audience = "granted";
      c.prerequisites = ["parent-stage"];
    });
    expect(() => buildContentManifest(join(root, "stages"))).toThrow(
      "audience が granted のステージには",
    );
  });

  it("前提のあるステージには付けられない (霧やロックの向こうの本文を漏らさない)", () => {
    const { root, stage } = publicUnitFixture();
    editJson(join(stage, "stage.json"), (c) => {
      c.prerequisites = ["python-basics"];
    });
    expect(() => buildContentManifest(join(root, "stages"))).toThrow(
      "前提のないステージ (スキルツリーの入口) にだけ置けます",
    );
  });

  it("public は true / false だけを受け付ける", () => {
    const { root, unit } = publicUnitFixture();
    editJson(join(unit, "unit.json"), (u) => {
      u.public = "yes";
    });
    expect(() => buildContentManifest(join(root, "stages"))).toThrow("public: true / false");
  });

  it("public: false は印の無い単元と同じ (課題を置ける)", () => {
    const { root, unit } = publicUnitFixture();
    cpSync(join(sample, "modules/m0-first-page/tasks"), join(unit, "tasks"), { recursive: true });
    editJson(join(unit, "unit.json"), (u) => {
      u.public = false;
    });
    const manifest = buildContentManifest(join(root, "stages"));
    expect(manifest.tasks).toHaveLength(1);
    const lessons = manifest.stages[0].sections?.[0]?.lessons ?? [];
    expect(lessons.some((l) => l.public)).toBe(false);
  });
});
