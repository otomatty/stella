import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { mutantsFail, solutionPasses } from "../scripts/lib/task-run-check.js";
import { buildContentManifest } from "./manifest.js";
import {
  expandVariantTemplate,
  parseVariantParams,
  syncVariantTemplates,
} from "./variant-templates.js";

const content = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARENT = "courses/dev-env-basics/modules/m0-first-page/tasks/q01-first-page";
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const text = (files: Record<string, Buffer>, path: string) => files[path]?.toString("utf8");

describe("類題のテンプレートの展開", () => {
  const params = parseVariantParams(
    [
      { name: "v01-profile", values: { heading: "自己紹介", count: 3 } },
      { name: "v02-quote", values: { heading: 'He said "hi"', count: 5 } },
    ],
    "テスト",
  );

  it("{{=キー}} を値と組み込みの id・name に置き換え、JSON では文字列を逃がす", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe]);
    const out = expandVariantTemplate(
      {
        "task.json": Buffer.from('{ "id": "{{=id}}", "text": "{{=heading}}", "n": {{=count}} }'),
        "README.md": Buffer.from("# {{=name}}\n見出しを「{{=heading}}」にします。"),
        "starter/app.jsx": Buffer.from("const s = <p style={{color: 'red'}}>{{=count}}</p>;"),
        "assets/logo.png": png,
      },
      params,
      "dev-env-basics/m0-first-page",
      "テスト",
    );
    const quote = out.get("v02-quote") ?? {};
    expect(JSON.parse(text(quote, "task.json") ?? "")).toEqual({
      id: "dev-env-basics/m0-first-page/v02-quote",
      text: 'He said "hi"',
      n: 5,
    });
    expect(text(quote, "README.md")).toBe('# v02-quote\n見出しを「He said "hi"」にします。');
    // JSX の二重波かっこはそのまま残る。
    expect(text(out.get("v01-profile") ?? {}, "starter/app.jsx")).toBe(
      "const s = <p style={{color: 'red'}}>3</p>;",
    );
    // 文字でないファイルは置き換えずに写す。
    expect(quote["assets/logo.png"]?.equals(png)).toBe(true);
  });

  it("値に無いキー・使っていないキー・ファイル名の置き換えを止める", () => {
    expect(() =>
      expandVariantTemplate({ "README.md": Buffer.from("{{=headline}}") }, params, "c/u", "テスト"),
    ).toThrow(/headline.*values にありません/);
    expect(() =>
      expandVariantTemplate({ "README.md": Buffer.from("{{=heading}}") }, params, "c/u", "テスト"),
    ).toThrow(/使っていないキー.*count/);
    expect(() =>
      expandVariantTemplate(
        { "{{=name}}.md": Buffer.from("{{=heading}} {{=count}}") },
        params,
        "c/u",
        "テスト",
      ),
    ).toThrow(/ファイル名/);
  });

  it("params.json の形の誤りを止める", () => {
    expect(() => parseVariantParams({}, "t")).toThrow(/配列/);
    // 空の配列は許す (最後の類題を外すため)。
    expect(parseVariantParams([], "t")).toEqual([]);
    expect(() => parseVariantParams([{ name: "V01", values: {} }], "t")).toThrow(/小文字/);
    expect(() =>
      parseVariantParams(
        [
          { name: "v01", values: {} },
          { name: "v01", values: {} },
        ],
        "t",
      ),
    ).toThrow(/重複/);
    expect(() => parseVariantParams([{ name: "v01", values: { id: "x" } }], "t")).toThrow(
      /組み込みのキー/,
    );
    expect(() => parseVariantParams([{ name: "v01", values: { a: [1] } }], "t")).toThrow(
      /文字列・数・真偽値/,
    );
    expect(() => parseVariantParams([{ name: "v01", values: {}, extra: 1 }], "t")).toThrow(
      /知らない項目/,
    );
  });
});

