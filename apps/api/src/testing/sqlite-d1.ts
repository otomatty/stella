import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** D1 のバインド上限と batch のトランザクションも再現する実 SQLite のテスト用アダプター。 */
export function sqliteD1() {
  const sqlite = new DatabaseSync(":memory:");
  const directory = join(dirname(fileURLToPath(import.meta.url)), "../../drizzle");
  const journal = JSON.parse(readFileSync(`${directory}/meta/_journal.json`, "utf8")) as {
    entries: { tag: string }[];
  };
  for (const entry of journal.entries)
    sqlite.exec(readFileSync(`${directory}/${entry.tag}.sql`, "utf8"));
  sqlite.exec("pragma foreign_keys = on");
  class Statement {
    constructor(
      readonly sql: string,
      readonly params: SQLInputValue[] = [],
    ) {}
    bind(...params: SQLInputValue[]) {
      if (params.length > 100) throw new Error("too many SQL variables");
      return new Statement(this.sql, params);
    }
    async all() {
      return { success: true, results: sqlite.prepare(this.sql).all(...this.params), meta: {} };
    }
    async run() {
      const meta = sqlite.prepare(this.sql).run(...this.params);
      return { success: true, results: [], meta };
    }
    async raw() {
      const s = sqlite.prepare(this.sql);
      s.setReturnArrays(true);
      return s.all(...this.params);
    }
  }
  const binding = {
    prepare: (sql: string) => new Statement(sql),
    batch: async (statements: Statement[]) => {
      sqlite.exec("begin");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.all());
        sqlite.exec("commit");
        return results;
      } catch (e) {
        sqlite.exec("rollback");
        throw e;
      }
    },
  } as unknown as D1Database;
  return { sqlite, binding };
}
