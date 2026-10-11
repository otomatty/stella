import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type {
  LibraryBookKind,
  LibraryBookStatus,
  LibraryReadingStatus,
} from "@stella/shared/library/types";
import { profiles } from "./schema.js";
// Millisecond timestamps match the narrator pipeline; tenant-qualified foreign keys reject cross-tenant children.

export const libraryBooks = sqliteTable(
  "library_books",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    author: text("author"),
    kind: text("kind").$type<LibraryBookKind>().notNull().default("commercial"),
    visibility: text("visibility").notNull().default("private"),
    publicationStatus: text("publication_status").notNull().default("draft"),
    status: text("status").$type<LibraryBookStatus>().notNull().default("draft"),
    generation: integer("generation").notNull().default(1),
    pageCount: integer("page_count"),
    chapterPlanKey: text("chapter_plan_key"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.ownerId],
      foreignColumns: [profiles.tenantId, profiles.id],
    }).onDelete("cascade"),
    uniqueIndex("library_books_uq_0").on(t.tenantId, t.id),
    check("library_books_check_0", sql`length(trim(title)) BETWEEN 1 AND 200`),
    check("library_books_check_1", sql`kind IN ('commercial','in_house')`),
    check("library_books_check_2", sql`visibility IN ('private','restricted','company')`),
    check("library_books_check_3", sql`publication_status IN ('draft','published')`),
    check(
      "library_books_check_4",
      sql`status IN ('draft','uploading','processing','ready','failed','deleting')`,
    ),
    check("library_books_check_5", sql`generation >= 1`),
    check("library_books_check_6", sql`page_count IS NULL OR page_count >= 0`),
    index("library_books_idx_0").on(t.tenantId, t.ownerId, t.updatedAt),
  ],
);

export const libraryBookPdfs = sqliteTable(
  "library_book_pdfs",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    position: integer("position").notNull(),
    fileName: text("file_name").notNull(),
    sourceFileName: text("source_file_name"),
    sizeBytes: integer("size_bytes").notNull(),
    r2Key: text("r2_key").notNull(),
    uploadStatus: text("upload_status").notNull().default("uploading"),
    uploadId: text("upload_id"),
    pageCount: integer("page_count"),
    firstPageNo: integer("first_page_no"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId],
      foreignColumns: [libraryBooks.tenantId, libraryBooks.id],
    }).onDelete("cascade"),
    uniqueIndex("library_book_pdfs_uq_0").on(t.tenantId, t.bookId, t.position),
    check("library_book_pdfs_check_0", sql`position >= 1`),
    check("library_book_pdfs_check_1", sql`size_bytes > 0`),
    check("library_book_pdfs_check_2", sql`upload_status IN ('uploading','completed')`),
  ],
);

export const libraryPages = sqliteTable(
  "library_pages",
  {
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    pageNo: integer("page_no").notNull(),
    imageR2Key: text("image_r2_key"),
    ocrStatus: text("ocr_status").notNull().default("pending"),
    ocrMarkdown: text("ocr_markdown"),
    ocrFigures: text("ocr_figures"),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId],
      foreignColumns: [libraryBooks.tenantId, libraryBooks.id],
    }).onDelete("cascade"),
    uniqueIndex("library_pages_uq_0").on(t.tenantId, t.bookId, t.pageNo),
    check("library_pages_check_0", sql`page_no >= 1`),
    check("library_pages_check_1", sql`ocr_status IN ('pending','succeeded','failed')`),
  ],
);

export const libraryFigures = sqliteTable(
  "library_figures",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    fileName: text("file_name").notNull(),
    pageNo: integer("page_no").notNull(),
    caption: text("caption"),
    r2Key: text("r2_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId, t.pageNo],
      foreignColumns: [libraryPages.tenantId, libraryPages.bookId, libraryPages.pageNo],
    }).onDelete("cascade"),
    uniqueIndex("library_figures_uq_0").on(t.tenantId, t.bookId, t.fileName),
    check("library_figures_check_0", sql`width > 0 AND height > 0`),
  ],
);

