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
  checkExtraRepositoryNames,
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
  write(root, "stages/dev-env-basics/stage.json", '{"title":"入口"}\n');
  write(root, "skills.json", '[\n  { "id": "html-document", "title": "HTML" }\n]\n');
  write(root, "patterns.json", '[\n  { "id": "html-page", "title": "文書" }\n]\n');
  write(
    root,
    "sources/registry.json",
    '{\n  "schemaVersion": "2.1",\n  "sources": [{ "id": "SRC-a", "title": "A" }]\n}\n',
  );
  write(root, "environments/node-test-01.json", '{"id":"node-test-01"}\n');
  write(
    root,
    "extra-repositories.json",
    `${JSON.stringify({ schemaVersion: 1, repositories: [{ name: "csharp", note: "C#" }] }, null, 2)}\n`,
  );
  return root;
}

function extraRoot(patch?: {
  manifest?: { schemaVersion: number; name: string; courses?: string[]; stages?: string[] };
  course?: unknown;
  extraCourseDir?: string;
  /** 既定は旧い形 (courses キーと courses/<slug>/course.json)。 */
  shape?: "new" | "old";
  skills?: unknown;
  patterns?: unknown;
  sources?: unknown;
  environment?: { name: string; body: string };
  codingRules?: boolean;
}): string {
  const shape = patch?.shape ?? "old";
  const folder = shape === "new" ? "stages" : "courses";
  const config = shape === "new" ? "stage.json" : "course.json";
  const root = tempDir();
  const manifest = patch?.manifest ?? {
    schemaVersion: 1,
    name: "csharp",
    ...(shape === "new" ? { stages: ["csharp-basics"] } : { courses: ["csharp-basics"] }),
  };
  write(root, "stella-extra.json", `${JSON.stringify(manifest, null, 2)}\n`);
  const slugs = manifest.stages ?? manifest.courses ?? [];
  if (slugs.includes("csharp-basics")) {
    write(
      root,
      `${folder}/csharp-basics/${config}`,
      `${JSON.stringify(patch?.course ?? { title: "C# 入門", audience: "granted", category: "C#" })}\n`,
    );
    write(root, `${folder}/csharp-basics/modules/m0/note.txt`, "案内\n");
  }
  if (patch?.extraCourseDir) write(root, `${folder}/${patch.extraCourseDir}/${config}`, "{}\n");
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
  it("旧い形のステージと台帳を重ね、stage.json として写す", () => {
    const content = contentRoot();
    const extra = extraRoot({
      skills: [{ id: "csharp-types", title: "型" }],
      patterns: [{ id: "csharp-test", title: "テスト" }],
      sources: { sources: [{ id: "SRC-csharp", title: "C#" }] },
      environment: { name: "dotnet-extra-01.json", body: '{"id":"dotnet-extra-01"}\n' },
    });
    const result = overlay(content, extra);
    expect(result).toEqual({
      stages: ["csharp-basics"],
      skills: ["csharp-types"],
      patterns: ["csharp-test"],
      sources: ["SRC-csharp"],
      environments: ["dotnet-extra-01"],
    });
    expect(readFileSync(join(content, "stages/csharp-basics/modules/m0/note.txt"), "utf8")).toBe(
      "案内\n",
    );
    expect(existsSync(join(content, "stages/csharp-basics/stage.json"))).toBe(true);
    expect(existsSync(join(content, "stages/csharp-basics/course.json"))).toBe(false);
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
    const content = contentRoot();
    write(content, "stages/csharp-basics/stage.json", '{"title":"既存"}\n');
    expect(() => overlay(content, extraRoot())).toThrow(/重な/);
  });

  it("台帳に無い name は止まる", () => {
    const extra = extraRoot({
      manifest: { schemaVersion: 1, name: "acme", courses: ["acme-basics"] },
    });
    write(
      extra,
      "courses/acme-basics/course.json",
      '{"title":"Acme","audience":"granted","category":"C#"}\n',
    );
    expect(() => overlay(contentRoot(), extra)).toThrow(
      "stella-extra.json の name「acme」は stella の packages/content/extra-repositories.json にありません。stella に名前を登録してからステージを足してください (外部リポジトリどうしで slug が重ならないようにするため)",
    );
  });

  it("slug が登録した名前で始まらないと止まる", () => {
    const extra = extraRoot({
      manifest: { schemaVersion: 1, name: "csharp", courses: ["basics"] },
    });
    write(
      extra,
      "courses/basics/course.json",
      '{"title":"基礎","audience":"granted","category":"C#"}\n',
    );
    expect(() => overlay(contentRoot(), extra)).toThrow(/「csharp-」で始めてください/);
  });

  it("退役した slug は止まる", () => {
    const retired = extraRoot({
      manifest: { schemaVersion: 1, name: "csharp", courses: ["git-basics"] },
    });
    write(
      retired,
      "courses/git-basics/course.json",
      '{"title":"Git","audience":"granted","category":"C#"}\n',
    );
    expect(() => overlay(contentRoot(), retired)).toThrow(
      "stages/git-basics は stella で退役したステージの slug です。seed が同じ ID のステージを消すので、別の slug にしてください",
    );

    const coach = extraRoot({
      manifest: { schemaVersion: 1, name: "csharp", courses: ["safety-1"] },
    });
    write(
      coach,
      "courses/safety-1/course.json",
      '{"title":"安全","audience":"granted","category":"C#","tenantId":"coach"}\n',
    );
    expect(() => overlay(contentRoot(), coach)).toThrow(/退役したステージの slug/);

    const otherTenant = extraRoot({
      manifest: { schemaVersion: 1, name: "csharp", courses: ["git-basics"] },
    });
    write(
      otherTenant,
      "courses/git-basics/course.json",
      '{"title":"Git","audience":"granted","category":"C#","tenantId":"other"}\n',
    );
    expect(() => overlay(contentRoot(), otherTenant)).toThrow(/「csharp-」で始めてください/);
  });

  it("courses に書いていないフォルダーがあると止まる", () => {
    const extra = extraRoot({ extraCourseDir: "forgotten-basics" });
    expect(() => overlay(contentRoot(), extra)).toThrow(/forgotten-basics/);
    expect(() => overlay(contentRoot(), extra)).toThrow(/stages にありません/);
  });

  it("台帳の id が重なると止まる", () => {
    const content = contentRoot();
    const extra = extraRoot({ skills: [{ id: "html-document", title: "HTML" }] });
    expect(() => overlay(content, extra)).toThrow(/html-document/);
    expect(() => overlay(content, extra)).toThrow(/重な/);
    expect(existsSync(join(content, "stages/csharp-basics"))).toBe(false);
  });

  it("一番上の coding-rules.md があると止まる", () => {
    const extra = extraRoot({ codingRules: true });
    expect(() => overlay(contentRoot(), extra)).toThrow(
      "コーディング規則は stages/<slug>/coding-rules.md に書いてください。",
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
    expect(existsSync(join(content, "stages/csharp-basics"))).toBe(false);
  });

  it("新しい形 (stages キーと stages/<slug>/stage.json) も重ねられる", () => {
    const content = contentRoot();
    const extra = extraRoot({ shape: "new" });
    const result = overlay(content, extra);
    expect(result.stages).toEqual(["csharp-basics"]);
    expect(readFileSync(join(content, "stages/csharp-basics/stage.json"), "utf8")).toContain(
      "C# 入門",
    );
    expect(existsSync(join(content, "stages/csharp-basics/course.json"))).toBe(false);
    const record = JSON.parse(readFileSync(join(content, EXTRA_OVERLAY_RECORD), "utf8")) as {
      stages: string[];
    };
    expect(record.stages).toEqual(["csharp-basics"]);
  });

  it("stella-extra.json に stages と courses の両方があると止まる", () => {
    const extra = extraRoot();
    const manifest = JSON.parse(readFileSync(join(extra, "stella-extra.json"), "utf8")) as {
      courses: string[];
    };
    write(
      extra,
      "stella-extra.json",
      `${JSON.stringify({ ...manifest, stages: manifest.courses }, null, 2)}\n`,
    );
    expect(() => overlay(contentRoot(), extra)).toThrow(/stages と courses の両方は書けません/);
  });

  it("stages/ と courses/ の両方があると止まる", () => {
    const extra = extraRoot();
    write(
      extra,
      "stages/csharp-basics/stage.json",
      '{"title":"C#","audience":"granted","category":"C#"}\n',
    );
    expect(() => overlay(contentRoot(), extra)).toThrow(/stages\/ と courses\/ が両方あります/);
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

describe("checkExtraRepositoryNames", () => {
  it("stella の講座が登録した名前で始まると止まる", () => {
    const content = contentRoot();
    write(content, "stages/csharp-taken/stage.json", "{}\n");
    expect(() => checkExtraRepositoryNames(content, tempDir())).toThrow(/csharp-taken/);
  });

  it("写しに重ねた講座は外す", () => {
    const content = contentRoot();
    write(content, "stages/csharp-sample/stage.json", "{}\n");
    const repo = tempDir();
    writeFileSync(join(repo, ".stella-extra-workspace"), "");
    write(content, ".extra-overlay.json", '{"courses":["csharp-sample"]}\n');
    expect(() => checkExtraRepositoryNames(content, repo)).not.toThrow();
    write(content, "stages/csharp-other/stage.json", "{}\n");
    expect(() => checkExtraRepositoryNames(content, repo)).toThrow(/csharp-other/);
  });
});
