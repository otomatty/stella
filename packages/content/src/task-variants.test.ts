import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { parsePublicTaskBundle } from "../../shared/src/tasks/catalog.js";
import { mutantsFail } from "../scripts/lib/task-run-check.js";
import { buildContentManifest } from "./manifest.js";
import { collectPdfTargets } from "./material-pdf.js";

/** 予備の類題 (#39) の書き方と検査。見本の課題に類題を足した一時の教材で確かめる。 */
const content = join(dirname(fileURLToPath(import.meta.url)), "..");
const sample = join(content, "courses/dev-env-basics");
const PARENT = "courses/dev-env-basics/modules/m0-first-page/tasks/q01-first-page";
const MARKER = "VARIANT_PRIVATE_MARKER_39";
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "stella-variants-"));
  roots.push(root);
  mkdirSync(join(root, "courses"));
  cpSync(sample, join(root, "courses/dev-env-basics"), { recursive: true });
  for (const name of ["skills.json", "patterns.json", "environments", "sources"])
    cpSync(join(content, name), join(root, name), { recursive: true });
  return root;
}

const parentTask = () =>
  JSON.parse(
    readFileSync(join(sample, "modules/m0-first-page/tasks/q01-first-page/task.json"), "utf8"),
  ) as Record<string, unknown>;

/** 親の課題の類題を 1 問置く。`patch` で task.json を書き換える。 */
function addVariant(
  root: string,
  name: string,
  heading: string,
  patch: Record<string, unknown> = {},
): string {
  const dir = join(root, PARENT, "private/variants", name);
  const html = (text: string) =>
    `<!doctype html>\n<html lang="ja">\n<head><meta charset="utf-8"><title>類題</title></head>\n<body><h1>${text}</h1></body>\n</html>\n`;
  const files: Record<string, string> = {
    "README.md": `# 類題 ${name}\n\n\`index.html\` の見出しを「${heading}」に変えます。\n`,
    "hints.md": "",
    "starter/index.html": html("ここを変更します"),
    "tests/README.md": "# 手元の確認\n",
    "private/solution/index.html": html(heading),
    "private/explanation.md": `${MARKER} 解説\n`,
    "private/review.md": `${MARKER} 観点\n`,
    // 典型的な誤答 (見出しを変え忘れる)。類題には 1 つ以上が要る。
    "private/mutants/m01-unchanged/index.html": html("ここを変更します"),
  };
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  const base = parentTask();
  writeFileSync(
    join(dir, "task.json"),
    JSON.stringify({
      ...base,
      id: `dev-env-basics/m0-first-page/${name}`,
      title: `類題 ${name}`,
      support: { hintLevels: 0, solutionUnlock: "passed" },
      static: {
        checks: [
          { type: "html-document", path: "index.html" },
          { type: "element-text", path: "index.html", tag: "h1", text: heading, match: "exact" },
        ],
      },
      ...patch,
    }),
  );
  return dir;
}

const CHECK = {
  kind: "independent",
  submit: { files: ["index.html"], explanation: true, debuggingRecord: false },
};

