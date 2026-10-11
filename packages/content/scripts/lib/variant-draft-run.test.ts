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
import { buildContentManifest } from "../../src/manifest.js";
import { type DraftModel, type DraftRequest, runDraftGroup } from "./variant-draft-run.js";
import { scrubbedEnv } from "./task-run-check.js";

const content = join(dirname(fileURLToPath(import.meta.url)), "../..");
const TASK = "courses/dev-env-basics/modules/m0-first-page/tasks/q01-first-page";
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** 見本の講座だけを持つ一時の教材 (コーディング規則はほかの講座を指すので写さない)。 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "stella-variant-draft-test-"));
  roots.push(root);
  for (const name of ["skills.json", "patterns.json", "environments", "sources"])
    cpSync(join(content, name), join(root, name), { recursive: true });
  cpSync(join(content, "courses/dev-env-basics"), join(root, "courses/dev-env-basics"), {
    recursive: true,
  });
  return { contentRoot: root, taskDir: join(root, TASK) };
}

const parentTask = () =>
  JSON.parse(readFileSync(join(content, TASK, "task.json"), "utf8")) as Record<string, unknown>;
const html = (heading: string) =>
  `<!doctype html>\n<html lang="ja">\n<head><meta charset="utf-8"><title>類題</title></head>\n<body><h1>${heading}</h1></body>\n</html>\n`;

/** 見出しを `heading` にする類題 1 問の下書き。`solution` を変えると解答例が検査に落ちる。 */
function variantDraft(slug: string, heading: string, solution = heading) {
  return {
    slug,
    files: [
      {
        path: "task.json",
        content: JSON.stringify({
          ...parentTask(),
          title: `見出しを「${heading}」にする`,
          support: { hintLevels: 0, solutionUnlock: "passed" },
          static: {
            checks: [
              { type: "html-document", path: "index.html" },
              {
                type: "element-text",
                path: "index.html",
                tag: "h1",
                text: heading,
                match: "exact",
              },
            ],
          },
        }),
      },
      { path: "README.md", content: `# ${slug}\n\n見出しを「${heading}」に変えます。\n` },
      { path: "hints.md", content: "" },
      { path: "starter/index.html", content: html("ここを変更します") },
      { path: "tests/README.md", content: "# 手元の確認\n" },
      { path: "private/solution/index.html", content: html(solution) },
      { path: "private/explanation.md", content: "見出しは h1 に書きます。\n" },
      { path: "private/review.md", content: "見出しの文言。\n" },
      { path: "private/mutants/m01-unchanged/index.html", content: html("ここを変更します") },
    ],
  };
}

/** 返す出力を順に並べた偽物のモデル。受けた依頼を記録する。 */
function fakeModel(outputs: unknown[]) {
  const requests: DraftRequest[] = [];
  const model: DraftModel = {
    countTokens: async () => 1000,
    complete: async (request) => {
      requests.push(request);
      const next = outputs.shift();
      if (next === undefined) throw new Error("出力を使い切りました");
      return next;
    },
  };
  return { model, requests };
}

