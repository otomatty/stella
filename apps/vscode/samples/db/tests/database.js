import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const schemaFile = path.join(import.meta.dirname, "..", "db", "schema.sql");

/** db/schema.sql を流した空のデータベースを、メモリの中に作る。 */
export async function createTestDatabase() {
  const db = await PGlite.create();
  await db.exec(readFileSync(schemaFile, "utf8"));
  return db;
}
