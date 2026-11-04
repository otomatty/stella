import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  assertExtraWorkspace,
  EXTRA_OVERLAY_RECORD,
  overlayExtraContent,
  type OverlayResult,
} from "./extra-content.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempDir(): string {
  const root = mkdtempSync(join(tmpdir(), "stella-extra-"));
  roots.push(root);
  return root;
}

function write(root: string, rel: string, body: string): void {
  const path = join(root, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, body);
}

function contentRoot(): string {
  const root = tempDir();
  write(root, "courses/dev-env-basics/course.json", '{"title":"入口"}\n');
  write(root, "skills.json", '[\n  { "id": "html-document", "title": "HTML" }\n]\n');
  write(root, "patterns.json", '[\n  { "id": "html-page", "title": "文書" }\n]\n');
  write(
    root,
    "sources/registry.json",
    '{\n  "schemaVersion": "2.1",\n  "sources": [{ "id": "SRC-a", "title": "A" }]\n}\n',
  );
  write(root, "environments/node-test-01.json", '{"id":"node-test-01"}\n');
  return root;
}

function extraRoot(patch?: {
  manifest?: { schemaVersion: number; name: string; courses: string[] };
  course?: unknown;
  extraCourseDir?: string;
  skills?: unknown;
  patterns?: unknown;
  sources?: unknown;
  environment?: { name: string; body: string };
  codingRules?: boolean;
}): string {
  const root = tempDir();
  const manifest = patch?.manifest ?? {
    schemaVersion: 1,
    name: "acme",
    courses: ["csharp-basics"],
  };
  write(root, "stella-extra.json", `${JSON.stringify(manifest, null, 2)}\n`);
  if (manifest.courses.includes("csharp-basics")) {
    write(
      root,
      "courses/csharp-basics/course.json",
      `${JSON.stringify(patch?.course ?? { title: "C# 入門", audience: "granted", category: "C#" })}\n`,
    );
    write(root, "courses/csharp-basics/modules/m0/note.txt", "案内\n");
  }
  if (patch?.extraCourseDir) write(root, `courses/${patch.extraCourseDir}/course.json`, "{}\n");
  if (patch?.skills) write(root, "skills.json", `${JSON.stringify(patch.skills, null, 2)}\n`);
  if (patch?.patterns) write(root, "patterns.json", `${JSON.stringify(patch.patterns, null, 2)}\n`);
  if (patch?.sources) {
    write(root, "sources/registry.json", `${JSON.stringify(patch.sources, null, 2)}\n`);
  }
  if (patch?.environment) {
    write(root, `environments/${patch.environment.name}`, patch.environment.body);
  }
  if (patch?.codingRules) write(root, "coding-rules.md", "# 規則\n");
  return root;
}

function overlay(content = contentRoot(), extra = extraRoot()): OverlayResult {
  return overlayExtraContent({ contentRoot: content, extraRoot: extra });
}

