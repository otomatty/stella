import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dir = resolve(import.meta.dirname, "../../drizzle");
const sql = (file: string) =>
  readFileSync(resolve(dir, file), "utf8").replaceAll("--> statement-breakpoint", "");
const NEW = "0070_library_book_packages.sql";

function before(file: string) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const name of readdirSync(dir)
    .filter((entry) => entry.endsWith(".sql") && entry < file)
    .sort())
    db.exec(sql(name));
  return db;
}

const tables = (db: DatabaseSync) =>
  (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'library_%' ORDER BY name",
      )
      .all() as { name: string }[]
  ).map((row) => row.name);

describe("library migration to book packages (0070)", () => {
  it("drops the PDF pipeline, queues the old books' R2 files and keeps profiles", () => {
    const db = before(NEW);
    db.exec(`
      INSERT INTO tenants (id,name,created_at,updated_at) VALUES ('a','A',1,1),('b','B',1,1);
      INSERT INTO profiles (id,tenant_id,display_name,created_at) VALUES ('owner','a','Owner',1),('other','b','Other',1);
      INSERT INTO library_books (id,tenant_id,owner_id,title,created_at,updated_at) VALUES ('old','a','owner','Old',1,1);
      INSERT INTO library_shelf_entries (tenant_id,profile_id,book_id,created_at,updated_at) VALUES ('a','owner','old',1,1);
      INSERT INTO library_r2_deletions (prefix,tenant_id,book_id,created_at,not_before) VALUES ('library/a/gone/','a','gone',1,1);
    `);
    const profiles = db.prepare("SELECT * FROM profiles ORDER BY id").all();
    db.exec(sql(NEW));
    expect(db.prepare("SELECT * FROM profiles ORDER BY id").all()).toEqual(profiles);
    expect(tables(db)).toEqual([
      "library_books",
      "library_chapters",
      "library_files",
      "library_r2_purges",
      "library_reader_states",
      "library_revision_files",
      "library_shelf_entries",
    ]);
    expect(
      (
        db.prepare("SELECT prefix FROM library_r2_purges ORDER BY prefix").all() as {
          prefix: string;
        }[]
      ).map((row) => row.prefix),
    ).toEqual(["library/a/gone/", "library/a/old/"]);
    expect(db.prepare("SELECT count(*) AS n FROM library_books").get()).toEqual({ n: 0 });
  });

  it("enforces tenant-qualified relations and value checks on the new tables", () => {
    const db = before(NEW);
    db.exec(`
      INSERT INTO tenants (id,name,created_at,updated_at) VALUES ('a','A',1,1),('b','B',1,1);
      INSERT INTO profiles (id,tenant_id,display_name,created_at) VALUES ('owner','a','Owner',1),('other','b','Other',1);
    `);
    db.exec(sql(NEW));
    const book = (id: string, owner: string, extra = "") =>
      db.exec(
        `INSERT INTO library_books (id,tenant_id,owner_id,package_id,title,created_at,updated_at${extra ? `,${extra.split("=")[0]}` : ""})
         VALUES ('${id}','a','${owner}','pkg-${id}','T',1,1${extra ? `,${extra.split("=")[1]}` : ""})`,
      );
    book("book", "owner");
    expect(() => book("wrong", "other")).toThrow(/FOREIGN KEY/);
    expect(() => book("bad", "owner", "status='broken'")).toThrow(/CHECK/);
    expect(() =>
      db.exec(
        "INSERT INTO library_books (id,tenant_id,owner_id,package_id,title,created_at,updated_at) VALUES ('dup','a','owner','pkg-book','T',1,1)",
      ),
    ).toThrow(/UNIQUE/);
    db.exec(
      "INSERT INTO library_files (id,tenant_id,book_id,content_key,kind,content_type,size,r2_key,created_at,updated_at) VALUES ('f','a','book','k','text','text/markdown',1,'library/a/book/files/f',1,1)",
    );
    expect(() =>
      db.exec(
        "INSERT INTO library_files (id,tenant_id,book_id,content_key,kind,content_type,size,r2_key,created_at,updated_at) VALUES ('g','b','book','k2','text','text/markdown',1,'library/b/book/files/g',1,1)",
      ),
    ).toThrow(/FOREIGN KEY/);
    expect(() =>
      db.exec(
        "INSERT INTO library_files (id,tenant_id,book_id,content_key,kind,content_type,size,r2_key,created_at,updated_at) VALUES ('h','a','book','k3','html','text/html',1,'library/a/book/files/h',1,1)",
      ),
    ).toThrow(/CHECK/);
    db.exec(
      "INSERT INTO library_revision_files (tenant_id,book_id,revision,path,file_id) VALUES ('a','book',1,'chapters/01.md','f')",
    );
    db.exec(
      "INSERT INTO library_shelf_entries (tenant_id,profile_id,book_id,created_at,updated_at) VALUES ('a','owner','book',1,1)",
    );
    db.exec(
      "INSERT INTO library_reader_states (tenant_id,profile_id,book_id,chapter_id,client_updated_at,updated_at) VALUES ('a','owner','book','ch01',1,1)",
    );
    expect(() =>
      db.exec("INSERT INTO library_r2_purges (prefix,created_at) VALUES ('other/a/',1)"),
    ).toThrow(/CHECK/);
    db.exec("DELETE FROM library_books WHERE id = 'book'");
    for (const table of [
      "library_files",
      "library_revision_files",
      "library_shelf_entries",
      "library_reader_states",
    ])
      expect(db.prepare(`SELECT count(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
  });
});
