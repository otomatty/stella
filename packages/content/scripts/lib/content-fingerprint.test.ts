import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { SEED_INPUT_PATHS, fingerprintFrom, parseContentState } from "./content-fingerprint.js";

const rootDir = fileURLToPath(new URL("../../../..", import.meta.url));

/** seed・PDF・画像アップロードの入口。ここから値 import を辿る。 */
const GENERATORS = [
  "packages/shared/scripts/export-seed-sql.ts",
  "packages/content/scripts/upload-pdfs.ts",
  "packages/content/scripts/upload-materials.ts",
  "packages/content/scripts/build-pdf.ts",
  "apps/api/scripts/seed-d1.ts",
];

/**
 * import に出ないが、生成コードが readFileSync で読んで結果に入るファイル。
 * どれかをやめるときは SEED_INPUT_PATHS からも外す。
 */
const READ_BY_PATH = [
  "packages/content/courses",
  "packages/content/coding-rules.md",
  "packages/content/skills.json",
  "packages/content/patterns.json",
  "packages/content/environments",
  "packages/content/sources/registry.json",
  "packages/content/scripts/pdf/print-doc.css",
  "apps/web/src/components/learner/slides-skin.css",
  "apps/api/drizzle",
];

function covers(file: string): boolean {
  return SEED_INPUT_PATHS.some((p) => file === p || file.startsWith(`${p}/`));
}

const VALUE_SPEC = /\b(?:import|export)\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
const SIDE_EFFECT_SPEC = /\bimport\s+["']([^"']+)["']/g;

/** 型だけの import / export は実行時の SQL も PDF も変えない。 */
function valueSpecs(text: string): string[] {
  const specs: string[] = [];
  for (const match of text.matchAll(VALUE_SPEC)) {
    const clause = match[1]?.trim() ?? "";
    const spec = match[2];
    if (spec === undefined || clause.startsWith("type ")) continue;
    if (clause.startsWith("{")) {
      const inner = clause.slice(1, clause.lastIndexOf("}"));
      const parts = inner
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      if (parts.length > 0 && parts.every((part) => part.startsWith("type "))) continue;
    }
    specs.push(spec);
  }
  for (const match of text.matchAll(SIDE_EFFECT_SPEC)) {
    const spec = match[1];
    if (spec !== undefined) specs.push(spec);
  }
  return specs;
}

