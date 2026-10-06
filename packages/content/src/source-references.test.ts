import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
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
import { parsePublicSourceReferences } from "../../shared/src/tasks/source-reference.js";
import {
  parseUnitReferences,
  publicReferences,
  readSourceRefs,
  readSourceRegistry,
  readUnitReferences,
  referenceContentIds,
  referencedMarkdown,
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
function append(file: string, text: string) {
  writeFileSync(file, readFileSync(file, "utf8") + text);
}
/** 内容を改訂した単元の版を上げ、確認し直した内容の指紋を記録する。 */
function reReview(unit: string, version: string) {
  patch(join(unit, "references.json"), (row) => {
    row.unitId = `dev-env-basics/m0-first-page@${version}`;
    row.contentHash = unitContentHash(unit);
  });
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
  describe("unitId の版を確認した内容に結び付ける", () => {
    const task = "tasks/q01-first-page";
    it.each<[string, (unit: string, root: string) => void]>([
      ["解説", (unit) => append(join(unit, "l1-save-and-preview/doc.md"), "\n説明を加える。\n")],
      [
        "課題の採点",
        (unit) =>
          patch(join(unit, `${task}/task.json`), (row) => {
            (row.static as { checks: Record<string, unknown>[] }).checks[1].text = "別の見出し";
          }),
      ],
      ["課題のテスト", (unit) => append(join(unit, `${task}/tests/README.md`), "\n確認を足す。\n")],
      [
        "解答例",
        (unit) => append(join(unit, `${task}/private/solution/index.html`), "<!-- 別解 -->"),
      ],
      [
        "単元名",
        (_unit, root) =>
          patch(join(root, "courses/dev-env-basics/course.json"), (row) => {
            (row.modules as Record<string, string>)["m0-first-page"] = "変更した単元名";
          }),
      ],
    ])("同じ版のまま%sを変えると止め、版を上げて確認し直せば通す", (_label, change) => {
      const { root, unit } = fixture();
      change(unit, root);
      expect(checkSourceReferences(root)).toEqual([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("contentHash"),
        }),
      ]);
      reReview(unit, "2");
      expect(checkSourceReferences(root)).toEqual([]);
    });
    it("references.json・sourceRefs・課題の sources と JSON の書式だけの変更では指紋を変えない", () => {
      const { root, unit } = fixture();
      const before = unitContentHash(unit);
      patch(join(unit, "references.json"), (row) => {
        (row.uses as Record<string, unknown>[])[0].usedFor = "対応の説明を書き直した";
      });
      expect(checkSourceReferences(root)).toEqual([]);
      const doc = join(unit, "l1-save-and-preview/doc.md");
      writeFileSync(doc, readFileSync(doc, "utf8").replace(/^sourceRefs: .*$/m, "sourceRefs: []"));
      const file = join(unit, `${task}/task.json`);
      const definition = { ...JSON.parse(readFileSync(file, "utf8")), sources: [] };
      writeFileSync(file, JSON.stringify(Object.fromEntries(Object.entries(definition).reverse())));
      expect(unitContentHash(unit)).toBe(before);
    });
    it.each<[string, string, string | Buffer, string | Buffer]>([
      [
        "スターターの .tsx",
        "starter/src/App.tsx",
        "export const App = () => <h1>見出し</h1>;\n",
        "export const App = () => <h2>見出し</h2>;\n",
      ],
      ["テストの .jsx", "tests/app.test.jsx", "test('h1', () => {});\n", "test('h2', () => {});\n"],
      [
        "解答の .sql",
        "private/solution/schema.sql",
        "create table t (id int);\n",
        "create table t (id text);\n",
      ],
      ["設定の .yaml", "starter/compose.yaml", "services: {}\n", "services: { web: {} }\n"],
      ["拡張子の無いファイル", "starter/Dockerfile", "FROM node:22\n", "FROM node:24\n"],
      // UTF-8 として読むとどちらも U+FFFD になるバイト列。バイトのまま比べる。
      [
        "バイナリのロックファイル",
        "starter/bun.lockb",
        Buffer.from([0, 0xff, 1]),
        Buffer.from([0, 0xfe, 1]),
      ],
    ])("課題の%sを足す・変えると止める", (_label, rel, initial, changed) => {
      const { root, unit } = fixture();
      const file = join(unit, task, rel);
      const original = unitContentHash(unit);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, initial);
      const added = unitContentHash(unit);
      expect(added).not.toBe(original);
      writeFileSync(file, changed);
      expect(unitContentHash(unit)).not.toBe(added);
      expect(checkSourceReferences(root)).toEqual([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("contentHash"),
        }),
      ]);
      reReview(unit, "2");
      expect(checkSourceReferences(root)).toEqual([]);
    });
    it("外す参照元の記録は単元直下の references.json と公開教材の sourceRefs だけで、配布するファイルの同名の記述は含める", () => {
      const { unit } = fixture();
      const nested = join(unit, task, "starter/references.json");
      const starterMd = join(unit, task, "starter/notes.md");
      writeFileSync(nested, '{"items":[1]}');
      writeFileSync(starterMd, "---\nsourceRefs: [a]\n---\n本文\n");
      const before = unitContentHash(unit);
      writeFileSync(nested, '{"items":[2]}');
      expect(unitContentHash(unit)).not.toBe(before);
      const afterNested = unitContentHash(unit);
      writeFileSync(starterMd, "---\nsourceRefs: [b]\n---\n本文\n");
      expect(unitContentHash(unit)).not.toBe(afterNested);
    });
    describe("講座と課題が指す環境定義を同じ ID のままでも指紋に含める", () => {
      it.each<[string, (env: Record<string, unknown>) => void]>([
        ["要件", (env) => (env.requirements = { node: { min: "22.12.0" } })],
        ["対象ブラウザー", (env) => (env.browser = "Chromium 140 以降")],
      ])("版を変えずに%sを変えると止める", (_label, change) => {
        const { root, unit } = fixture();
        const before = unitContentHash(unit);
        patch(join(root, "environments/static-web-01.json"), change);
        expect(unitContentHash(unit)).not.toBe(before);
        expect(checkSourceReferences(root)).toEqual([
          expect.objectContaining({
            severity: "error",
            message: expect.stringContaining("contentHash"),
          }),
        ]);
        reReview(unit, "2");
        expect(checkSourceReferences(root)).toEqual([]);
      });
      it("環境の版を上げて environmentRef だけ追随させても、単元の版の更新と再確認を求める", () => {
        const { root, unit } = fixture();
        patch(join(root, "environments/static-web-01.json"), (env) => {
          env.version = "2";
        });
        patch(join(unit, "references.json"), (row) => {
          row.environmentRef = "static-web-01@2";
        });
        expect(checkSourceReferences(root)).toEqual([
          expect.objectContaining({
            severity: "error",
            message: expect.stringContaining("contentHash"),
          }),
        ]);
        reReview(unit, "2");
        expect(checkSourceReferences(root)).toEqual([]);
      });
      it("講座と違う環境を指す課題はその環境定義も含め、キー順だけの違いでは変えない", () => {
        const { root, unit } = fixture();
        const other = join(root, "environments/node-22.json");
        writeFileSync(other, JSON.stringify({ id: "node-22", version: "1", requirements: {} }));
        patch(join(unit, `${task}/task.json`), (row) => {
          row.environment = "node-22";
        });
        const before = unitContentHash(unit);
        writeFileSync(other, JSON.stringify({ requirements: {}, version: "1", id: "node-22" }));
        expect(unitContentHash(unit)).toBe(before);
        patch(other, (env) => {
          env.requirements = { node: { min: "22.12.0" } };
        });
        expect(unitContentHash(unit)).not.toBe(before);
      });
    });
    it("指紋から外す生成物・OS の管理ファイルは .gitignore 済みで、置いても指紋を変えない", () => {
      const { unit } = fixture();
      const before = unitContentHash(unit);
      const topic = join(unit, "l1-save-and-preview/t1-saved-html");
      mkdirSync(join(topic, "assets"));
      writeFileSync(join(topic, "slides.pptx"), "pptx");
      writeFileSync(join(topic, "assets/figure.diagram.png"), "png");
      writeFileSync(join(unit, ".DS_Store"), "junk");
      mkdirSync(join(unit, `${task}/starter/node_modules/pkg`), { recursive: true });
      writeFileSync(join(unit, `${task}/starter/node_modules/pkg/index.js`), "x");
      mkdirSync(join(unit, `${task}/tests/__pycache__`));
      writeFileSync(join(unit, `${task}/tests/__pycache__/test.pyc`), "x");
      expect(unitContentHash(unit)).toBe(before);
      // コミットできる名前を外すと、配布する内容の変更を見逃す。
      const ignored = readFileSync(join(content, "../../.gitignore"), "utf8").split("\n");
      for (const line of [
        ".DS_Store",
        "node_modules",
        "packages/content/courses/**/slides.pptx",
        "packages/content/courses/**/*.diagram.png",
        "packages/content/**/__pycache__/",
      ])
        expect(ignored).toContain(line);
    });
    it("シンボリックリンクは黙って飛ばさず止める", () => {
      const { unit } = fixture();
      symlinkSync(join(unit, "unit.json"), join(unit, `${task}/starter/linked.json`));
      expect(() => unitContentHash(unit)).toThrow("シンボリックリンク");
    });
    it.each([undefined, "", "abc", "A".repeat(64), `${"0".repeat(63)}g`])(
      "確認した内容の指紋 contentHash (%s) が無い・不正な references.json を拒否する",
      (contentHash) => {
        const file = join(content, "courses/dev-env-basics/modules/m0-first-page/references.json");
        const row = { ...JSON.parse(readFileSync(file, "utf8")), contentHash };
        expect(() => parseUnitReferences(row)).toThrow("contentHash");
      },
    );
    it("旧単元の references.json も版と内容を結び付け、改訂した単元ではエラーにする", () => {
      const { root, unit } = fixture();
      patch(join(root, "courses/dev-env-basics/course.json"), (row) => {
        delete row.format;
      });
      reReview(unit, "1");
      const baseline = createLegacyBaseline(root, "test-base");
      expect(checkSourceReferences(root, baseline)).toEqual([]);
      append(join(unit, "l1-save-and-preview/doc.md"), "\n説明を加える。\n");
      expect(checkSourceReferences(root, baseline)).toEqual([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("contentHash"),
        }),
      ]);
    });
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
      contentHash: unitContentHash(unit),
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
  it("基準に無い旧単元は例外を記録しても必須のまま", () => {
    const { root, unit } = fixture();
    patch(join(root, "courses/dev-env-basics/course.json"), (row) => {
      delete row.format;
    });
    rmSync(join(unit, "references.json"));
    const baseline = createLegacyBaseline(root, "test-base");
    const added = join(root, "courses/dev-env-basics/modules/m1-new");
    cpSync(unit, added, { recursive: true });
    baseline.exemptions.push({
      unitId: "dev-env-basics/m1-new",
      contentHash: unitContentHash(added),
      reason: "表記だけの修正を確認",
      reviewer: "fixture-reviewer",
      reviewedAt: "2026-10-05",
    });
    const diagnostics = checkSourceReferences(root, baseline);
    expect(diagnostics.filter((d) => d.unitId === "dev-env-basics/m1-new")).toEqual([
      expect.objectContaining({
        severity: "error",
        message: expect.stringContaining("references.json"),
      }),
    ]);
    expect(
      diagnostics
        .filter((d) => d.unitId === "dev-env-basics/m0-first-page")
        .every((d) => d.severity === "warning"),
    ).toBe(true);
  });
  describe("旧単元の例外は実在する確認日の記録だけを認める", () => {
    function revisedWithExemption(reviewedAt: string) {
      const { root, unit } = fixture();
      patch(join(root, "courses/dev-env-basics/course.json"), (row) => {
        delete row.format;
      });
      rmSync(join(unit, "references.json"));
      const baseline = createLegacyBaseline(root, "test-base");
      append(join(unit, "l1-save-and-preview/doc.md"), "\n表記を直す。\n");
      baseline.exemptions.push({
        unitId: "dev-env-basics/m0-first-page",
        contentHash: unitContentHash(unit),
        reason: "表記だけの修正を確認",
        reviewer: "fixture-reviewer",
        reviewedAt,
      });
      return checkSourceReferences(root, baseline);
    }
    it.each(["2026-99-99", "2026-02-30", "2025-02-29", "2026-13-01", "2026-10-5"])(
      "確認日 %s の例外では改訂済みの単元を免除しない",
      (reviewedAt) => {
        expect(revisedWithExemption(reviewedAt).some((d) => d.severity === "error")).toBe(true);
      },
    );
    it.each(["2026-10-05", "2024-02-29"])("確認日 %s の例外は免除する", (reviewedAt) => {
      const diagnostics = revisedWithExemption(reviewedAt);
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.every((d) => d.severity === "warning")).toBe(true);
    });
    it("台帳の日付も同じ基準で検査し、形だけ合う日付を理由つきで拒否する", () => {
      const { root } = fixture();
      patch(join(root, "sources/registry.json"), (row) => {
        (row.sources as Record<string, unknown>[])[0].checkedAt = "2026-99-99";
      });
      expect(() => checkSourceReferences(root)).toThrow("YYYY-MM-DD");
    });
  });
  it("前提の変更と参照元の追記では未改訂の基準を変えない", () => {
    const { root, unit } = fixture();
    const before = unitContentHash(unit);
    writeFileSync(join(unit, "references.json"), "{}");
    patch(join(root, "courses/dev-env-basics/course.json"), (row) => {
      row.parent = "another";
      row.prerequisites = ["another"];
      row.appearances = ["new-island"];
      row.appearancePrerequisites = { "new-island": ["another"] };
    });
    expect(unitContentHash(unit)).toBe(before);
  });
  it("ファイルの境界を指紋に含め、内容に区切りやパスを入れた別の構成と区別する", () => {
    const { unit } = fixture();
    writeFileSync(join(unit, "zz1"), "X");
    writeFileSync(join(unit, "zz2"), "Y");
    const split = unitContentHash(unit);
    rmSync(join(unit, "zz2"));
    writeFileSync(join(unit, "zz1"), "Xzz2\0Y");
    expect(unitContentHash(unit)).not.toBe(split);
  });
  it("画像の参照先はタイトル・括弧・<> 囲みを Markdown の規則で読んで使用箇所に結び付ける", () => {
    const source = [
      '![図](t1/assets/page.svg "キャプション")',
      "![図](t1/assets/a(1).svg)",
      "![図](<t1/assets/my page.svg>)",
      "![図](t1/assets/b\\).svg 'title')",
    ].join("\n");
    expect(referenceContentIds(source, "m0/l1/doc.md")).toEqual([
      "m0/l1/doc.md",
      "m0/l1/t1/assets/page.svg",
      "m0/l1/t1/assets/a(1).svg",
      "m0/l1/t1/assets/my page.svg",
      "m0/l1/t1/assets/b).svg",
    ]);
  });
  it("alt のエスケープと参照形式の画像も使用箇所に結び付け、コードの中の画像は数えない", () => {
    const source = [
      "---",
      "sourceRefs: [SRC-a]",
      "note: ![front](t1/assets/front.svg)",
      "---",
      "![a\\]b](t1/assets/escaped.svg)",
      "",
      "![図][Page] と ![page][] と ![page]、未定義の ![none] は画像にならない。",
      "",
      "`![code](t1/assets/span.svg)`",
      "",
      "```md",
      "![fence](t1/assets/fence.svg)",
      "```",
      "",
      "    ![indented](t1/assets/indented.svg)",
      "",
      "<!-- ![comment](t1/assets/comment.svg) -->",
      "",
      '[ PAGE ]: t1/assets/page.svg "タイトル"',
      "[page]: t1/assets/second-definition.svg",
      "[unused]: t1/assets/unused.svg",
    ].join("\n");
    expect(referenceContentIds(source, "m0/l1/doc.md")).toEqual([
      "m0/l1/doc.md",
      "m0/l1/t1/assets/escaped.svg",
      "m0/l1/t1/assets/page.svg",
      "m0/l1/t1/assets/page.svg",
      "m0/l1/t1/assets/page.svg",
    ]);
  });
  it("参照元の記録が無くても front-matter (sourceRefs) を本文に出さない", () => {
    const body = referencedMarkdown("---\nsourceRefs: [mdn-html]\n---\n# 本文\n", [], undefined);
    expect(body).not.toContain("sourceRefs");
    expect(body).toContain("# 本文");
  });
  it("講座の予定時間 (plannedHours) の追加・変更では指紋を変えない", () => {
    const { root, unit } = fixture();
    const before = unitContentHash(unit);
    patch(join(root, "courses/dev-env-basics/course.json"), (row) => {
      row.plannedHours = 123;
    });
    expect(unitContentHash(unit)).toBe(before);
    patch(join(root, "courses/dev-env-basics/course.json"), (row) => {
      delete row.plannedHours;
    });
    expect(unitContentHash(unit)).toBe(before);
  });
  it("配布 PDF を OS ごとに分けるか (pdfByOs) の切り替えでは指紋を変えない", () => {
    const { root, unit } = fixture();
    const before = unitContentHash(unit);
    for (const value of [false, true, undefined]) {
      patch(join(root, "courses/dev-env-basics/course.json"), (row) => {
        if (value === undefined) delete row.pdfByOs;
        else row.pdfByOs = value;
      });
      expect(unitContentHash(unit)).toBe(before);
    }
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
      const before = unitContentHash(unit, sharedAssignmentResolver(shared));
      expect(before).not.toBe(unitContentHash(unit, () => null));
      // 擬似言語の課題は entryFile に starterFiles[0] と同じ main.fe を明示している。
      // 省略しても seed が投入する入口ファイルは変わらない。
      const implicitEntry = sharedAssignmentResolver({
        ...shared,
        findAssignment: (id) => {
          const assignment = findAssignment(id);
          return assignment && { ...assignment, entryFile: undefined };
        },
      });
      expect(unitContentHash(unit, implicitEntry)).toBe(before);
      const otherEntry = sharedAssignmentResolver({
        ...shared,
        findAssignment: (id) => {
          const assignment = findAssignment(id);
          return assignment && { ...assignment, entryFile: "other.fe" };
        },
      });
      expect(unitContentHash(unit, otherEntry)).not.toBe(before);
      const presetChanged = sharedAssignmentResolver({
        ...shared,
        getStaticAnalysisSettings: (assignment) => {
          const settings = getStaticAnalysisSettings(assignment);
          return { ...settings, eslintRules: { ...settings.eslintRules, curly: "off" } };
        },
      });
      expect(unitContentHash(unit, presetChanged)).not.toBe(before);
    });
    it("課題定義のキー順では指紋を変えず、演習の無い単元は課題定義を読まない", () => {
      const unit = join(content, "courses/fe-kamoku-b/modules/m1-pseudo");
      const reversed: AssignmentResolver = (id) => {
        const definition = resolveSharedAssignment(id) as Record<string, unknown>;
        return Object.fromEntries(Object.entries(definition).reverse());
      };
      expect(unitContentHash(unit, reversed)).toBe(unitContentHash(unit));
      const resolved: string[] = [];
      unitContentHash(join(content, "courses/fe-kamoku-b/modules/m4-security"), (id) => {
        resolved.push(id);
        return null;
      });
      expect(resolved).toEqual([]);
    });
  });
  it("course.json のキー順と空白だけを変えても未改訂の判定は維持する", () => {
    const { root, unit } = fixture();
    const before = unitContentHash(unit);
    const file = join(root, "courses/dev-env-basics/course.json");
    const config = JSON.parse(readFileSync(file, "utf8"));
    writeFileSync(
      file,
      JSON.stringify(Object.fromEntries(Object.entries(config).reverse()), null, 4),
    );
    expect(unitContentHash(unit)).toBe(before);
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
      contentHash: "0".repeat(64),
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
  it("画像の参照先は ?・# を外してデコードし、外部 URL は教材のファイルとして扱わない", () => {
    const source = [
      "![図](t1/assets/page.svg#detail)",
      "![図](t1/assets/page.svg?v=2)",
      "![図](t1/assets/my%20page.svg)",
      "![図](https://example.org/remote.svg)",
      "![図](//cdn.example.org/remote.svg)",
      "![図](data:image/svg+xml;base64,PHN2Zy8+)",
    ].join("\n");
    expect(referenceContentIds(source, "m0/l1/doc.md")).toEqual([
      "m0/l1/doc.md",
      "m0/l1/t1/assets/page.svg",
      "m0/l1/t1/assets/page.svg",
      "m0/l1/t1/assets/my page.svg",
    ]);
  });
  it("課題の README から教材内の画像は参照できない (配布されず壊れた画像になる)", () => {
    const { root, unit } = fixture();
    const task = join(unit, "tasks/q01-first-page");
    mkdirSync(join(task, "assets"));
    writeFileSync(join(task, "assets/flow.svg"), "<svg/>");
    append(join(task, "README.md"), "\n![保存と表示の流れ](assets/flow.svg#step)\n");
    expect(() => buildContentManifest(join(root, "courses"))).toThrow(
      "課題の README に教材内の画像は使えません (配布されません): tasks/q01-first-page/assets/flow.svg",
    );
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
          // 文言には原作者も条件も書かない。台帳の項目から補って表示することを確かめる。
          text: "Original diagram credit",
          creator: "Fixture author",
          scope: "図の配色と配置",
          conditionsUrl: "https://example.org/Attrib_copyright_license",
          checkedAt: "2026-09-30",
          displayAt: "l1-save-and-preview/t1-saved-html/assets/page.svg",
        },
      });
    });
    // 図と本文を足したので、版を上げて確認し直した内容として記録する。
    reReview(unit, "2");
    expect(checkSourceReferences(root)).toEqual([]);
    const manifest = buildContentManifest(join(root, "courses"));
    const markdown = manifest.courses[0].sections?.[0].lessons.find((l) =>
      l.id.startsWith("doc-"),
    )?.markdown;
    const attribution = [
      "Original diagram credit",
      "原作者: Fixture author",
      "再利用範囲: 図の配色と配置",
      // URL はエスケープした文字列ではなくリンク先として書く (GFM の自動リンクに `\_` が混ざらない)。
      "利用条件: [https://example.org/Attrib\\_copyright\\_license](<https://example.org/Attrib_copyright_license>)",
      "条件確認日: 2026-09-30",
    ];
    for (const part of attribution) expect(markdown).toContain(part);
    const registry = readSourceRegistry(root);
    const refs = readUnitReferences(unit);
    const references = publicReferences(refs, registry);
    for (const part of attribution) expect(referencesMarkdown(references)).toContain(part);
    // 課題の manifest と同じ公開境界を通しても、帰属表示の項目を落とさない。表示位置は配らない。
    const credited = parsePublicSourceReferences(references).find((r) => r.attribution);
    expect(credited).toMatchObject({
      attribution: "Original diagram credit",
      attributionTerms: {
        creator: "Fixture author",
        scope: "図の配色と配置",
        conditionsUrl: "https://example.org/Attrib_copyright_license",
        checkedAt: "2026-09-30",
      },
    });
    expect(JSON.stringify(credited)).not.toContain("displayAt");
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
