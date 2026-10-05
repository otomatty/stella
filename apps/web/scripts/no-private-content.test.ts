import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { build } from "vite";
import { assertSafeWebBuild, noPrivateContent } from "../vite-plugins/no-private-content";

const fixtures: string[] = [];

/** 成果物とモジュールを隔離した一時ディレクトリに置き、テスト後の削除対象に登録する。 */
function fixture(files: Record<string, string | Uint8Array>): string {
  const root = mkdtempSync(path.join(tmpdir(), "stella-web-build-"));
  fixtures.push(root);
  for (const [name, contents] of Object.entries(files)) {
    const file = path.join(root, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents);
  }
  return root;
}

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** 空の WASM モジュールに任意のメタデータを持つ custom section を追加する。 */
function wasmWithMetadata(contents: string): Uint8Array {
  const data = Buffer.from(contents);
  // section の長さは 1 バイトの LEB128 に収まる、このテストの短いデータに限定する。
  if (data.length >= 127) throw new Error("test metadata is too long");
  return new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 0, data.length + 1, 0, ...data]);
}

/** 本番と同じ通常・Worker の検査プラグインを使い、Vite の書き出しまで実行する。 */
function buildFixture(root: string) {
  return build({
    configFile: false,
    root,
    logLevel: "silent",
    plugins: [noPrivateContent()],
    worker: { format: "es", plugins: () => [noPrivateContent()] },
    build: {
      lib: { entry: path.join(root, "entry.js"), formats: ["es"] },
      minify: true,
    },
  });
}

describe("Web の書き出し済み成果物の検査", () => {
  it.each([
    ["manifest.json", '{"path":"private/answer.md"}'],
    ["assets/single.js", "const path='private/answer.md'"],
    ["assets/template.js", "const path=`private/answer.md`"],
    ["windows.json", JSON.stringify({ path: "private\\answer.md" })],
    [
      "assets/relative.js.map",
      JSON.stringify({ sourcesContent: ['const path="private/answer.md"'] }),
    ],
  ])("%s の引用符直後の private/ 参照を拒否する", (name, contents) => {
    const root = fixture({ [name]: contents });
    expect(() => assertSafeWebBuild(root)).toThrow("[no-private-content]");
  });

  it.each([
    ["assets/module.wasm", wasmWithMetadata('{"solution":"answer"}')],
    ["assets/payload.bin", Buffer.from([255, 0, ...Buffer.from('badSolutions:["wrong"]')])],
    ["payload", wasmWithMetadata("tasks/one/private/review.md")],
  ])("拡張子に関係なく %s 内の解答と private/ を検出する", (name, contents) => {
    const root = fixture({ [name]: contents });
    expect(() => assertSafeWebBuild(root)).toThrow("[no-private-content]");
  });

  it.each([
    ["assets/index.js", 'const a={solution:"console.log(42)"}'],
    ["assets/lazy-assignment.js", 'const a={badSolutions:[{code:"wrong"}]}'],
    ["assets/worker.mjs", 'postMessage({solution:"answer"})'],
    ["answers.json", '{"solution":"answer"}'],
    ["assets/index.js.map", '{"sourcesContent":["const a={solution:123}"]}'],
    [
      "assets/private.js.map",
      JSON.stringify({ sources: ["C:\\repo\\packages\\content\\tasks\\one\\private\\review.md"] }),
    ],
    ["assets/raw.js", 'const a="packages/content/courses/example/tasks/one/private/review.md"'],
    ["private/review.md", "rubric"],
    ["assets/private/solution.wasm", "binary"],
  ])("%s に解答または private/ があれば失敗する", (name, contents) => {
    const root = fixture({ [name]: contents });
    expect(() => assertSafeWebBuild(root)).toThrow("[no-private-content]");
  });

  it("課題の公開データと solution という通常の文字列は許可する", () => {
    const root = fixture({
      "assets/index.js": 'const a={title:"Example",description:"Find a solution",tests:[]}',
      "assets/worker.mjs": 'postMessage({result:"ok"})',
      "assets/highlight.js": String.raw`const syntax = /private\(set\)/`,
      "assets/safe.wasm": wasmWithMetadata("public metadata"),
    });
    expect(() => assertSafeWebBuild(root)).not.toThrow();
  });

  it("成果物が無ければ検査を成功扱いにしない", () => {
    const root = fixture({});
    expect(() => assertSafeWebBuild(path.join(root, "missing-dist"))).toThrow();
  });
});

