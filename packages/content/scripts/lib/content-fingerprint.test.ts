import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { SEED_INPUT_PATHS, fingerprintFrom, parseContentState } from "./content-fingerprint.js";

const rootDir = fileURLToPath(new URL("../../../..", import.meta.url));

describe("SEED_INPUT_PATHS", () => {
  /**
   * 指紋が見ていないファイルを seed が読んでいると、そのファイルだけ変えた push で
   * 教材パイプラインが飛ばされる。export-seed-sql.ts が実際に import している
   * ワークスペース外のパスをここで押さえる。
   */
  it("export-seed-sql の入力を全部覆う", () => {
    const mustCover = [
      "packages/content/courses/it-basics/course.json",
      "packages/content/src/manifest.ts",
      "packages/shared/src/interview/questions.json",
      "packages/shared/scripts/export-seed-sql.ts",
      "apps/web/src/data/seed-catalog.ts",
      "apps/api/scripts/seed-d1.ts",
    ];
    for (const file of mustCover) {
      expect(SEED_INPUT_PATHS.some((p) => file.startsWith(`${p}/`))).toBe(true);
    }
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
