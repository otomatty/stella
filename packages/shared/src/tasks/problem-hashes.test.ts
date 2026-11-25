import { describe, expect, it } from "vitest";
import type { TaskManifest } from "./manifest.js";
import {
  problemFingerprints,
  relativeImportSpecifiers,
  readRelativeImports,
  resolveRelativeImport,
} from "./problems.js";

const definition = {
  runner: "ts-test",
  problems: [
    { id: "q1", title: "問1" },
    { id: "q2", title: "問2" },
  ],
  checks: { lint: true, format: false },
} satisfies Pick<TaskManifest, "runner" | "problems" | "checks">;

const files = {
  "src/q1.ts": btoa("first starter"),
  "tests/q1.test.ts": btoa("first test"),
  "src/q2.ts": btoa("second starter"),
  "tests/q2.test.ts": btoa("second test"),
  "package.json": btoa("{}"),
  "src/shared/helpers.ts": btoa("shared helper"),
  "README.md": btoa("read me"),
  ".stella/task.json": btoa("{}"),
  "hints.md": btoa("hints"),
};

describe("問題の指紋", () => {
  it("after・problemSteps・課題文とファイル一覧の順序は指紋に影響しない", async () => {
    const original = await problemFingerprints(definition, files);
    const changedDefinition = {
      ...definition,
      problemSteps: true as const,
      problems: definition.problems.map((problem) => ({ ...problem, after: "video" })).reverse(),
    };
    const changed = Object.fromEntries(Object.entries(files).reverse());
    changed["README.md"] = btoa("new instructions");
    changed[".stella/task.json"] = btoa("new manifest");
    changed["hints.md"] = btoa("new hints");
    expect(await problemFingerprints(changedDefinition, changed)).toEqual(original);
    expect(original.q1).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each(["src/q1.ts", "tests/q1.test.ts"])(
    "%s が変わると、その問題の指紋だけ変わる",
    async (path) => {
      const original = await problemFingerprints(definition, files);
      const changed = await problemFingerprints(definition, { ...files, [path]: btoa("changed") });
      expect(changed.q1).not.toBe(original.q1);
      expect(changed.q2).toBe(original.q2);
    },
  );

  it.each(["package.json", "src/shared/helpers.ts"])(
    "共通の %s が変わると全問の指紋が変わる",
    async (path) => {
      const original = await problemFingerprints(definition, files);
      const changed = await problemFingerprints(definition, { ...files, [path]: btoa("changed") });
      expect(changed.q1).not.toBe(original.q1);
      expect(changed.q2).not.toBe(original.q2);
    },
  );

  it.each(["src/q1.ts", "tests/q1.test.ts"])(
    "%s から依存する問題の雛形・テストも指紋に含める",
    async (source) => {
      const dependent = { ...files, [source]: btoa('import "../src/q2.js";') };
      const original = await problemFingerprints(definition, dependent);
      for (const path of ["src/q2.ts", "tests/q2.test.ts"]) {
        const changed = await problemFingerprints(definition, {
          ...dependent,
          [path]: btoa("changed"),
        });
        expect(changed.q1).not.toBe(original.q1);
      }
    },
  );

  it("間接依存をたどり、循環しても無関係な問題に影響しない", async () => {
    const expanded = {
      ...definition,
      problems: [...definition.problems, { id: "q3", title: "問3" }, { id: "q4", title: "問4" }],
    };
    const dependent = {
      ...files,
      "src/q1.ts": btoa('export { value } from "./q2";'),
      "tests/q2.test.ts": btoa('void import("../src/q3");'),
      "src/q3.ts": btoa('import "./q1";'),
      "tests/q3.test.ts": btoa("third test"),
      "src/q4.ts": btoa("fourth starter"),
      "tests/q4.test.ts": btoa("fourth test"),
    };
    const original = await problemFingerprints(expanded, dependent);
    const changed = await problemFingerprints(expanded, {
      ...dependent,
      "tests/q3.test.ts": btoa("changed"),
    });
    expect(changed.q1).not.toBe(original.q1);
    expect(changed.q2).not.toBe(original.q2);
    expect(changed.q4).toBe(original.q4);
  });

  it("共有ファイルを経由して問題の指紋を含める", async () => {
    const withBridge = {
      ...files,
      "src/q1.ts": btoa('import "./shared/bridge";'),
      "src/shared/bridge/index.tsx": btoa('export { value } from "../../q2";'),
    };
    const before = await problemFingerprints(definition, withBridge);
    const after = await problemFingerprints(definition, {
      ...withBridge,
      "tests/q2.test.ts": btoa("changed test"),
    });
    expect(after.q1).not.toBe(before.q1);
  });

  it("問題の題名と実行手順を指紋に含める", async () => {
    const original = await problemFingerprints(definition, files);
    const renamed = await problemFingerprints(
      {
        ...definition,
        problems: [{ id: "q1", title: "新しい題名" }, definition.problems[1]],
      },
      files,
    );
    expect(renamed.q1).not.toBe(original.q1);
    expect(renamed.q2).toBe(original.q2);

    const differentRunner = await problemFingerprints(
      { ...definition, runner: "node-test" },
      files,
    );
    expect(differentRunner.q1).not.toBe(original.q1);
    const differentChecks = await problemFingerprints(
      { ...definition, checks: { lint: false, format: false } },
      files,
    );
    expect(differentChecks.q1).not.toBe(original.q1);
  });
});

describe("相対 import", () => {
  it("from の後ろのブロックコメントと行コメントを読み飛ばす", () => {
    expect(
      relativeImportSpecifiers(
        [
          'import { a } from /* "dummy" */ "./q2";',
          'export { b } from // "./dummy"',
          '  "../q3";',
          'import { c } from "./q4";',
        ].join("\n"),
      ),
    ).toEqual(["./q2", "../q3", "./q4"]);
  });

  it.each([
    'import { value }from "./q2";',
    'import { value }from"./q2";',
    'export * from"./q2";',
    'export*from"./q2";',
    'export * /* comment */from"./q2";',
    "import(`./q2`);",
    "require(`./q2`);",
    'import(/* comment */ "./q2", { with: { type: "json" } });',
  ])("相対 import の依存を確定できる (%s)", (code) => {
    expect(readRelativeImports(code)).toEqual({
      specifiers: ["./q2"],
      unresolvedDynamicImport: false,
    });
  });

  it.each([`import(\`./\${name}\`);`, "import(name);", "require(name);"])(
    "引数が固定の文字列でない呼び出しを区別する (%s)",
    (code) => {
      expect(readRelativeImports(`${code} import "./other";`)).toEqual({
        specifiers: ["./other"],
        unresolvedDynamicImport: true,
      });
    },
  );

  it("文字列で始まる式も依存は未確定とし、従来の抽出候補は控える", () => {
    expect(readRelativeImports('import("./q" + number);')).toEqual({
      specifiers: ["./q"],
      unresolvedDynamicImport: true,
    });
  });

  it("index.tsx に解決し、index.ts や明示のファイルを先に選ぶ", () => {
    const tsx = "src/bridge/index.tsx";
    const ts = "src/bridge/index.ts";
    const direct = "src/bridge.tsx";
    expect(resolveRelativeImport("src/q1.ts", "./bridge", new Set([tsx]))).toBe(tsx);
    expect(resolveRelativeImport("src/q1.ts", "./bridge", new Set([tsx, ts]))).toBe(ts);
    expect(resolveRelativeImport("src/q1.ts", "./bridge", new Set([tsx, ts, direct]))).toBe(direct);
  });

  it("雛形の行コメントと空行だけでは指紋が変わらず、雛形のコードとテストのコメントでは変わる", async () => {
    const original = await problemFingerprints(definition, files);
    const commented = {
      ...files,
      "src/q1.ts": btoa("// keep\n\nfirst starter\n"),
      "src/q2.ts": btoa("second starter\r\n\r\n// note"),
    };
    expect(await problemFingerprints(definition, commented)).toEqual(original);
    expect(
      await problemFingerprints(definition, {
        ...files,
        "src/q1.ts": btoa("first starter changed"),
      }),
    ).not.toEqual(original);
    expect(
      await problemFingerprints(definition, {
        ...files,
        "tests/q1.test.ts": btoa("// c\nfirst test"),
      }),
    ).not.toEqual(original);
  });
});
