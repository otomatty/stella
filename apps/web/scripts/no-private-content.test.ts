import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { build } from "vite";
import { assertSafeWebBuild, noPrivateContent } from "../vite-plugins/no-private-content";

const fixtures: string[] = [];

function fixture(files: Record<string, string>): string {
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

function buildFixture(root: string) {
  return build({
    configFile: false,
    root,
    logLevel: "silent",
    plugins: [noPrivateContent()],
    build: {
      lib: { entry: path.join(root, "entry.js"), formats: ["es"] },
      minify: true,
    },
  });
}

describe("Web の書き出し済み成果物の検査", () => {
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
});