describe("Vite build の配信境界", () => {
  it("解答に依存しない Web をビルドできる", async () => {
    const root = fixture({ "entry.js": 'export const title="Example"' });
    await expect(buildFixture(root)).resolves.toBeDefined();
  });

  it.each([
    [
      "静的 import",
      'export { assignments } from "./packages/shared/src/problems/index.js"',
      "packages/shared/src/problems/index.js",
      'export const assignments=[{title:"Example",solution:"answer"}]',
    ],
    [
      "遅延 import",
      'export const load=()=>import("./packages/shared/src/assignments.ts")',
      "packages/shared/src/assignments.ts",
      'export const assignments=[{solution:"answer"}]',
    ],
    [
      "private/ の raw import",
      'export { default } from "./packages/content/courses/example/tasks/one/private/review.md?raw"',
      "packages/content/courses/example/tasks/one/private/review.md",
      "Private review rubric without answer property names",
    ],
    [
      "private/ の URL import",
      'export { default } from "./packages/content/courses/example/tasks/one/private/answer.txt?url"',
      "packages/content/courses/example/tasks/one/private/answer.txt",
      "Private answer without property names",
    ],
  ])("%s での課題定義や private/ の取り込みを拒否する", async (_label, entry, name, content) => {
    const root = fixture({ "entry.js": entry, [name]: content });
    await expect(buildFixture(root)).rejects.toThrow("[no-private-content]");
  });

  it("publicDir からコピーされた解答もビルドを失敗させる", async () => {
    const root = fixture({
      "entry.js": 'export const title="Example"',
      "public/answers.json": '{"badSolutions":["answer"]}',
    });
    await expect(buildFixture(root)).rejects.toThrow("[no-private-content]");
  });

  it("publicDir の JSON に引用符付きの private/ 参照があれば拒否する", async () => {
    const root = fixture({
      "entry.js": 'export const title="Example"',
      "public/manifest.json": '{"path":"private/answer.md"}',
    });
    await expect(buildFixture(root)).rejects.toThrow("[no-private-content]");
  });

  it("publicDir からコピーされた WASM 内の解答も検出する", async () => {
    const root = fixture({
      "entry.js": 'export const title="Example"',
      "public/module.wasm": wasmWithMetadata('{"solution":"answer"}'),
    });
    await expect(buildFixture(root)).rejects.toThrow("[no-private-content]");
  });

  it("data URL に埋め込まれる前のバイナリアセットも検査する", async () => {
    const root = fixture({
      "entry.js": 'export { default } from "./module.wasm?url"',
      "module.wasm": wasmWithMetadata('{"badSolutions":["answer"]}'),
    });
    await expect(buildFixture(root)).rejects.toThrow("[no-private-content]");
  });

  it("解答を持たないバイナリアセットの data URL は許可する", async () => {
    const root = fixture({
      "entry.js": 'export { default } from "./module.wasm?url"',
      "module.wasm": wasmWithMetadata("public metadata"),
    });
    await expect(buildFixture(root)).resolves.toBeDefined();
  });

  it("Worker からの private/ の raw import も拒否する", async () => {
    const root = fixture({
      "entry.js":
        'export const run=()=>new Worker(new URL("./worker.js", import.meta.url),{type:"module"})',
      "worker.js":
        'import note from "./packages/content/tasks/one/private/review.md?raw";postMessage(note)',
      "packages/content/tasks/one/private/review.md": "Private rubric without property names",
    });
    await expect(buildFixture(root)).rejects.toThrow("[no-private-content]");
  });

  it("公開データだけを扱う Worker は許可する", async () => {
    const root = fixture({
      "entry.js":
        'export const run=()=>new Worker(new URL("./worker.js", import.meta.url),{type:"module"})',
      "worker.js": 'postMessage("ok")',
    });
    await expect(buildFixture(root)).resolves.toBeDefined();
  });
});