describe("overlayExtraContent", () => {
  it("講座と台帳を重ね、.extra-overlay.json に結果を残す", () => {
    const content = contentRoot();
    const extra = extraRoot({
      skills: [{ id: "csharp-types", title: "型" }],
      patterns: [{ id: "csharp-test", title: "テスト" }],
      sources: { sources: [{ id: "SRC-csharp", title: "C#" }] },
      environment: { name: "dotnet-extra-01.json", body: '{"id":"dotnet-extra-01"}\n' },
    });
    const result = overlay(content, extra);
    expect(result).toEqual({
      courses: ["csharp-basics"],
      skills: ["csharp-types"],
      patterns: ["csharp-test"],
      sources: ["SRC-csharp"],
      environments: ["dotnet-extra-01"],
    });
    expect(readFileSync(join(content, "courses/csharp-basics/modules/m0/note.txt"), "utf8")).toBe(
      "案内\n",
    );
    const skills = JSON.parse(readFileSync(join(content, "skills.json"), "utf8")) as {
      id: string;
    }[];
    expect(skills.map((row) => row.id)).toEqual(["html-document", "csharp-types"]);
    const patterns = JSON.parse(readFileSync(join(content, "patterns.json"), "utf8")) as {
      id: string;
    }[];
    expect(patterns.map((row) => row.id)).toEqual(["html-page", "csharp-test"]);
    const registry = JSON.parse(readFileSync(join(content, "sources/registry.json"), "utf8")) as {
      schemaVersion: string;
      sources: { id: string }[];
    };
    expect(registry.schemaVersion).toBe("2.1");
    expect(registry.sources.map((row) => row.id)).toEqual(["SRC-a", "SRC-csharp"]);
    expect(existsSync(join(content, "environments/dotnet-extra-01.json"))).toBe(true);
    expect(existsSync(join(content, "environments/node-test-01.json"))).toBe(true);
    const record = JSON.parse(readFileSync(join(content, EXTRA_OVERLAY_RECORD), "utf8"));
    expect(record).toEqual(result);
    expect(readFileSync(join(content, "skills.json"), "utf8").endsWith("\n")).toBe(true);
  });

  it("2 回目は止まる", () => {
    const content = contentRoot();
    const extra = extraRoot();
    overlay(content, extra);
    expect(() => overlay(content, extra)).toThrow(/すでに重ねてあります/);
    const skills = JSON.parse(readFileSync(join(content, "skills.json"), "utf8")) as unknown[];
    expect(skills).toHaveLength(1);
  });

  it("audience が granted でないと止まる", () => {
    const extra = extraRoot({ course: { title: "C#", audience: "catalog", category: "C#" } });
    expect(() => overlay(contentRoot(), extra)).toThrow(/granted/);
  });

  it("category が島でないと止まる", () => {
    const extra = extraRoot({
      course: { title: "C#", audience: "granted", category: "フロントエンド" },
    });
    expect(() => overlay(contentRoot(), extra)).toThrow(/島のカテゴリ/);
    expect(() => overlay(contentRoot(), extra)).toThrow(/islands\.ts/);
  });

  it("slug が stella の講座と重なると止まる", () => {
    const extra = extraRoot({
      manifest: { schemaVersion: 1, name: "acme", courses: ["dev-env-basics"] },
    });
    write(
      extra,
      "courses/dev-env-basics/course.json",
      '{"title":"入口","audience":"granted","category":"C#"}\n',
    );
    expect(() => overlay(contentRoot(), extra)).toThrow(/重な/);
  });

  it("courses に書いていないフォルダーがあると止まる", () => {
    const extra = extraRoot({ extraCourseDir: "forgotten-basics" });
    expect(() => overlay(contentRoot(), extra)).toThrow(/forgotten-basics/);
    expect(() => overlay(contentRoot(), extra)).toThrow(/courses にありません/);
  });

  it("台帳の id が重なると止まる", () => {
    const content = contentRoot();
    const extra = extraRoot({ skills: [{ id: "html-document", title: "HTML" }] });
    expect(() => overlay(content, extra)).toThrow(/html-document/);
    expect(() => overlay(content, extra)).toThrow(/重な/);
    expect(existsSync(join(content, "courses/csharp-basics"))).toBe(false);
  });

  it("一番上の coding-rules.md があると止まる", () => {
    const extra = extraRoot({ codingRules: true });
    expect(() => overlay(contentRoot(), extra)).toThrow(
      "コーディング規則は courses/<slug>/coding-rules.md に書いてください。",
    );
  });

  it("シンボリックリンクで止まる", () => {
    const content = contentRoot();
    const extra = extraRoot();
    const outside = join(extra, "outside.txt");
    writeFileSync(outside, "secret\n");
    const link = join(extra, "courses", "csharp-basics", "link.txt");
    try {
      symlinkSync(outside, link);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EPERM") return;
      throw error;
    }
    expect(() => overlay(content, extra)).toThrow(/シンボリックリンク/);
    expect(existsSync(join(content, "courses/csharp-basics"))).toBe(false);
  });
});

describe("assertExtraWorkspace", () => {
  it("作業用の写しでなければ止まる", () => {
    const root = tempDir();
    expect(() => assertExtraWorkspace(root)).toThrow(/作業用の写しではありません/);
    expect(() => assertExtraWorkspace(root)).toThrow(/scripts\/stella\.mjs/);
    writeFileSync(join(root, ".stella-extra-workspace"), "");
    expect(() => assertExtraWorkspace(root)).not.toThrow();
  });
});
