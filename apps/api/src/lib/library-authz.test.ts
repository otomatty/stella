import { describe, expect, it } from "vitest";
import { canOwnLibraryBook, ownedLibraryBook } from "./library-authz.js";
import type { Caller } from "./authz.js";
const privateBook = ownedLibraryBook();
describe("private bookshelf permissions", () => {
  it.each(["student", "instructor", "admin", "platform_admin"] as const)(
    "%s can manage only their own books",
    (role) => {
      const caller: Caller = { id: "owner", role, name: "Owner", email: null };
      expect(canOwnLibraryBook(caller, privateBook)).toBe(true);
      expect(canOwnLibraryBook({ ...caller, id: "other" }, privateBook)).toBe(false);
      expect(canOwnLibraryBook(caller, { ...privateBook, status: "deleting" })).toBe(false);
    },
  );
});
