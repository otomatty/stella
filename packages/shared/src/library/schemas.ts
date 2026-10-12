import {
  LIBRARY_READING_STATUSES,
  type CreateLibraryBook,
  type UpdateLibraryBook,
  type UpdateLibraryShelf,
} from "./types";
export class LibraryInputError extends Error {}
function object(input: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new LibraryInputError("JSONオブジェクトが必要です");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new LibraryInputError("指定できない項目が含まれています");
  return value;
}
function title(input: unknown): string {
  if (typeof input !== "string" || !input.trim() || input.trim().length > 200)
    throw new LibraryInputError("タイトルは1〜200文字で入力してください");
  return input.trim();
}
function author(input: unknown): string | null {
  if (input === null || input === "") return null;
  if (typeof input !== "string" || input.trim().length > 200)
    throw new LibraryInputError("著者は200文字以内で入力してください");
  return input.trim() || null;
}
export function parseBookMetadata(input: unknown, create: true): CreateLibraryBook;
export function parseBookMetadata(input: unknown, create: false): UpdateLibraryBook;
export function parseBookMetadata(input: unknown, create: boolean): UpdateLibraryBook {
  const value = object(input, ["title", "author", "kind"]);
  const result: UpdateLibraryBook = {};
  if (create || "title" in value) result.title = title(value.title);
  if ("author" in value) result.author = author(value.author);
  if ("kind" in value) {
    if (value.kind !== "commercial" && value.kind !== "in_house")
      throw new LibraryInputError("書籍の種別が無効です");
    result.kind = value.kind;
  }
  if (!create && Object.keys(result).length === 0)
    throw new LibraryInputError("変更する項目が必要です");
  return result;
}
export function parseShelfUpdate(input: unknown): UpdateLibraryShelf {
  const value = object(input, ["readingStatus", "favorite", "tags"]);
  const result: UpdateLibraryShelf = {};
  if ("readingStatus" in value) {
    if (!LIBRARY_READING_STATUSES.some((status) => status === value.readingStatus))
      throw new LibraryInputError("読書状態が無効です");
    result.readingStatus = value.readingStatus as UpdateLibraryShelf["readingStatus"];
  }
  if ("favorite" in value) {
    if (typeof value.favorite !== "boolean")
      throw new LibraryInputError("お気に入りは真偽値が必要です");
    result.favorite = value.favorite;
  }
  if ("tags" in value) {
    if (
      !Array.isArray(value.tags) ||
      value.tags.length > 20 ||
      value.tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.trim().length > 40)
    )
      throw new LibraryInputError("タグは40文字以内、20個までです");
    result.tags = [...new Set((value.tags as string[]).map((tag) => tag.trim()))];
  }
  if (!Object.keys(result).length) throw new LibraryInputError("変更する項目が必要です");
  return result;
}