describe("AI の下書きを検査して書き出す", () => {
  it("検査に落ちた下書きは理由を返して直させ、通ったものだけを書き出す", async () => {
    const target = fixture();
    const { model, requests } = fakeModel([
      // 1 問目は解答例の見出しが違って検査に落ち、直しで通る。2 問目は最初から通る。
      { variants: [variantDraft("Profile", "自己紹介", "ちがう"), variantDraft("hobby", "趣味")] },
      { variants: [variantDraft("profile", "自己紹介")] },
    ]);
    const outcome = await runDraftGroup(
      model,
      target,
      { kind: "basic", count: 2, template: null },
      { guide: "書き方" },
    );
    expect(outcome).toEqual({ written: ["v01-profile", "v02-hobby"], failed: [], missing: 0 });
    // 直しの依頼は、最初の依頼に下書きと検査の結果を足したもの。
    expect(requests).toHaveLength(2);
    const repair = requests[1]?.messages ?? [];
    expect(repair.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(repair[2]?.content[0]?.text).toContain("手元の検査に通りません");
    // 親の課題一式と書き方の決まりを渡し、キャッシュに載せる。
    expect(requests[0]?.system[0]).toMatchObject({ cache: true });
    expect(requests[0]?.system[0]?.text).toContain("書き方");
    expect(requests[0]?.messages[0]?.content[0]?.text).toContain(
      "=== private/solution/index.html ===",
    );

    const variants = buildContentManifest(join(target.contentRoot, "courses")).tasks.filter(
      (t) => t.variantOf,
    );
    expect(variants.map((v) => [v.definition.id, v.definition.kind])).toEqual([
      ["dev-env-basics/m0-first-page/v01-profile", "basic"],
      ["dev-env-basics/m0-first-page/v02-hobby", "basic"],
    ]);
  });

  it("2 回直しても通らない下書きは書き出さない。返ってこなかった数も知らせる", async () => {
    const target = fixture();
    const broken = variantDraft("broken", "見出し", "ちがう");
    const { model, requests } = fakeModel([
      { variants: [broken] },
      { variants: [broken] },
      { variants: [broken] },
    ]);
    const outcome = await runDraftGroup(
      model,
      target,
      { kind: "basic", count: 2, template: null },
      { guide: "" },
    );
    expect(outcome.written).toEqual([]);
    expect(outcome.missing).toBe(1);
    expect(outcome.failed.map((f) => f.name)).toEqual(["v01-broken"]);
    expect(requests).toHaveLength(3);
    expect(existsSync(join(target.taskDir, "private/variants/v01-broken"))).toBe(false);
  });

  it("直しの応答に下書きが無い・依頼が失敗したときは、その下書きだけを諦めて残りを書き出す", async () => {
    const target = fixture();
    const outputs: unknown[] = [
      {
        variants: [
          variantDraft("empty", "空", "ちがう"),
          variantDraft("thrown", "例外", "ちがう"),
          variantDraft("hobby", "趣味"),
        ],
      },
      { variants: [] },
    ];
    const model: DraftModel = {
      countTokens: async () => 1000,
      complete: async () => {
        const next = outputs.shift();
        if (next === undefined) throw new Error("時間切れ");
        return next;
      },
    };
    const outcome = await runDraftGroup(
      model,
      target,
      { kind: "basic", count: 3, template: null },
      { guide: "" },
    );
    expect(outcome.written).toEqual(["v03-hobby"]);
    expect(outcome.failed.map((f) => [f.name, f.errors.at(-1)])).toEqual([
      ["v01-empty", "直しの応答に下書きがありませんでした"],
      ["v02-thrown", "直しの依頼に失敗しました: 時間切れ"],
    ]);
  });

  it("テンプレートがあれば値だけを作らせ、params.json に足して書き出す", async () => {
    const target = fixture();
    const dir = join(target.taskDir, "private/variant-templates/heading");
    const tree: Record<string, string> = {
      "params.json": JSON.stringify([{ name: "v01-profile", values: { heading: "自己紹介" } }]),
    };
    for (const file of variantDraft("{{=name}}", "{{=heading}}").files)
      tree[`template/${file.path}`] =
        file.path === "task.json"
          ? JSON.stringify({ ...JSON.parse(file.content), id: "{{=id}}" })
          : file.content;
    for (const [rel, body] of Object.entries(tree)) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), body);
    }
    const { model, requests } = fakeModel([
      // 知らないキーで落ち、直しで通る。
      { params: [{ slug: "hobby", values: [{ key: "headline", value: "趣味" }] }] },
      { params: [{ slug: "hobby", values: [{ key: "heading", value: "趣味" }] }] },
    ]);
    const outcome = await runDraftGroup(
      model,
      target,
      { kind: "basic", count: 1, template: "heading" },
      { guide: "" },
    );
    expect(outcome).toEqual({ written: ["v02-hobby"], failed: [], missing: 0 });
    expect(requests[1]?.messages[2]?.content[0]?.text).toContain(
      "テンプレートに無いキーです: headline",
    );
    expect(JSON.parse(readFileSync(join(dir, "params.json"), "utf8"))).toEqual([
      { name: "v01-profile", values: { heading: "自己紹介" } },
      { name: "v02-hobby", values: { heading: "趣味" } },
    ]);
    expect(JSON.parse(readFileSync(join(dir, "generated.json"), "utf8"))).toEqual([
      "v01-profile",
      "v02-hobby",
    ]);
    expect(
      readFileSync(join(target.taskDir, "private/variants/v02-hobby/README.md"), "utf8"),
    ).toContain("趣味");
  });
});

describe("下書きを動かすときの環境変数", () => {
  it("ツールの実行に要るものだけを残し、API キーや認証情報付きのプロキシを渡さない", () => {
    expect(
      scrubbedEnv({
        PATH: "/usr/bin",
        Path: "C:\\bin",
        SystemRoot: "C:\\Windows",
        HOME: "/home/u",
        HTTPS_PROXY: "http://proxy",
        HTTP_PROXY: "http://user:pass@proxy:8080",
        http_proxy: "user:pass@proxy:8080",
        NO_PROXY: "localhost",
        ANTHROPIC_API_KEY: "sk-ant-secret",
        GITHUB_TOKEN: "ghp_secret",
        AWS_SECRET_ACCESS_KEY: "secret",
      }),
    ).toEqual({
      PATH: "/usr/bin",
      Path: "C:\\bin",
      SystemRoot: "C:\\Windows",
      HOME: "/home/u",
      HTTPS_PROXY: "http://proxy",
      NO_PROXY: "localhost",
    });
  });
});
