import { BOOK_PACKAGE_LIMITS } from "./book-package";
import {
  LIBRARY_READING_STATUSES,
  type CreateLibraryImport,
  type UpdateLibraryChapterState,
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

const CHAPTER_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function parseShelfUpdate(input: unknown): UpdateLibraryShelf {
  const value = object(input, ["readingStatus", "favorite", "tags", "lastChapterId"]);
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
  if ("lastChapterId" in value) {
    if (typeof value.lastChapterId !== "string" || !CHAPTER_ID.test(value.lastChapterId))
      throw new LibraryInputError("章の指定が無効です");
    result.lastChapterId = value.lastChapterId;
  }
  if (!Object.keys(result).length) throw new LibraryInputError("変更する項目が必要です");
  return result;
}

/** 再生位置は 0〜48 時間の秒数。 */
function seconds(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 48 * 3600)
    throw new LibraryInputError(`${label}が無効です`);
  return Math.round(value * 10) / 10;
}

export function parseChapterState(input: unknown): UpdateLibraryChapterState {
  const value = object(input, ["audioSec", "videoSec", "completed", "clientUpdatedAt"]);
  if (!Number.isSafeInteger(value.clientUpdatedAt) || (value.clientUpdatedAt as number) <= 0)
    throw new LibraryInputError("端末の時刻が必要です");
  const result: UpdateLibraryChapterState = { clientUpdatedAt: value.clientUpdatedAt as number };
  if ("audioSec" in value) result.audioSec = seconds(value.audioSec, "音声の位置");
  if ("videoSec" in value) result.videoSec = seconds(value.videoSec, "動画の位置");
  if ("completed" in value) {
    if (typeof value.completed !== "boolean")
      throw new LibraryInputError("済みの印は真偽値が必要です");
    result.completed = value.completed;
  }
  if (Object.keys(result).length === 1) throw new LibraryInputError("変更する項目が必要です");
  return result;
}

/**
 * 取り込みの開始の形だけを確かめる。book.json の中身は `parseBookManifest`、ファイルの
 * 選び方は `planPackageFiles` が見る。
 */
export function parseCreateImport(input: unknown): CreateLibraryImport {
  const value = object(input, ["manifest", "files", "thumbnail"]);
  if (!Array.isArray(value.files) || value.files.length > BOOK_PACKAGE_LIMITS.maxBookFiles * 2)
    throw new LibraryInputError("ファイルの一覧が無効です");
  const files = value.files.map((file) => {
    const entry = object(file, ["path", "size", "crc32"]);
    if (typeof entry.path !== "string" || !entry.path || entry.path.length > 400)
      throw new LibraryInputError("ファイルのパスが無効です");
    if (!Number.isSafeInteger(entry.size) || (entry.size as number) < 0)
      throw new LibraryInputError("ファイルの大きさが無効です");
    if (
      !Number.isSafeInteger(entry.crc32) ||
      (entry.crc32 as number) < 0 ||
      (entry.crc32 as number) > 0xffffffff
    )
      throw new LibraryInputError("ファイルの CRC-32 が無効です");
    return { path: entry.path, size: entry.size as number, crc32: entry.crc32 as number };
  });
  const thumbnail = object(value.thumbnail, ["size", "sha256"]);
  if (
    !Number.isSafeInteger(thumbnail.size) ||
    (thumbnail.size as number) < 1 ||
    (thumbnail.size as number) > BOOK_PACKAGE_LIMITS.maxThumbnailBytes
  )
    throw new LibraryInputError("表紙のサムネイルの大きさが無効です");
  if (typeof thumbnail.sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(thumbnail.sha256))
    throw new LibraryInputError("表紙のサムネイルの SHA-256 が無効です");
  return {
    manifest: value.manifest,
    files,
    thumbnail: { size: thumbnail.size as number, sha256: thumbnail.sha256.toLowerCase() },
  };
}
