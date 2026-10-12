import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { withNarratorDatabase } from "./narrator-config.js";
describe("shared narrator deployment database", () => {
  it("changes only the canonical STELLA binding and rejects an unrelated database", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../../narrator/wrangler.jsonc"),
      "utf8",
    );
    const id = "12345678-1234-1234-1234-123456789abc";
    const patched = JSON.parse(withNarratorDatabase(source, id)) as {
      d1_databases: { database_id: string }[];
    };
    const original = JSON.parse(source) as typeof patched;
    expect(patched.d1_databases[0]?.database_id).toBe(id);
    if (patched.d1_databases[0] && original.d1_databases[0])
      patched.d1_databases[0].database_id = original.d1_databases[0].database_id;
    expect(patched).toEqual(original);
    expect(() =>
      withNarratorDatabase(source.replace("stella-db", "book-narrator-db"), id),
    ).toThrow();
  });
});
