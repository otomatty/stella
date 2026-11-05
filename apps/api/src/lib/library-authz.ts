import { LEGACY_TENANT_ID } from "@stella/shared/legacy-tenant";
import type { Caller } from "./authz.js";
import { ApiError } from "./authz.js";
export interface LibraryAccessBook {
  tenant_id: string;
  owner_id: string;
  status: string;
}
/** Private library ownership is independent of staff roles, email and developer mode. */
/** テストが列名を持たなくて済む、所有者の本。 */
export function ownedLibraryBook(ownerId = "owner", status = "ready"): LibraryAccessBook {
  return { tenant_id: LEGACY_TENANT_ID, owner_id: ownerId, status };
}

export function canOwnLibraryBook(caller: Caller, book: LibraryAccessBook): boolean {
  return (
    book.tenant_id === LEGACY_TENANT_ID && caller.id === book.owner_id && book.status !== "deleting"
  );
}
export function requireOwnLibraryBook(
  caller: Caller,
  book: LibraryAccessBook | null,
): asserts book is LibraryAccessBook {
  if (!book || !canOwnLibraryBook(caller, book)) throw new ApiError("書籍が見つかりません", 404);
}
export function libraryEnabled(value: string | undefined): boolean {
  return value !== "0" && value !== "false";
}
export function requireLibraryEnabled(value: string | undefined): void {
  if (!libraryEnabled(value)) throw new ApiError("本棚は現在利用できません", 403);
}
