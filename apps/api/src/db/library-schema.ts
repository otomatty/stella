import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { BookFileKind } from "@stella/shared/library/book-package";
import type { LibraryBookStatus, LibraryReadingStatus } from "@stella/shared/library/types";
import { profiles } from "./schema.js";
// 本棚 (migration 0070)。時刻はミリ秒。テナントを含む複合外部キーでテナントを跨がせない。
// 正本は drizzle/0070_library_book_packages.sql。ここは型と一覧のための写し。

export const libraryBooks = sqliteTable(
  "library_books",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    ownerId: text("owner_id").notNull(),
    packageId: text("package_id").notNull(),
    title: text("title").notNull(),
    authors: text("authors").notNull().default("[]"),
    language: text("language").notNull().default("ja"),
    description: text("description"),
    status: text("status").$type<LibraryBookStatus>().notNull().default("importing"),
    currentRevision: integer("current_revision").notNull().default(0),
    pendingRevision: integer("pending_revision"),
    pendingManifest: text("pending_manifest"),
    pendingSignature: text("pending_signature"),
    pendingThumbFileId: text("pending_thumb_file_id"),
    pendingActiveAt: integer("pending_active_at"),
    chapterCount: integer("chapter_count").notNull().default(0),
    hasAudio: integer("has_audio").notNull().default(0),
    hasVideo: integer("has_video").notNull().default(0),
    totalBytes: integer("total_bytes").notNull().default(0),
    pendingBytes: integer("pending_bytes").notNull().default(0),
    coverThumbFileId: text("cover_thumb_file_id"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.ownerId],
      foreignColumns: [profiles.tenantId, profiles.id],
    }).onDelete("cascade"),
    uniqueIndex("library_books_uq_0").on(t.tenantId, t.id),
    uniqueIndex("library_books_uq_1").on(t.tenantId, t.ownerId, t.packageId),
    check("library_books_check_0", sql`length(trim(title)) BETWEEN 1 AND 200`),
    check("library_books_check_1", sql`status IN ('importing','ready','deleting')`),
    index("library_books_idx_0").on(t.tenantId, t.ownerId, t.updatedAt),
  ],
);

export const libraryFiles = sqliteTable(
  "library_files",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    contentKey: text("content_key").notNull(),
    kind: text("kind").$type<BookFileKind>().notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    r2Key: text("r2_key").notNull(),
    status: text("status").$type<"pending" | "uploaded">().notNull().default("pending"),
    multipartUploadId: text("multipart_upload_id"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId],
      foreignColumns: [libraryBooks.tenantId, libraryBooks.id],
    }).onDelete("cascade"),
    uniqueIndex("library_files_uq_0").on(t.tenantId, t.id),
    uniqueIndex("library_files_uq_1").on(t.tenantId, t.bookId, t.contentKey),
    uniqueIndex("library_files_uq_2").on(t.r2Key),
  ],
);

export const libraryRevisionFiles = sqliteTable(
  "library_revision_files",
  {
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    revision: integer("revision").notNull(),
    path: text("path").notNull(),
    fileId: text("file_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.bookId, t.revision, t.path] }),
    foreignKey({
      columns: [t.tenantId, t.bookId],
      foreignColumns: [libraryBooks.tenantId, libraryBooks.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.fileId],
      foreignColumns: [libraryFiles.tenantId, libraryFiles.id],
    }).onDelete("cascade"),
    index("library_revision_files_idx_0").on(t.tenantId, t.fileId),
  ],
);

export const libraryChapters = sqliteTable(
  "library_chapters",
  {
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    revision: integer("revision").notNull(),
    chapterId: text("chapter_id").notNull(),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    textPath: text("text_path").notNull(),
    audioPath: text("audio_path"),
    videoPath: text("video_path"),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.bookId, t.revision, t.chapterId] }),
    foreignKey({
      columns: [t.tenantId, t.bookId],
      foreignColumns: [libraryBooks.tenantId, libraryBooks.id],
    }).onDelete("cascade"),
  ],
);

export const libraryShelfEntries = sqliteTable(
  "library_shelf_entries",
  {
    tenantId: text("tenant_id").notNull(),
    profileId: text("profile_id").notNull(),
    bookId: text("book_id").notNull(),
    readingStatus: text("reading_status").$type<LibraryReadingStatus>().notNull().default("unread"),
    favorite: integer("favorite").notNull().default(0),
    tags: text("tags").notNull().default("[]"),
    lastChapterId: text("last_chapter_id"),
    lastChapterClientAt: integer("last_chapter_client_at"),
    lastOpenedAt: integer("last_opened_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.profileId, t.bookId] }),
    foreignKey({
      columns: [t.tenantId, t.bookId],
      foreignColumns: [libraryBooks.tenantId, libraryBooks.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.profileId],
      foreignColumns: [profiles.tenantId, profiles.id],
    }).onDelete("cascade"),
    index("library_shelf_entries_idx_0").on(t.tenantId, t.profileId, t.updatedAt),
  ],
);

export const libraryReaderStates = sqliteTable(
  "library_reader_states",
  {
    tenantId: text("tenant_id").notNull(),
    profileId: text("profile_id").notNull(),
    bookId: text("book_id").notNull(),
    chapterId: text("chapter_id").notNull(),
    audioSec: real("audio_sec").notNull().default(0),
    videoSec: real("video_sec").notNull().default(0),
    completed: integer("completed").notNull().default(0),
    clientUpdatedAt: integer("client_updated_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.profileId, t.bookId, t.chapterId] }),
    foreignKey({
      columns: [t.tenantId, t.bookId],
      foreignColumns: [libraryBooks.tenantId, libraryBooks.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.profileId],
      foreignColumns: [profiles.tenantId, profiles.id],
    }).onDelete("cascade"),
  ],
);

/** R2 から消す接頭辞 (本 1 冊 `library/<t>/<b>/` か、ファイル 1 つ `library/<t>/<b>/files/<id>`)。 */
export const libraryR2Purges = sqliteTable("library_r2_purges", {
  prefix: text("prefix").primaryKey().notNull(),
  createdAt: integer("created_at").notNull(),
});
