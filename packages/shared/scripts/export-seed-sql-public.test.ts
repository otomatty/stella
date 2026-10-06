import { createHash } from "node:crypto";
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * ログインなしで読める単元の印 (Issue #41) を seed が D1 の `lessons.public` まで運ぶか。
 *
 * U00〜U01 の本文はまだ無いので、dev-env-basics の見本単元を「課題の無い公開の単元」に
 * 作り替えた教材 (fixture) を、本物の manifest で組み立てて seed に渡す。
 */

const fixture = vi.hoisted(() => ({ root: "", unit: "" }));

vi.mock("@stella/content", async (importOriginal) => {
  const real = await importOriginal<typeof import("@stella/content")>();
  const path = await import("node:path");
  // vi.resetModules() のたびに factory が呼ばれ直すので、fixture は最初の 1 回だけ作る。
  if (!fixture.root) {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const url = await import("node:url");
    const content = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "../../content");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "stella-seed-public-"));
    fs.mkdirSync(path.join(root, "courses"));
    fs.cpSync(
      path.join(content, "courses/dev-env-basics"),
      path.join(root, "courses/dev-env-basics"),
      { recursive: true },
    );
    for (const name of ["skills.json", "patterns.json", "environments", "sources"])
      fs.cpSync(path.join(content, name), path.join(root, name), { recursive: true });
    const unit = path.join(root, "courses/dev-env-basics/modules/m0-first-page");
    fs.rmSync(path.join(unit, "tasks"), { recursive: true });
    const refs = JSON.parse(fs.readFileSync(path.join(unit, "references.json"), "utf8")) as {
      uses: { contentId: string }[];
    };
    refs.uses = refs.uses.filter((use) => !use.contentId.startsWith("tasks/"));
    fs.writeFileSync(path.join(unit, "references.json"), JSON.stringify(refs));
    fixture.root = root;
    fixture.unit = unit;
  }
  const courses = path.join(fixture.root, "courses");
  return { ...real, buildContentManifest: () => real.buildContentManifest(courses) };
});

afterAll(() => {
  if (fixture.root) rmSync(fixture.root, { recursive: true, force: true });
});

function stableUuid(key: string): string {
  const bytes = Uint8Array.from(createHash("sha1").update(key).digest().subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** 単元の公開の印を書き換えてから、seed を同じプロセスで組み立て直す。 */
async function exportSql(publicUnit: boolean): Promise<string> {
  // fixture は mock の factory が作るので、先に @stella/content を読ませる。
  await import("@stella/content");
  const file = join(fixture.unit, "unit.json");
  const config = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  if (publicUnit) config.public = true;
  else delete config.public;
  writeFileSync(file, JSON.stringify(config));
  vi.stubEnv("DIALECT", "sqlite");
  vi.stubEnv("CONTENT_ONLY", "1");
  const logs: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((s) => {
    logs.push(String(s));
  });
  try {
    vi.resetModules();
    await import("./export-seed-sql.js");
  } finally {
    spy.mockRestore();
    vi.unstubAllEnvs();
  }
  return logs.join("\n");
}

function migratedDb(): DatabaseSync {
  const migrations = fileURLToPath(new URL("../../../apps/api/drizzle", import.meta.url));
  const db = new DatabaseSync(":memory:");
  db.exec("pragma foreign_keys = off");
  for (const name of readdirSync(migrations)
    .filter((n) => n.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(join(migrations, name), "utf8"));
  db.exec("pragma foreign_keys = on");
  return db;
}

describe("export-seed-sql (ログインなしで読める単元)", () => {
  it("公開の単元のスライドとまとめに印を付け、外したら次の seed で戻す", async () => {
    const db = migratedDb();
    try {
      const stageId = stableUuid("course:ses:dev-env-basics");
      const rows = () =>
        db
          .prepare(
            `select l.title, l.type, l.public from lessons l join sections s on s.id = l.section_id where s.stage_id = ? order by l."order"`,
          )
          .all(stageId)
          .map((r) => [r.type, r.public]);

      db.exec(await exportSql(true));
      expect(rows()).toEqual([
        ["slides", 1],
        ["text", 1],
        ["quiz", 0],
      ]);

      db.exec(await exportSql(false));
      expect(rows()).toEqual([
        ["slides", 0],
        ["text", 0],
        ["quiz", 0],
      ]);
    } finally {
      db.close();
    }
    // fixtures / problems を丸ごと in-process で読み込むので既定の 5s では足りない。
  }, 120_000);
});