function resolveModule(fromAbs: string, spec: string): string | null {
  let target: string | null = null;
  if (spec === "@stella/content") target = join(rootDir, "packages/content/src/index.ts");
  else if (spec.startsWith(".")) target = resolve(dirname(fromAbs), spec);
  else return null;
  const bare = target.replace(/\.js$/, "");
  for (const candidate of [
    target,
    `${bare}.ts`,
    `${bare}.tsx`,
    `${bare}.mjs`,
    `${bare}.json`,
    join(bare, "index.ts"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** 入口から値 import を辿ったリポジトリ内のファイル。解決できない import は throw。 */
function generatorInputs(): string[] {
  const seen = new Set<string>();
  const pending = GENERATORS.map((file) => join(rootDir, file));
  const unresolved: string[] = [];
  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    for (const spec of valueSpecs(readFileSync(file, "utf8"))) {
      if (spec.startsWith("@stella/") && spec !== "@stella/content") {
        unresolved.push(`${spec} (${relative(rootDir, file)})`);
        continue;
      }
      const found = resolveModule(file, spec);
      if (spec.startsWith(".") && found === null)
        unresolved.push(`${spec} (${relative(rootDir, file)})`);
      else if (found !== null) pending.push(found);
    }
  }
  if (unresolved.length > 0) {
    throw new Error(`生成コードの import を解決できません:\n${unresolved.join("\n")}`);
  }
  return [...seen].map((file) => relative(rootDir, file).replaceAll("\\", "/")).sort();
}

describe("SEED_INPUT_PATHS", () => {
  /**
   * 指紋が見ていないファイルを生成が読んでいると、そのファイルだけ変えた push で
   * 教材パイプラインが飛ばされる。値 import は入口から辿り、パスで読む台帳は
   * READ_BY_PATH に足す。
   */
  it("seed と PDF の生成が読むファイルを全部覆う", () => {
    const missing = generatorInputs().filter((file) => !covers(file));
    expect(missing).toEqual([]);
    for (const file of READ_BY_PATH) expect(covers(file), file).toBe(true);
  });

  it("API の実装や seed 以外のスクリプトでは走らない", () => {
    expect(covers("packages/shared/src/review/review-desk.ts")).toBe(false);
    expect(covers("packages/shared/src/tasks/local-report.ts")).toBe(false);
    expect(covers("apps/api/scripts/core-loop-smoke.ts")).toBe(false);
    expect(covers("apps/api/src/index.ts")).toBe(false);
    expect(covers("packages/content/CLAUDE.md")).toBe(false);
    expect(covers("apps/web/src/data/types.ts")).toBe(false);
  });

  it("git がその範囲を追えている (パスの綴り間違いで空にならない)", () => {
    for (const path of SEED_INPUT_PATHS) {
      const out = execFileSync("git", ["ls-files", "--", path], {
        cwd: rootDir,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
      expect(out.trim().length, `${path} に追跡ファイルが無い`).toBeGreaterThan(0);
    }
  });
});

describe("fingerprintFrom", () => {
  const lines = "100644 aaa 0\tpackages/content/a.md\n100644 bbb 0\tpackages/content/b.md\n";

  it("並びが違うだけなら同じ指紋になる", () => {
    const reordered = "100644 bbb 0\tpackages/content/b.md\n100644 aaa 0\tpackages/content/a.md\n";
    expect(fingerprintFrom(lines, SEED_INPUT_PATHS)).toBe(
      fingerprintFrom(reordered, SEED_INPUT_PATHS),
    );
  });

  it("blob が 1 つ変われば指紋が変わる", () => {
    const changed = lines.replace("bbb", "ccc");
    expect(fingerprintFrom(changed, SEED_INPUT_PATHS)).not.toBe(
      fingerprintFrom(lines, SEED_INPUT_PATHS),
    );
  });

  it("リポジトリ外の入力 (PDF_KEY_SALT) が変われば指紋が変わる", () => {
    // 塩は PDF の R2 キーに入る。替えたのに「変わっていない」と判定すると、
    // 全キーが変わったまま PDF 生成と seed が走らない。
    const withSalt = fingerprintFrom(lines, SEED_INPUT_PATHS, { pdfKeySalt: "aaa" });
    expect(withSalt).not.toBe(fingerprintFrom(lines, SEED_INPUT_PATHS, { pdfKeySalt: "bbb" }));
    expect(withSalt).not.toBe(fingerprintFrom(lines, SEED_INPUT_PATHS, { pdfKeySalt: "none" }));
    expect(withSalt).toBe(fingerprintFrom(lines, SEED_INPUT_PATHS, { pdfKeySalt: "aaa" }));
  });

  it("対象パスを足したら指紋が変わる (新しい入力を見ない回が出ないように)", () => {
    expect(fingerprintFrom(lines, [...SEED_INPUT_PATHS, "apps/api/src"])).not.toBe(
      fingerprintFrom(lines, SEED_INPUT_PATHS),
    );
  });
});

describe("parseContentState", () => {
  it("形が違う記録は無視する (= フル実行に倒す)", () => {
    expect(parseContentState("{}")).toBeNull();
    expect(parseContentState("not json")).toBeNull();
    expect(parseContentState(JSON.stringify({ version: 2, fingerprint: "x" }))).toBeNull();
    expect(
      parseContentState(JSON.stringify({ version: 1, fingerprint: "x", updatedAt: "t" })),
    ).toMatchObject({ fingerprint: "x" });
  });
});
