import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  type AssignmentResolver,
  checkSourceReferences,
  createLegacyBaseline,
  isTechnologyLandingPage,
  resolveSharedAssignment,
  sharedAssignmentResolver,
  unitContentHash,
} from "./check-source-references.js";
import { buildContentManifest } from "./manifest.js";
import { collectPdfTargets, pdfSourceHash } from "./material-pdf.js";
import { findAssignment } from "../../shared/src/problems/index.js";
import {
  getEntryFile,
  getLanguage,
  getStaticAnalysisSettings,
} from "../../shared/src/assignment-helpers.js";
import {
  parseUnitReferences,
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
    "dev-env-basics/m0-first-page",
    "dev-env-basics/m0-first-page@",
    "dev-env-basics/m0-first-page@1@2",
    "dev-env-basics/m0-first-page@draft",
    "dev-env-basics/m0-first-page@1.",
    "dev-env-basics/m0-first-page@1.0/extra",
    "dev-env-basics/m0-first-page@1 2",
    "dev-env-basics/m0-first-page@01",
    "dev-env-basics/another@1",
  ])("版を含む unitId の形式と対応先を検査する: %s", (unitId) => {
    const { root, unit } = fixture();
    patch(join(unit, "references.json"), (row) => {
      row.unitId = unitId;
    });
    expect(checkSourceReferences(root)).toEqual([
      expect.objectContaining({ severity: "error", message: expect.stringContaining("unitId") }),
    ]);
  });
  it("ドット区切りの版を持つ単元も検査を通す", () => {
    const { root, unit } = fixture();
    patch(join(unit, "references.json"), (row) => {
      row.unitId = "dev-env-basics/m0-first-page@1.0.0";
    });
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
      row.prerequisites = ["another"];
      row.appearances = ["new-island"];
      row.appearancePrerequisites = { "new-island": ["another"] };
    });
    expect(unitContentHash(unit, "static-web-01")).toBe(before);
  });
  it.each(["id", "title"])(
    "旧演習の %s の変更は該当単元だけを公開検査の必須対象にする",
    (field) => {
      const { root } = fixture();
      const course = join(root, "courses/fe-kamoku-b");
      cpSync(join(content, "courses/fe-kamoku-b"), course, { recursive: true });
      const baseline = createLegacyBaseline(root, "test-base");
      expect(checkSourceReferences(root, baseline).every((d) => d.severity === "warning")).toBe(
        true,
      );
      patch(join(course, "course.json"), (row) => {
        const exercises = row.exercises as Record<string, Record<string, string>[]>;
        exercises["1-1"][0][field] = `changed-${field}`;
      });
      const errors = checkSourceReferences(root, baseline).filter((d) => d.severity === "error");
      expect(new Set(errors.map((d) => d.unitId))).toEqual(new Set(["fe-kamoku-b/m1-pseudo"]));
    },
  );
  it("講座の到達目標の変更は全単元、単元名の変更は該当単元を改訂済みとして扱う", () => {
    const { root } = fixture();
    const course = join(root, "courses/fe-kamoku-b");
    cpSync(join(content, "courses/fe-kamoku-b"), course, { recursive: true });
    const baseline = createLegacyBaseline(root, "test-base");
    patch(join(course, "course.json"), (row) => {
      (row.modules as Record<string, string>)["m1-pseudo"] = "変更した単元名";
    });
    const errors = () =>
      new Set(
        checkSourceReferences(root, baseline)
          .filter((d) => d.severity === "error")
          .map((d) => d.unitId),
      );
    expect(errors()).toEqual(new Set(["fe-kamoku-b/m1-pseudo"]));
    patch(join(course, "course.json"), (row) => {
      row.canDo = "変更した到達目標";
    });
    expect(errors()).toEqual(new Set(Object.keys(baseline.units)));
  });
  describe("旧演習の課題定義 (packages/shared/src/problems) を指紋に含める", () => {
    const edited = "S0-FePseudo-Ch00-01-max-of-two";
    function withEdit(change: (definition: Record<string, unknown>) => void): AssignmentResolver {
      return (id) => {
        const definition = resolveSharedAssignment(id);
        if (id !== edited) return definition;
        const copy = structuredClone(definition) as Record<string, unknown>;
        change(copy);
        return copy;
      };
    }
    it.each<[string, (definition: Record<string, unknown>) => void]>([
      ["説明", (d) => (d.description = `${d.description}\n補足を加えた。`)],
      ["テスト", (d) => (d.tests = [...(d.tests as unknown[]), { name: "追加", code: "true" }])],
      ["スターター", (d) => (d.starterFiles = [])],
      ["解答", (d) => (d.solution = "// 別の解答")],
      ["採点設定", (d) => (d.staticAnalysis = { eslint: { rules: { eqeqeq: "off" } }, ast: {} })],
    ])("同じ ID のまま %s を変えると該当単元だけを必須にする", (_label, change) => {
      const { root } = fixture();
      cpSync(join(content, "courses/fe-kamoku-b"), join(root, "courses/fe-kamoku-b"), {
        recursive: true,
      });
      const baseline = createLegacyBaseline(root, "test-base");
      expect(checkSourceReferences(root, baseline).every((d) => d.severity === "warning")).toBe(
        true,
      );
      const errors = checkSourceReferences(root, baseline, withEdit(change)).filter(
        (d) => d.severity === "error",
      );
      expect(new Set(errors.map((d) => d.unitId))).toEqual(new Set(["fe-kamoku-b/m1-pseudo"]));
    });
    it("seed と同じく Lint プリセットを合成した採点設定で比べ、既定値の明示だけでは変えない", () => {
      const unit = join(content, "courses/fe-kamoku-b/modules/m1-pseudo");
      const shared = { findAssignment, getEntryFile, getLanguage, getStaticAnalysisSettings };
      const before = unitContentHash(unit, undefined, sharedAssignmentResolver(shared));
      expect(before).not.toBe(unitContentHash(unit, undefined, () => null));
      // 擬似言語の課題は entryFile に starterFiles[0] と同じ main.fe を明示している。
      // 省略しても seed が投入する入口ファイルは変わらない。
      const implicitEntry = sharedAssignmentResolver({
        ...shared,
        findAssignment: (id) => {
          const assignment = findAssignment(id);
          return assignment && { ...assignment, entryFile: undefined };
        },
      });
      expect(unitContentHash(unit, undefined, implicitEntry)).toBe(before);
      const otherEntry = sharedAssignmentResolver({
        ...shared,
        findAssignment: (id) => {
          const assignment = findAssignment(id);
          return assignment && { ...assignment, entryFile: "other.fe" };
        },
      });
      expect(unitContentHash(unit, undefined, otherEntry)).not.toBe(before);
      const presetChanged = sharedAssignmentResolver({
        ...shared,
        getStaticAnalysisSettings: (assignment) => {
          const settings = getStaticAnalysisSettings(assignment);
          return { ...settings, eslintRules: { ...settings.eslintRules, curly: "off" } };
        },
      });
      expect(unitContentHash(unit, undefined, presetChanged)).not.toBe(before);
    });
    it("課題定義のキー順では指紋を変えず、演習の無い単元は課題定義を読まない", () => {
      const unit = join(content, "courses/fe-kamoku-b/modules/m1-pseudo");
      const reversed: AssignmentResolver = (id) => {
        const definition = resolveSharedAssignment(id) as Record<string, unknown>;
        return Object.fromEntries(Object.entries(definition).reverse());
      };
      expect(unitContentHash(unit, undefined, reversed)).toBe(unitContentHash(unit));
      const resolved: string[] = [];
      unitContentHash(join(content, "courses/fe-kamoku-b/modules/m4-security"), undefined, (id) => {
        resolved.push(id);
        return null;
      });
      expect(resolved).toEqual([]);
    });
  });
  it("course.json のキー順と空白だけを変えても未改訂の判定は維持する", () => {
    const { root, unit } = fixture();
    const before = unitContentHash(unit, "static-web-01");
    const file = join(root, "courses/dev-env-basics/course.json");
    const config = JSON.parse(readFileSync(file, "utf8"));
    writeFileSync(
      file,
      JSON.stringify(Object.fromEntries(Object.entries(config).reverse()), null, 4),
    );
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
      Object.assign((row.uses as Record<string, unknown>[])[0], {
        authorship: "quotation",
        reuse: "quote",
      });
    });
    expect(checkSourceReferences(root).some((d) => d.message.includes("attribution"))).toBe(true);
    patch(join(root, "sources/registry.json"), (row) => {
      (row.sources as Record<string, unknown>[])[0].url = "https://example.org/private/solution.md";
    });
    expect(() => checkSourceReferences(root)).toThrow("HTTP(S)");
  });
  describe("制作区分 (authorship) と利用方法 (reuse) を両方向で一致させる", () => {
    const use = (authorship: string, reuse: string) => ({
      schemaVersion: "2.1",
      unitId: "dev-env-basics/m0-first-page@1",
      environmentRef: "static-web-01@1",
      uses: [
        {
          contentId: "l1-save-and-preview/doc.md",
          sourceRefs: ["SRC-mdn-html-20261005"],
          usedFor: "見出しの説明",
          authorship,
          reuse,
          reviewStatus: "approved",
          attribution: {
            text: "Original credit",
            creator: "Fixture author",
            scope: "一部",
            conditionsUrl: "https://example.org/license",
            checkedAt: "2026-10-05",
            displayAt: "l1-save-and-preview/doc.md",
          },
        },
      ],
    });
    it.each([
      ["original", "quote"],
      ["original-exercise", "reprint"],
      ["summary", "quote"],
      ["original", "adapt-code"],
      ["summary", "adapt-diagram"],
      ["quotation", "adapt-code"],
      ["adapted", "reprint"],
      ["quotation", "concept-reference"],
      ["adapted", "original"],
      ["summary", "original"],
    ])("authorship %s と reuse %s は食い違うので拒否する", (authorship, reuse) => {
      expect(() => parseUnitReferences(use(authorship, reuse))).toThrow("食い違います");
    });
    it.each([
      ["quotation", "quote"],
      ["quotation", "reprint"],
      ["adapted", "adapt-code"],
      ["adapted", "adapt-diagram"],
      ["summary", "concept-reference"],
      ["original", "concept-reference"],
      ["original-exercise", "concept-reference"],
      ["original", "original"],
      ["original-exercise", "original"],
    ])("authorship %s と reuse %s は通す", (authorship, reuse) => {
      expect(parseUnitReferences(use(authorship, reuse)).uses[0]).toMatchObject({
        authorship,
        reuse,
      });
    });
    it("独自制作と名乗る引用は公開ゲートで止める", () => {
      const { root, unit } = fixture();
      patch(join(unit, "references.json"), (row) => {
        const [first] = row.uses as Record<string, unknown>[];
        Object.assign(first, use("original", "quote").uses[0], { contentId: first.contentId });
        (first.attribution as Record<string, unknown>).displayAt = first.contentId;
      });
      expect(checkSourceReferences(root)).toContainEqual(
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("食い違います"),
        }),
      );
    });
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
  it("独自制作だけのスライドにも解説と同じ独自制作の記録を出す", () => {
    const { root, unit } = fixture();
    const slides = join(unit, "l1-save-and-preview/t1-saved-html/slides.md");
    writeFileSync(
      slides,
      readFileSync(slides, "utf8").replace(/^sourceRefs: .*$/m, "sourceRefs: []"),
    );
    patch(join(unit, "references.json"), (row) => {
      const use = (row.uses as Record<string, unknown>[])[0];
      expect(use.contentId).toBe("l1-save-and-preview/t1-saved-html/slides.md");
      Object.assign(use, {
        sourceRefs: [],
        usedFor: "教材独自のスライド構成",
        authorship: "original",
        reuse: "original",
      });
    });
    expect(checkSourceReferences(root)).toEqual([]);
    const manifest = buildContentManifest(join(root, "courses"));
    const lessons = manifest.courses[0].sections?.flatMap((s) => s.lessons) ?? [];
    const markdown = lessons.find((l) => l.type === "slides")?.markdown ?? "";
    expect(markdown).toContain("> 教材独自に作成: 教材独自のスライド構成");
    expect(markdown).not.toContain("## 参照元");
    // 出典欄は最後のスライドに付け、枚数は変えない。
    expect(markdown.split("\n\n---\n\n").at(-1)).toContain("教材独自に作成");
  });
  it.each([
    "https://react.dev/",
    "https://developer.mozilla.org/en-US/docs/Web",
    "https://developer.mozilla.org/ja/docs/Web/",
    "https://developer.mozilla.org/en-US/docs/Web/HTML",
    "https://developer.mozilla.org/en-US/docs/Web/HTML#key_resources",
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content",
    "https://developer.mozilla.org/en-US/curriculum/core/",
    "https://www.typescriptlang.org/docs/handbook/intro.html",
    "https://nextjs.org/docs/app",
    "https://react.dev/learn",
    "https://react.dev/reference/react",
    "https://vite.dev/guide/",
    "https://nodejs.org/api/",
    "https://www.postgresql.org/docs/current/tutorial.html",
    "https://docs.pytest.org/en/stable/",
    "https://html.spec.whatwg.org/multipage/",
    "https://learn.microsoft.com/ja-jp/dotnet/csharp/",
    "https://www.w3.org/WAI/ARIA/apg/",
    "https://docs.github.com/en/actions",
  ])("技術・資料群の入口 %s を個別の根拠と認めない", (url) => {
    expect(isTechnologyLandingPage({ url })).toBe(true);
  });
  it.each([
    "https://developer.mozilla.org/ja/docs/Learn_web_development/Getting_started/Your_first_website/Creating_the_content",
    "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/Heading_Elements",
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions",
    "https://developer.mozilla.org/en-US/docs/Web/API/Document",
    "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
    "https://nextjs.org/docs/app/getting-started/server-and-client-components",
    "https://react.dev/learn/thinking-in-react",
    "https://vite.dev/guide/#scaffolding-your-first-vite-project",
    "https://vitest.dev/api/vi",
    "https://nodejs.org/api/fs.html",
    "https://www.postgresql.org/docs/16/ddl-constraints.html",
    "https://dom.spec.whatwg.org/#concept-tree",
    "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/",
    "https://example.org/docs/specific-page",
  ])("個別ページ %s は根拠として通す", (url) => {
    expect(isTechnologyLandingPage({ url })).toBe(false);
  });
  it("節名を書いても技術のトップページは公開ゲートで止める", () => {
    const { root } = fixture();
    patch(join(root, "sources/registry.json"), (row) => {
      const source = (row.sources as Record<string, unknown>[])[0];
      source.url = "https://developer.mozilla.org/en-US/docs/Web";
      source.section = "HTML とは / 見出し";
    });
    expect(checkSourceReferences(root)).toContainEqual(
      expect.objectContaining({
        severity: "error",
        message: expect.stringContaining("トップページ"),
      }),
    );
  });
  it("空配列で独自制作を明示でき、不正な front-matter を黙って捨てない", () => {
    expect(readSourceRefs("---\nsourceRefs: []\n---\n本文")).toEqual([]);
    expect(() => readSourceRefs("---\nsourceRefs: unknown\n---\n本文")).toThrow("インライン配列");
  });
});
