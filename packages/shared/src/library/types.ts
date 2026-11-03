import type { BookFileKind, BookPackageLimits } from "./book-package";

export const LIBRARY_READING_STATUSES = ["unread", "reading", "finished", "archived"] as const;
export type LibraryReadingStatus = (typeof LIBRARY_READING_STATUSES)[number];

/** importing = 最初の版を取り込み中 (まだ読めない)、ready = 読める、deleting = 削除の片付け待ち。 */
export type LibraryBookStatus = "importing" | "ready" | "deleting";

export const LIBRARY_SHELF_FILTERS = ["all", "reading", "unread", "finished", "favorite"] as const;
export type LibraryShelfFilter = (typeof LIBRARY_SHELF_FILTERS)[number];

export interface LibraryBook {
  id: string;
  /** book.json の id。 */
  packageId: string;
  title: string;
  authors: string[];
  language: string;
  description: string | null;
  /** 読める版 (0 = まだ無い)。 */
  revision: number;
  status: LibraryBookStatus;
  chapterCount: number;
  hasAudio: boolean;
  hasVideo: boolean;
  totalBytes: number;
  /** 表紙のサムネイルの URL (`/api/...`)。版が変わると変わる。 */
  coverUrl: string | null;
  /** 取り込み中の版 (送信が途中で止まった版を含む)。 */
  pendingRevision: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface LibraryShelfEntry {
  book: LibraryBook;
  readingStatus: LibraryReadingStatus;
  favorite: boolean;
  tags: string[];
  lastChapterId: string | null;
  progress: { completedChapters: number; totalChapters: number };
  updatedAt: number;
}

export interface LibraryShelfResponse {
  entries: LibraryShelfEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface LibraryChapterState {
  audioSec: number;
  videoSec: number;
  completed: boolean;
  updatedAt: number | null;
}

export interface LibraryChapter {
  id: string;
  position: number;
  title: string;
  /** zip の中のパス。本文・音声・動画は `/api/library/books/:id/content/<パス>` で取る。 */
  textPath: string;
  audioPath: string | null;
  videoPath: string | null;
  state: LibraryChapterState;
}

export interface LibraryBookDetail {
  entry: LibraryShelfEntry;
  chapters: LibraryChapter[];
}

export interface LibraryCapabilities {
  enabled: boolean;
  limits: BookPackageLimits;
}

/** 取り込みの開始。ファイルの中身は送らず、一覧と表紙のサムネイルの要約だけを送る。 */
export interface CreateLibraryImport {
  manifest: unknown;
  files: { path: string; size: number; crc32: number }[];
  thumbnail: { size: number; sha256: string };
}

export interface LibraryImportSlot {
  path: string;
  fileId: string;
  kind: BookFileKind;
  size: number;
  /** 送らなくてよい (前の版と同じ中身か、送信済み)。 */
  uploaded: boolean;
  mode: "single" | "multipart";
  partSize: number | null;
}

export interface LibraryImportResponse {
  bookId: string;
  revision: number;
  /** 既にある本の新しい版か。 */
  update: boolean;
  files: LibraryImportSlot[];
  thumbnail: LibraryImportSlot;
}

export interface UpdateLibraryShelf {
  readingStatus?: LibraryReadingStatus;
  favorite?: boolean;
  tags?: string[];
  lastChapterId?: string;
}

export interface UpdateLibraryChapterState {
  audioSec?: number;
  videoSec?: number;
  completed?: boolean;
  /** 端末の時刻 (ミリ秒)。保存済みより古い送信は無視する。 */
  clientUpdatedAt: number;
}
