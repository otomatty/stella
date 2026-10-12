import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sqliteD1 } from "../../api/src/testing/sqlite-d1.js";
import { ocrLimits, quotaMonth, reserveOcrPages, userFacing, userMessage } from "./quota";

let db: ReturnType<typeof sqliteD1>;
beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, created_at, updated_at) VALUES ('t','T',1,1);
    INSERT INTO profiles (id, tenant_id, display_name, created_at) VALUES ('a','t','A',1), ('b','t','B',1);
    INSERT INTO library_books (id, tenant_id, owner_id, title, created_at, updated_at)
      VALUES ('ba','t','a','A',1,1), ('bb','t','b','B',1,1);
  `);
});
afterEach(() => db.sqlite.close());

const limits = { perUser: 100, perTenant: 150 };
const reserve = (instanceId: string, bookId: string, pages: number, month = "2026-10") =>
  reserveOcrPages(db.binding, { instanceId, tenantId: "t", bookId, pages, month }, limits);
const used = () =>
  db.sqlite
    .prepare("SELECT owner_id, sum(pages) AS pages FROM library_ocr_reservations GROUP BY owner_id")
    .all();

describe("monthly OCR page budget", () => {
  it("reserves up to the owner's limit, once per instance", async () => {
    expect(await reserve("i1", "ba", 60)).toBeNull();
    expect(await reserve("i1", "ba", 60)).toBeNull(); // a retried step finds its own row
    expect(await reserve("i2", "ba", 40)).toBeNull();
    expect(userMessage(await reserve("i3", "ba", 1))).toMatch(/100ページ/);
    expect(used()).toEqual([{ owner_id: "a", pages: 100 }]);
  });
  it("needs no budget when nothing is left to read, even past a lowered limit", async () => {
    expect(await reserve("i1", "ba", 100)).toBeNull();
    expect(
      await reserveOcrPages(
        db.binding,
        { instanceId: "i2", tenantId: "t", bookId: "ba", pages: 0, month: "2026-10" },
        { perUser: 50, perTenant: 50 },
      ),
    ).toBeNull();
  });
  it("refuses past the tenant limit and starts again next month", async () => {
    expect(await reserve("i1", "ba", 100)).toBeNull();
    expect(userMessage(await reserve("i2", "bb", 60))).toMatch(
      /組織の今月の読み取りの上限（150ページ）/,
    );
    expect(await reserve("i3", "bb", 50)).toBeNull();
    expect(await reserve("i4", "bb", 60, "2026-11")).toBeNull();
  });
  it("reads limits, months and owner-facing messages", () => {
    expect(ocrLimits({})).toEqual({ perUser: 2000, perTenant: 20000 });
    expect(ocrLimits({ LIBRARY_OCR_PAGES_PER_USER_MONTH: "0" }).perUser).toBe(0);
    expect(ocrLimits({ LIBRARY_OCR_PAGES_PER_USER_MONTH: "x" }).perUser).toBe(2000);
    // 2026-10-31 15:00 UTC is already November in Japan.
    expect(quotaMonth(Date.UTC(2026, 9, 31, 15))).toBe("2026-11");
    expect(userMessage(new Error(`Workflow failed: ${userFacing("book_bytes")}`))).toBe(
      "本は合計1GBまでです",
    );
    expect(userMessage(new Error("provider said: secret text"))).toBeNull();
    // Free text after the marker, or an unknown code, never becomes the owner's message.
    expect(userMessage(new Error("LIBRARY_USER: page 3 says: secret text"))).toBeNull();
    expect(userMessage(new Error("LIBRARY_USER:toString:1"))).toBeNull();
  });
});
