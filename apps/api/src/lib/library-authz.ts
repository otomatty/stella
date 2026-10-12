import type { Caller } from "./authz.js";
import { ApiError } from "./authz.js";
export interface LibraryAccessBook {
  tenant_id: string;
  owner_id: string;
}
/** Private library ownership is independent of staff roles, email and developer mode. */
export function canOwnLibraryBook(caller: Caller, book: LibraryAccessBook): boolean {
  return caller.tenantId === book.tenant_id && caller.id === book.owner_id;
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