export const libraryChapters = sqliteTable(
  "library_chapters",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    markdown: text("markdown").notNull().default(""),
    speechHash: text("speech_hash").notNull().default(""),
    revision: integer("revision").notNull().default(1),
    startPage: integer("start_page").notNull(),
    endPage: integer("end_page").notNull(),
    edited: integer("edited").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId],
      foreignColumns: [libraryBooks.tenantId, libraryBooks.id],
    }).onDelete("cascade"),
    uniqueIndex("library_chapters_uq_0").on(t.tenantId, t.bookId, t.id),
    uniqueIndex("library_chapters_uq_1").on(t.tenantId, t.bookId, t.position),
    check("library_chapters_check_0", sql`revision >= 1`),
    check("library_chapters_check_1", sql`start_page >= 1 AND end_page >= start_page`),
  ],
);

export const libraryChapterRevisions = sqliteTable(
  "library_chapter_revisions",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    chapterId: text("chapter_id").notNull(),
    revision: integer("revision").notNull(),
    markdown: text("markdown").notNull(),
    speechHash: text("speech_hash").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId, t.chapterId],
      foreignColumns: [libraryChapters.tenantId, libraryChapters.bookId, libraryChapters.id],
    }).onDelete("cascade"),
    uniqueIndex("library_chapter_revisions_uq_0").on(t.tenantId, t.bookId, t.chapterId, t.revision),
  ],
);

export const libraryAudios = sqliteTable(
  "library_audios",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    chapterId: text("chapter_id").notNull(),
    revision: integer("revision").notNull(),
    status: text("status").notNull().default("generating"),
    generationJobId: text("generation_job_id"),
    r2Key: text("r2_key"),
    durationSec: real("duration_sec"),
    sizeBytes: integer("size_bytes"),
    sourceSpeechHash: text("source_speech_hash").notNull(),
    ttsModel: text("tts_model").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId, t.chapterId],
      foreignColumns: [libraryChapters.tenantId, libraryChapters.bookId, libraryChapters.id],
    }).onDelete("cascade"),
    uniqueIndex("library_audios_uq_0").on(t.tenantId, t.bookId, t.chapterId, t.revision),
    check("library_audios_check_0", sql`status IN ('generating','ready','failed')`),
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
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId],
      foreignColumns: [libraryBooks.tenantId, libraryBooks.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.profileId],
      foreignColumns: [profiles.tenantId, profiles.id],
    }).onDelete("cascade"),
    uniqueIndex("library_shelf_entries_uq_0").on(t.tenantId, t.profileId, t.bookId),
    check(
      "library_shelf_entries_check_0",
      sql`reading_status IN ('unread','reading','finished','archived')`,
    ),
    check("library_shelf_entries_check_1", sql`favorite IN (0,1)`),
    check("library_shelf_entries_check_2", sql`json_valid(tags) AND json_type(tags) = 'array'`),
    index("library_shelf_entries_idx_0").on(t.tenantId, t.profileId, t.updatedAt),
    index("library_shelf_entries_idx_1").on(t.tenantId, t.bookId),
  ],
);

export const libraryReaderStates = sqliteTable(
  "library_reader_states",
  {
    tenantId: text("tenant_id").notNull(),
    profileId: text("profile_id").notNull(),
    bookId: text("book_id").notNull(),
    chapterId: text("chapter_id").notNull(),
    revision: integer("revision").notNull(),
    textLocator: text("text_locator"),
    audioPositionSec: real("audio_position_sec").notNull().default(0),
    version: integer("version").notNull().default(1),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId, t.chapterId],
      foreignColumns: [libraryChapters.tenantId, libraryChapters.bookId, libraryChapters.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.profileId],
      foreignColumns: [profiles.tenantId, profiles.id],
    }).onDelete("cascade"),
    uniqueIndex("library_reader_states_uq_0").on(t.tenantId, t.profileId, t.bookId, t.chapterId),
    check("library_reader_states_check_0", sql`audio_position_sec >= 0`),
    check("library_reader_states_check_1", sql`version >= 1`),
    index("library_reader_states_idx_0").on(t.tenantId, t.bookId, t.chapterId),
  ],
);

