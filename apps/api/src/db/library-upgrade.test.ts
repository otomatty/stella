import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const dir = resolve(import.meta.dirname, "../../drizzle");
describe("personal library additive migration", () => {
  it("preserves existing profiles and enforces tenant-qualified relations", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    const migrations = readdirSync(dir)
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const file of migrations.filter((name) => name < "0062_personal_library.sql"))
      db.exec(readFileSync(resolve(dir, file), "utf8").replaceAll("--> statement-breakpoint", ""));
    db.exec(
      "INSERT INTO tenants (id,name,created_at,updated_at) VALUES ('a','A',1,1),('b','B',1,1)",
    );
    db.exec(
      "INSERT INTO profiles (id,tenant_id,display_name,created_at) VALUES ('owner','a','Owner',1),('other','b','Other',1)",
    );
    const before = db.prepare("SELECT * FROM profiles ORDER BY id").all();
    db.exec(
      readFileSync(resolve(dir, "0062_personal_library.sql"), "utf8").replaceAll(
        "--> statement-breakpoint",
        "",
      ),
    );
    expect(db.prepare("SELECT * FROM profiles ORDER BY id").all()).toEqual(before);
    db.exec(
      "INSERT INTO library_books (id,tenant_id,owner_id,title,created_at,updated_at) VALUES ('book','a','owner','Book',1,1)",
    );
    expect(() =>
      db.exec(
        "INSERT INTO library_books (id,tenant_id,owner_id,title,created_at,updated_at) VALUES ('wrong','a','other','Wrong',1,1)",
      ),
    ).toThrow(/FOREIGN KEY/);
    expect(() =>
      db.exec(
        "INSERT INTO library_shelf_entries (tenant_id,profile_id,book_id,created_at,updated_at) VALUES ('b','other','book',1,1)",
      ),
    ).toThrow(/FOREIGN KEY/);
    db.exec(
      "INSERT INTO library_chapters (id,tenant_id,book_id,position,title,start_page,end_page,updated_at) VALUES ('chapter','a','book',1,'Chapter',1,1,1)",
    );
    db.exec(
      "INSERT INTO library_books (id,tenant_id,owner_id,title,created_at,updated_at) VALUES ('book2','a','owner','Book 2',1,1)",
    );
    expect(() =>
      db.exec(
        "INSERT INTO library_audios (id,tenant_id,book_id,chapter_id,revision,source_speech_hash,tts_model,created_at) VALUES ('audio','a','book2','chapter',1,'hash','fake',1)",
      ),
    ).toThrow(/FOREIGN KEY/);
    expect(() =>
      db.exec(
        "INSERT INTO library_shelf_entries (tenant_id,profile_id,book_id,reading_status,created_at,updated_at) VALUES ('a','owner','book','invalid',1,1)",
      ),
    ).toThrow(/CHECK/);
    db.exec("DELETE FROM library_books WHERE id = 'book'");
    expect(db.prepare("SELECT count(*) AS count FROM library_chapters").get()).toMatchObject({
      count: 0,
    });
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.close();
  });
});
