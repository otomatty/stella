import { describe, expect, it } from "vitest";
import { canOwnLibraryBook } from "./library-authz.js";
import type { Caller } from "./authz.js";
const privateBook = { tenant_id: "a", owner_id: "owner", status: "ready" };
describe("private bookshelf permissions", () => {
  it.each(["student", "instructor", "admin", "platform_admin", "sales"] as const)(
    "%s can manage only their own books",
    (role) => {
      const caller: Caller = { id: "owner", tenantId: "a", role, name: "Owner", email: null };
      expect(canOwnLibraryBook(caller, privateBook)).toBe(true);
      expect(canOwnLibraryBook({ ...caller, id: "other" }, privateBook)).toBe(false);
      expect(canOwnLibraryBook({ ...caller, tenantId: "b" }, privateBook)).toBe(false);
      expect(canOwnLibraryBook(caller, { ...privateBook, status: "deleting" })).toBe(false);
    },
  );
});