export const libraryAnnotations = sqliteTable(
  "library_annotations",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    profileId: text("profile_id").notNull(),
    bookId: text("book_id"),
    chapterId: text("chapter_id"),
    bookTitleSnapshot: text("book_title_snapshot"),
    chapterTitleSnapshot: text("chapter_title_snapshot"),
    revision: integer("revision").notNull(),
    kind: text("kind").notNull(),
    locator: text("locator"),
    body: text("body").notNull().default(""),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId],
      foreignColumns: [libraryBooks.tenantId, libraryBooks.id],
    }),
    foreignKey({
      columns: [t.tenantId, t.bookId, t.chapterId],
      foreignColumns: [libraryChapters.tenantId, libraryChapters.bookId, libraryChapters.id],
    }),
    foreignKey({
      columns: [t.tenantId, t.profileId],
      foreignColumns: [profiles.tenantId, profiles.id],
    }).onDelete("cascade"),
    check("library_annotations_check_0", sql`kind IN ('note','bookmark')`),
    index("library_annotations_idx_0").on(t.tenantId, t.profileId, t.bookId),
    index("library_annotations_idx_1").on(t.tenantId, t.bookId, t.chapterId),
  ],
);

export const libraryJobs = sqliteTable(
  "library_jobs",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    chapterId: text("chapter_id"),
    generation: integer("generation").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull().default("queued"),
    progressCurrent: integer("progress_current").notNull().default(0),
    progressTotal: integer("progress_total"),
    attempt: integer("attempt").notNull().default(1),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at").notNull(),
    startedAt: integer("started_at"),
    finishedAt: integer("finished_at"),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId],
      foreignColumns: [libraryBooks.tenantId, libraryBooks.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.createdBy],
      foreignColumns: [profiles.tenantId, profiles.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.bookId, t.chapterId],
      foreignColumns: [libraryChapters.tenantId, libraryChapters.bookId, libraryChapters.id],
    }).onDelete("cascade"),
    uniqueIndex("library_jobs_uq_0").on(t.tenantId, t.bookId, t.id),
    check("library_jobs_check_0", sql`type IN ('ocr','split','tts')`),
    check("library_jobs_check_1", sql`status IN ('queued','running','succeeded','failed')`),
    check("library_jobs_check_2", sql`generation >= 1 AND attempt >= 1`),
    index("library_jobs_idx_0").on(t.tenantId, t.bookId, t.status),
  ],
);

export const libraryJobUsages = sqliteTable(
  "library_job_usages",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    jobId: text("job_id").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    unit: text("unit").notNull(),
    quantity: real("quantity").notNull(),
    estimatedCostUsd: real("estimated_cost_usd"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId, t.jobId],
      foreignColumns: [libraryJobs.tenantId, libraryJobs.bookId, libraryJobs.id],
    }).onDelete("cascade"),
    check("library_job_usages_check_0", sql`quantity >= 0`),
    index("library_job_usages_idx_0").on(t.tenantId, t.bookId, t.jobId),
  ],
);

export const libraryJobDispatches = sqliteTable(
  "library_job_dispatches",
  {
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    jobId: text("job_id").notNull(),
    instanceId: text("instance_id").notNull(),
    createdAt: integer("created_at").notNull(),
    dispatchedAt: integer("dispatched_at"),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.bookId, t.jobId],
      foreignColumns: [libraryJobs.tenantId, libraryJobs.bookId, libraryJobs.id],
    }).onDelete("cascade"),
    uniqueIndex("library_job_dispatches_uq_0").on(t.tenantId, t.bookId, t.jobId),
    uniqueIndex("library_job_dispatches_uq_1").on(t.instanceId),
  ],
);

export const libraryR2Deletions = sqliteTable(
  "library_r2_deletions",
  {
    prefix: text("prefix").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    bookId: text("book_id").notNull(),
    createdAt: integer("created_at").notNull(),
    notBefore: integer("not_before").notNull(),
  },
  (t) => [index("library_r2_deletions_idx_0").on(t.notBefore)],
);
