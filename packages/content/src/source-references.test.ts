import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkSourceReferences,
  createLegacyBaseline,
  unitContentHash,
} from "./check-source-references.js";
import { buildContentManifest } from "./manifest.js";
import { collectPdfTargets, pdfSourceHash } from "./material-pdf.js";
import {
  publicReferences,
  readSourceRefs,
  readSourceRegistry,
  readUnitReferences,
  referencesMarkdown,
} from "./source-references.js";

const content = join(dirname(fileURLToPath(import.meta.url)), "..");
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "stella-sources-"));
  roots.push(root);
  mkdirSync(join(root, "courses"));
  cpSync(join(content, "courses/dev-env-basics"), join(root, "courses/dev-env-basics"), {
    recursive: true,
  });
  for (const name of ["skills.json", "patterns.json", "environments", "sources"])
    cpSync(join(content, name), join(root, name), { recursive: true });
  const registry = JSON.parse(readFileSync(join(root, "sources/registry.json"), "utf8"));
  // この承認はテストデータだけ。実教材の草稿を承認済みにしない。
  registry.sources[0].review = {
    status: "approved",
    reviewer: "fixture-reviewer",
    reviewedAt: "2026-10-05",
    scope: "test fixture",
  };
  writeFileSync(join(root, "sources/registry.json"), JSON.stringify(registry));
  const unit = join(root, "courses/dev-env-basics/modules/m0-first-page");
  const refs = JSON.parse(readFileSync(join(unit, "references.json"), "utf8"));
  for (const use of refs.uses) use.reviewStatus = "approved";
  writeFileSync(join(unit, "references.json"), JSON.stringify(refs));
  return { root, unit };
}
function patch(file: string, change: (row: Record<string, unknown>) => void) {
  const row = JSON.parse(readFileSync(file, "utf8"));
  change(row);
  writeFileSync(file, JSON.stringify(row));
}
describe("参照元の公開ゲートと表示", () => {
  it("承認済みで具体的な参照と環境がある単元は通す", () => {
    const { root } = fixture();
    expect(checkSourceReferences(root)).toEqual([]);
  });
  it.each([
    "unregistered",
    "landing",
    "draft",
    "usage-draft",
    "environment",
    "version",
    "missing-mapping",
    "missing-frontmatter",
  ])("%s を必須単元のエラーにする", (kind) => {
    const { root, unit } = fixture();
    if (["unregistered", "landing", "draft"].includes(kind))
      patch(join(root, "sources/registry.json"), (row) => {
        const sources = row.sources as Record<string, unknown>[];
        if (kind === "unregistered") row.sources = [];
        if (kind === "landing") sources[0].url = "https://react.dev/";
        if (kind === "draft") sources[0].review = { status: "draft" };
      });
    else if (kind === "missing-frontmatter") {
      const file = join(unit, "l1-save-and-preview/doc.md");
      writeFileSync(file, readFileSync(file, "utf8").replace(/^---\n[\s\S]*?\n---\n/, ""));
    } else
      patch(join(unit, "references.json"), (row) => {
        const uses = row.uses as Record<string, unknown>[];
        if (kind === "usage-draft") uses[0].reviewStatus = "draft";
        if (kind === "environment") row.environmentRef = "absent@1";
        if (kind === "version") row.environmentRef = "static-web-01@99";
        if (kind === "missing-mapping") row.uses = uses.slice(1);
      });
    expect(checkSourceReferences(root).some((d) => d.severity === "error")).toBe(true);
  });
  it("旧形式は未改訂の不足を警告、新規・本文改訂をエラーにする", () => {
    const { root, unit } = fixture();
    patch(join(root, "courses/dev-env-basics/course.json"), (row) => {
      delete row.format;
    });
    rmSync(join(unit, "references.json"));
    const baseline = createLegacyBaseline(root, "test-base");
    expect(checkSourceReferences(root, baseline).every((d) => d.severity === "warning")).toBe(true);
    const doc = join(unit, "l1-save-and-preview/doc.md");
    writeFileSync(doc, readFileSync(doc, "utf8") + "\n新しい説明を加える。\n");
    expect(checkSourceReferences(root, baseline).some((d) => d.severity === "error")).toBe(true);
    cpSync(unit, join(root, "courses/dev-env-basics/modules/m1-new"), { recursive: true });
    expect(
      checkSourceReferences(root, baseline).some(
        (d) => d.unitId.endsWith("/m1-new") && d.severity === "error",
      ),
    ).toBe(true);
    baseline.exemptions.push({
      unitId: "dev-env-basics/m0-first-page",
      contentHash: unitContentHash(unit, "static-web-01"),
      reason: "表記だけの修正を確認",
      reviewer: "fixture-reviewer",
      reviewedAt: "2026-10-05",
    });
    expect(
      checkSourceReferences(root, baseline)
        .filter((d) => d.unitId.endsWith("/m0-first-page"))
        .every((d) => d.severity === "warning"),
    ).toBe(true);
  });
  it("前提の変更と参照元の追記では未改訂の基準を変えない", () => {
    const { root, unit } = fixture();
    const before = unitContentHash(unit, "static-web-01");
    writeFileSync(join(unit, "references.json"), "{}");
    patch(join(root, "courses/dev-env-basics/course.json"), (row) => {
      row.parent = "another";
    });
    expect(unitContentHash(unit, "static-web-01")).toBe(before);
  });
  it("本文・単元末尾・IDEの配布manifest・PDFから同じ出典を読める", () => {
    const { root } = fixture();
    const manifest = buildContentManifest(join(root, "courses"));
    const publicTask = manifest.tasks[0].bundle;
    expect(publicTask.manifest.references?.[0]).toMatchObject({
      publisher: "MDN Web Docs contributors",
      environmentRef: "static-web-01@1",
      authorship: "original-exercise",
    });
    expect(JSON.stringify(publicTask)).not.toContain("fixture-reviewer");
    const lessons = manifest.courses[0].sections?.flatMap((s) => s.lessons) ?? [];
    const doc = lessons.find((l) => l.id.startsWith("doc-"));
    expect(doc?.markdown).toContain("確認すること:");
    expect(doc?.markdown).not.toContain("sourceRefs:");
    const quiz = lessons.find((l) => l.type === "quiz");
    expect(quiz?.markdown).toContain("教材独自の課題");
    expect(quiz?.markdown).toContain("MDN Web Docs contributors");
    expect(quiz?.markdown).not.toContain("<details>");
    expect(quiz?.markdown).not.toContain("### Q1.");
    expect(lessons.at(-1)?.markdown).toContain("単元の参照元");
    const targets = collectPdfTargets(manifest);
    expect(targets.every((t) => t.source.includes("MDN Web Docs contributors"))).toBe(true);
    const first = targets[0];
    expect(pdfSourceHash({ ...first, source: first.source + "参照元の更新" })).not.toBe(
      pdfSourceHash(first),
    );
  });
  it("引用・改変は条件と帰属表示を必須にし、private への参照を拒否する", () => {
    const { root, unit } = fixture();
    patch(join(unit, "references.json"), (row) => {
      (row.uses as Record<string, unknown>[])[0].reuse = "quote";
    });
    expect(checkSourceReferences(root).some((d) => d.message.includes("attribution"))).toBe(true);
    patch(join(root, "sources/registry.json"), (row) => {
      (row.sources as Record<string, unknown>[])[0].url = "https://example.org/private/solution.md";
    });
    expect(() => checkSourceReferences(root)).toThrow("HTTP(S)");
  });
  it("図の出典も解説の近くに出し、帰属表示を省略しない", () => {
    const { root, unit } = fixture();
    const assets = join(unit, "l1-save-and-preview/t1-saved-html/assets");
    mkdirSync(assets);
    writeFileSync(join(assets, "page.svg"), "<svg/>");
    const doc = join(unit, "l1-save-and-preview/doc.md");
    writeFileSync(doc, readFileSync(doc, "utf8") + "\n![図](t1-saved-html/assets/page.svg)\n");
    patch(join(unit, "references.json"), (row) => {
      (row.uses as Record<string, unknown>[]).push({
        contentId: "l1-save-and-preview/t1-saved-html/assets/page.svg",
        sourceRefs: ["SRC-mdn-html-20261005"],
        usedFor: "図で説明する概念",
        authorship: "adapted",
        reuse: "adapt-diagram",
        reviewStatus: "approved",
        attribution: {
          text: "Original diagram credit",
          creator: "Fixture author",
          scope: "全体",
          conditionsUrl: "https://example.org/license",
          checkedAt: "2026-10-05",
          displayAt: "l1-save-and-preview/t1-saved-html/assets/page.svg",
        },
      });
    });
    expect(checkSourceReferences(root)).toEqual([]);
    const manifest = buildContentManifest(join(root, "courses"));
    const markdown = manifest.courses[0].sections?.[0].lessons.find((l) =>
      l.id.startsWith("doc-"),
    )?.markdown;
    expect(markdown).toContain("Original diagram credit");
    const registry = readSourceRegistry(root);
    const refs = readUnitReferences(unit);
    expect(referencesMarkdown(publicReferences(refs, registry))).toContain(
      "Original diagram credit",
    );
  });
  it("空配列で独自制作を明示でき、不正な front-matter を黙って捨てない", () => {
    expect(readSourceRefs("---\nsourceRefs: []\n---\n本文")).toEqual([]);
    expect(() => readSourceRefs("---\nsourceRefs: unknown\n---\n本文")).toThrow("インライン配列");
  });
});
