import { createHash } from "node:crypto";
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * ログインなしで読める単元の印 (Issue #41) を seed が D1 の `lessons.public` まで運ぶか。
 *
 * dev-env-basics の公開単元 U00 と、課題のある U02 の実教材を写し、
 * 本物の manifest で組み立てて seed に渡す。
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
    fs.mkdirSync(path.join(root, "stages"));
    fs.cpSync(
      path.join(content, "stages/dev-env-basics"),
      path.join(root, "stages/dev-env-basics"),
      { recursive: true },
    );
    for (const name of ["skills.json", "patterns.json", "environments", "sources"])
      fs.cpSync(path.join(content, name), path.join(root, name), { recursive: true });
    const unit = path.join(root, "stages/dev-env-basics/modules/u00-start");
    fixture.root = root;
    fixture.unit = unit;
  }
  const stages = path.join(fixture.root, "stages");
  return { ...real, buildContentManifest: () => real.buildContentManifest(stages) };
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
      const rows = (unit: string) =>
        db
          .prepare(
            `select l.title, l.type, l.public from lessons l join sections s on s.id = l.section_id where s.stage_id = ? and s.id = ? order by l."order"`,
          )
          .all(stageId, stableUuid(`section:ses:dev-env-basics:${unit}`))
          .map((r) => [r.type, r.public]);

      db.exec(await exportSql(true));
      const publicRows = rows("u00-start");
      expect(publicRows.length).toBeGreaterThan(0);
      expect(new Set(publicRows.map(([type]) => type))).toEqual(
        new Set(["slides", "text", "quiz"]),
      );
      for (const [type, publicFlag] of publicRows)
        expect(publicFlag).toBe(type === "slides" || type === "text" ? 1 : 0);
      // 全単元を比べ、課題文と知識問題を含む公開範囲の境界を確かめる。
      const allRows = () =>
        db
          .prepare(
            "select l.id, l.type, l.public, s.id as section_id from lessons l join sections s on s.id = l.section_id where s.stage_id = ? order by l.id",
          )
          .all(stageId);
      const before = allRows();
      const manifest = (await import("@stella/content")).buildContentManifest();
      const publicSections = new Set(
        manifest.units
          .filter((unit) => unit.stageId === "dev-env-basics" && unit.config.public)
          .map((unit) => stableUuid(`section:ses:dev-env-basics:${unit.unitId}`)),
      );
      for (const row of before)
        expect(row.public).toBe(
          publicSections.has(String(row.section_id)) &&
            (row.type === "slides" || row.type === "text")
            ? 1
            : 0,
        );
      expect(rows("u02-first-task").length).toBeGreaterThan(0);
      expect(rows("u02-first-task").every(([, flag]) => flag === 0)).toBe(true);

      db.exec(await exportSql(false));
      const removedSection = stableUuid("section:ses:dev-env-basics:u00-start");
      expect(allRows()).toEqual(
        before.map((row) => (row.section_id === removedSection ? { ...row, public: 0 } : row)),
      );
    } finally {
      db.close();
    }
    // fixtures / problems を丸ごと in-process で読み込むので既定の 5s では足りない。
  }, 120_000);
});