describe("テンプレートから類題を書き出す", () => {
  /** 見本の課題に、見出しを差し替える類題のテンプレートを置いた一時の教材。 */
  function fixture() {
    const root = mkdtempSync(join(tmpdir(), "stella-variant-templates-"));
    roots.push(root);
    mkdirSync(join(root, "courses"));
    cpSync(join(content, "courses/dev-env-basics"), join(root, "courses/dev-env-basics"), {
      recursive: true,
    });
    for (const name of ["skills.json", "patterns.json", "environments", "sources"])
      cpSync(join(content, name), join(root, name), { recursive: true });
    const parent = JSON.parse(readFileSync(join(content, PARENT, "task.json"), "utf8")) as Record<
      string,
      unknown
    >;
    const dir = join(root, PARENT, "private/variant-templates/heading");
    const html = (heading: string) =>
      `<!doctype html>\n<html lang="ja">\n<head><meta charset="utf-8"><title>類題</title></head>\n<body><h1>${heading}</h1></body>\n</html>\n`;
    const files: Record<string, string> = {
      "params.json": JSON.stringify([
        { name: "v01-profile", values: { heading: "自己紹介" } },
        { name: "v02-hobby", values: { heading: "好きなこと" } },
      ]),
      "template/task.json": JSON.stringify(
        {
          ...parent,
          id: "{{=id}}",
          title: "見出しを「{{=heading}}」にする",
          support: { hintLevels: 0, solutionUnlock: "passed" },
          static: {
            checks: [
              { type: "html-document", path: "index.html" },
              {
                type: "element-text",
                path: "index.html",
                tag: "h1",
                text: "{{=heading}}",
                match: "exact",
              },
            ],
          },
        },
        null,
        2,
      ),
      "template/README.md": "# {{=name}}\n\n`index.html` の見出しを「{{=heading}}」に変えます。\n",
      "template/hints.md": "",
      "template/starter/index.html": html("ここを変更します"),
      "template/tests/README.md": "# 手元の確認\n",
      "template/private/solution/index.html": html("{{=heading}}"),
      "template/private/explanation.md": "見出しは h1 に書きます。\n",
      "template/private/review.md": "見出しの文言が指定どおりか。\n",
      "template/private/mutants/m01-unchanged/index.html": html("ここを変更します"),
    };
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), body);
    }
    return root;
  }

  it("書き出した類題を教材として読み、解答例が通り誤答が落ちる", async () => {
    const root = fixture();
    const courses = join(root, "courses");
    // 書き出す前は、類題 2 問と台帳がすべて食い違い。
    expect(syncVariantTemplates(courses, { check: true }).changed).toHaveLength(3);
    const written = syncVariantTemplates(courses, { check: false });
    expect(written).toMatchObject({ total: 2 });
    expect(written.changed.map((p) => p.split("/").at(-1))).toEqual([
      "v01-profile",
      "v02-hobby",
      "generated.json",
    ]);
    // 書き出したあとはテンプレートと一致する。
    expect(syncVariantTemplates(courses, { check: true }).changed).toEqual([]);

    const variants = buildContentManifest(courses).tasks.filter((t) => t.variantOf);
    expect(variants.map((v) => [v.definition.id, v.definition.title])).toEqual([
      ["dev-env-basics/m0-first-page/v01-profile", "見出しを「自己紹介」にする"],
      ["dev-env-basics/m0-first-page/v02-hobby", "見出しを「好きなこと」にする"],
    ]);
    for (const variant of variants) {
      await solutionPasses(variant, variant.bundle.files, "配布ファイル");
      expect(await mutantsFail(variant)).toBe(1);
    }
  });

  it("書き出した類題を手で直すと check が食い違いを見つけ、作り直すと戻る", () => {
    const root = fixture();
    const courses = join(root, "courses");
    syncVariantTemplates(courses, { check: false });
    const readme = join(root, PARENT, "private/variants/v01-profile/README.md");
    writeFileSync(readme, "# 手で直した\n");
    const drift = syncVariantTemplates(courses, { check: true }).changed;
    expect(drift.map((path) => path.split("/").at(-1))).toEqual(["v01-profile"]);
    // 余分なファイルも食い違いとして見つける。
    syncVariantTemplates(courses, { check: false });
    writeFileSync(join(root, PARENT, "private/variants/v02-hobby/extra.txt"), "x");
    expect(
      syncVariantTemplates(courses, { check: true }).changed.map((p) => p.split("/").at(-1)),
    ).toEqual(["v02-hobby"]);
    syncVariantTemplates(courses, { check: false });
    expect(syncVariantTemplates(courses, { check: true }).changed).toEqual([]);
  });

  it("テンプレートの置き場所の形の誤りを止める", () => {
    const root = fixture();
    writeFileSync(join(root, PARENT, "private/variant-templates/heading/notes.md"), "メモ");
    expect(() => syncVariantTemplates(join(root, "courses"), { check: true })).toThrow(
      /params.json と template\//,
    );
  });

  it("台帳を残し、params.json から外した類題を消し、手で書いた類題は上書きしない", () => {
    const root = fixture();
    const courses = join(root, "courses");
    const templateDir = join(root, PARENT, "private/variant-templates/heading");
    const variantsDir = join(root, PARENT, "private/variants");
    syncVariantTemplates(courses, { check: false });
    expect(JSON.parse(readFileSync(join(templateDir, "generated.json"), "utf8"))).toEqual([
      "v01-profile",
      "v02-hobby",
    ]);
    // v02 を外すと、check は残っているフォルダーと台帳を食い違いとして見つけ、書き出しで消す。
    writeFileSync(
      join(templateDir, "params.json"),
      JSON.stringify([{ name: "v01-profile", values: { heading: "自己紹介" } }]),
    );
    expect(
      syncVariantTemplates(courses, { check: true }).changed.map((p) => p.split("/").at(-1)),
    ).toEqual(["v02-hobby", "generated.json"]);
    syncVariantTemplates(courses, { check: false });
    expect(existsSync(join(variantsDir, "v02-hobby"))).toBe(false);
    expect(JSON.parse(readFileSync(join(templateDir, "generated.json"), "utf8"))).toEqual([
      "v01-profile",
    ]);
    expect(syncVariantTemplates(courses, { check: true }).changed).toEqual([]);
    // 台帳に無い (手で書いた) 類題と同じ名前は上書きしない。
    mkdirSync(join(variantsDir, "v03-hand"), { recursive: true });
    writeFileSync(join(variantsDir, "v03-hand/README.md"), "# 手で書いた\n");
    writeFileSync(
      join(templateDir, "params.json"),
      JSON.stringify([
        { name: "v01-profile", values: { heading: "自己紹介" } },
        { name: "v03-hand", values: { heading: "上書き" } },
      ]),
    );
    expect(() => syncVariantTemplates(courses, { check: false })).toThrow(
      /手で書いた類題と同じ名前/,
    );
    expect(readFileSync(join(variantsDir, "v03-hand/README.md"), "utf8")).toBe("# 手で書いた\n");
    // 最後の類題を外して params.json を空にすると、書き出し済みの類題も消える。
    writeFileSync(join(templateDir, "params.json"), "[]");
    syncVariantTemplates(courses, { check: false });
    expect(existsSync(join(variantsDir, "v01-profile"))).toBe(false);
    expect(JSON.parse(readFileSync(join(templateDir, "generated.json"), "utf8"))).toEqual([]);
    expect(readFileSync(join(variantsDir, "v03-hand/README.md"), "utf8")).toBe("# 手で書いた\n");
    expect(syncVariantTemplates(courses, { check: true }).changed).toEqual([]);
  });
});
