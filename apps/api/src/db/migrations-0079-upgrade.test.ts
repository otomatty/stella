import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

it("0079: 本棚の全表を子から落とし、他の表と行は残す (外部キー有効)", () => {
  const { sqlite } = sqliteD1({ beforeMigration: "0079_drop_personal_library" });
  try {
    expect(sqlite.prepare("pragma foreign_keys").get()).toEqual({ foreign_keys: 1 });
    sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', '架空の組織', 1, 1);
      insert into auth_users (id, email, created_at) values ('user', 'learner@example.test', 1);
      insert into profiles (id, tenant_id, role, display_name, created_at) values ('learner', 'ses', 'student', '架空の受講者', 1);
      insert into integration_clients (id, name, token_hash, token_prefix, created_by, created_at, updated_at)
        values ('client', '連携元', 'hash', 'prefix', 'learner', 1, 1);
      insert into integration_groups (id, client_id, external_key, name, created_at, updated_at)
        values ('group', 'client', 'group-key', 'グループ', 1, 1);
      insert into integration_group_members (group_id, profile_id, external_id, joined_at)
        values ('group', 'learner', 'external-learner', 1);
      insert into library_books (id, tenant_id, owner_id, package_id, title, created_at, updated_at)
        values ('book', 'ses', 'learner', 'package', '本', 1, 1);
      insert into library_files (id, tenant_id, book_id, content_key, kind, content_type, size, r2_key, created_at, updated_at)
        values ('file', 'ses', 'book', 'content', 'text', 'text/markdown', 10, 'library/ses/book/text.md', 1, 1);
      insert into library_revision_files (tenant_id, book_id, revision, path, file_id)
        values ('ses', 'book', 1, 'text.md', 'file');
      insert into library_chapters (tenant_id, book_id, revision, chapter_id, position, title, text_path)
        values ('ses', 'book', 1, 'chapter', 1, '章', 'text.md');
      insert into library_shelf_entries (tenant_id, profile_id, book_id, created_at, updated_at)
        values ('ses', 'learner', 'book', 1, 1);
      insert into library_reader_states (tenant_id, profile_id, book_id, chapter_id, updated_at)
        values ('ses', 'learner', 'book', 'chapter', 1);
      insert into library_r2_purges (prefix, created_at) values ('library/ses/old-book/', 1);
    `);
    const libraryTables = () =>
      sqlite
        .prepare(
          "select name from sqlite_master where type = 'table' and name glob 'library_*' order by name",
        )
        .all();
    expect(libraryTables()).toEqual(
      [
        "books",
        "chapters",
        "files",
        "r2_purges",
        "reader_states",
        "revision_files",
        "shelf_entries",
      ].map((suffix) => ({ name: `library_${suffix}` })),
    );
    for (const row of libraryTables()) {
      expect(sqlite.prepare(`select count(*) as n from "${row.name}"`).get()).toEqual({ n: 1 });
    }
    const otherSchema = () =>
      sqlite
        .prepare(
          "select * from sqlite_master where name not glob 'library_*' and tbl_name not glob 'library_*' order by name",
        )
        .all();
    const integrations = () =>
      ["integration_clients", "integration_groups", "integration_group_members"].map((table) =>
        sqlite.prepare(`select * from "${table}"`).all(),
      );
    const integrationRows = integrations();
    const schema = otherSchema();
    const profiles = sqlite.prepare("select * from profiles").all();
    const users = sqlite.prepare("select * from auth_users").all();
    const tenants = sqlite.prepare("select * from tenants").all();
    const sql = readFileSync(
      new URL("../../drizzle/0079_drop_personal_library.sql", import.meta.url),
      "utf8",
    );
    // D1 applies each statement with foreign keys enabled.
    for (const statement of sql.split("--> statement-breakpoint")) sqlite.exec(statement);
    expect(libraryTables()).toEqual([]);
    expect(otherSchema()).toEqual(schema);
    expect(integrations()).toEqual(integrationRows);
    expect(sqlite.prepare("select * from profiles").all()).toEqual(profiles);
    expect(sqlite.prepare("select * from auth_users").all()).toEqual(users);
    expect(sqlite.prepare("select * from tenants").all()).toEqual(tenants);
    expect(sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
    // IF EXISTS also makes a repeated cleanup harmless.
    sqlite.exec(sql);
  } finally {
    sqlite.close();
  }
});