describe("予備の類題", () => {
  it("課題として読み、親の素材・レッスン・PDF に混ぜない", () => {
    const root = fixture();
    addVariant(root, "v01-profile", "自己紹介", CHECK);
    addVariant(root, "v02-hobby", "好きなこと");
    const manifest = buildContentManifest(join(root, "courses"));
    const parent = manifest.tasks.find((t) => t.definition.id.endsWith("/q01-first-page"));
    const variants = manifest.tasks.filter((t) => t.variantOf);
    expect(
      variants.map((v) => [v.definition.id, v.definition.kind, v.variantOf, v.lessonId]),
    ).toEqual([
      ["dev-env-basics/m0-first-page/v01-profile", "independent", parent?.definition.id, null],
      ["dev-env-basics/m0-first-page/v02-hobby", "basic", parent?.definition.id, null],
    ]);
    // 親の非公開の素材に類題を入れない (類題はそれぞれ自分の行に入る)。
    expect(Object.keys(parent?.privateFiles ?? {}).some((k) => k.startsWith("variants/"))).toBe(
      false,
    );
    for (const variant of variants) {
      // 配布一式は課題と同じ公開境界を通り、類題の非公開の素材を含まない。
      const bundle = parsePublicTaskBundle(variant.bundle);
      expect(bundle.manifest.id).toBe(variant.definition.id);
      expect(JSON.stringify(variant.bundle)).not.toContain(Buffer.from(MARKER).toString("base64"));
      expect(variant.privateFiles["solution/index.html"]).toBeDefined();
      // 参照元は親の課題文のものを使う。
      expect(bundle.manifest.references).toEqual(parent?.bundle.manifest.references);
    }
    // 類題は課題文のレッスンを作らない (Web の課題一覧・資料・PDF に出ない)。
    const lessons = JSON.stringify(manifest.courses);
    expect(lessons).not.toContain("v01-profile");
    expect(lessons).not.toContain("自己紹介");
    expect(collectPdfTargets(manifest).some((target) => target.source.includes("自己紹介"))).toBe(
      false,
    );
  });

  it("類題のパターンが親と違えば落とす", () => {
    const root = fixture();
    addVariant(root, "v01-other", "別", { pattern: "unknown-pattern" });
    expect(() => buildContentManifest(join(root, "courses"))).toThrow(/未知のパターン/);
    const patterns = JSON.parse(readFileSync(join(root, "patterns.json"), "utf8")) as unknown[];
    writeFileSync(
      join(root, "patterns.json"),
      JSON.stringify([...patterns, { id: "other-pattern", title: "別のパターン" }]),
    );
    addVariant(root, "v01-other", "別", { pattern: "other-pattern" });
    expect(() => buildContentManifest(join(root, "courses"))).toThrow(/親の課題.*と違います/);
  });

  it("パターンの台帳の重複を落とす", () => {
    const root = fixture();
    const patterns = JSON.parse(readFileSync(join(root, "patterns.json"), "utf8")) as unknown[];
    writeFileSync(join(root, "patterns.json"), JSON.stringify([...patterns, ...patterns]));
    expect(() => buildContentManifest(join(root, "courses"))).toThrow(/重複/);
  });

  it("類題の形の誤り (tests・解答例・task.json の欠け、統合、入れ子の予備、開始点) を落とす", () => {
    for (const [mutate, message] of [
      [(dir: string) => rmSync(join(dir, "tests"), { recursive: true }), /tests が必要/],
      [
        (dir: string) => rmSync(join(dir, "private/solution"), { recursive: true }),
        /private\/solution が必要/,
      ],
      [(dir: string) => unlinkSync(join(dir, "task.json")), /ENOENT|task\.json/],
      [(dir: string) => mkdirSync(join(dir, "private/variants")), /private\/variants を置けません/],
      [(dir: string) => mkdirSync(join(dir, "fixed-start")), /fixed-start を置けません/],
    ] as const) {
      const root = fixture();
      mutate(addVariant(root, "v01-broken", "壊れた類題"));
      expect(() => buildContentManifest(join(root, "courses"))).toThrow(message);
    }
    const root = fixture();
    addVariant(root, "v01-integration", "統合", {
      kind: "integration",
      submit: { files: ["index.html"], explanation: true, debuggingRecord: false },
    });
    expect(() => buildContentManifest(join(root, "courses"))).toThrow(/類題の kind/);
  });

  it("類題の ID の重複 (課題と同じ名前・ID とフォルダーの不一致) を落とす", () => {
    const same = fixture();
    addVariant(same, "q01-first-page", "同じ名前");
    expect(() => buildContentManifest(join(same, "courses"))).toThrow(/ID が重複/);
    const mismatch = fixture();
    addVariant(mismatch, "v01-a", "ずれ", { id: "dev-env-basics/m0-first-page/v01-b" });
    expect(() => buildContentManifest(join(mismatch, "courses"))).toThrow(/一致しません/);
  });

  it("予備のフォルダーには類題のフォルダーと .gitkeep だけを置ける", () => {
    const root = fixture();
    writeFileSync(join(root, PARENT, "private/variants/README.md"), "メモ");
    expect(() => buildContentManifest(join(root, "courses"))).toThrow(/1 問 1 フォルダー/);
  });

  it("類題には典型的な誤答が要り、受講者が書き換えるファイルだけを置ける", () => {
    const none = fixture();
    rmSync(join(addVariant(none, "v01-none", "誤答なし"), "private/mutants"), { recursive: true });
    expect(() => buildContentManifest(join(none, "courses"))).toThrow(/典型的な誤答/);
    const empty = fixture();
    const emptyDir = addVariant(empty, "v01-empty", "誤答が空");
    rmSync(join(emptyDir, "private/mutants/m01-unchanged"), { recursive: true });
    writeFileSync(join(emptyDir, "private/mutants/.gitkeep"), "");
    expect(() => buildContentManifest(join(empty, "courses"))).toThrow(/典型的な誤答/);
    for (const [rel, message] of [
      ["tests/README.md", /protected/],
      ["other.html", /starter・解答例にあるファイルだけ/],
    ] as const) {
      const root = fixture();
      const dir = addVariant(root, "v01-bad", "誤答の誤り");
      mkdirSync(dirname(join(dir, "private/mutants/m02", rel)), { recursive: true });
      writeFileSync(join(dir, "private/mutants/m02", rel), "x");
      expect(() => buildContentManifest(join(root, "courses"))).toThrow(message);
    }
    // 誤答は配布一式にも非公開の素材 (D1) にも入れない。
    const root = fixture();
    addVariant(root, "v01-ok", "誤答あり");
    const variant = buildContentManifest(join(root, "courses")).tasks.find((t) => t.variantOf);
    expect(Object.keys(variant?.mutants ?? {})).toEqual(["m01-unchanged"]);
    expect(Object.keys(variant?.privateFiles ?? {}).some((k) => k.includes("mutants"))).toBe(false);
    expect(Object.keys(variant?.bundle.files ?? {}).some((k) => k.includes("mutants"))).toBe(false);
  });

  it("誤答は解答例に重ねて手元の検査で落ちることを確かめ、通ってしまう誤答を落とす", async () => {
    const root = fixture();
    const dir = addVariant(root, "v01-check", "確かめる");
    const load = () => buildContentManifest(join(root, "courses")).tasks.find((t) => t.variantOf);
    const variant = load();
    if (!variant) throw new Error("類題がありません");
    expect(await mutantsFail(variant)).toBe(1);
    // 解答例と同じ見出しの「誤答」はテストで落ちない (テストがその誤りを見逃している)。
    cpSync(
      join(dir, "private/solution/index.html"),
      join(dir, "private/mutants/m02-same/index.html"),
      { recursive: true },
    );
    const weak = load();
    if (!weak) throw new Error("類題がありません");
    await expect(mutantsFail(weak)).rejects.toThrow(/誤答 m02-same .*落ちません/);
  });
});
