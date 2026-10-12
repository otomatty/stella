import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { LibraryBookKind, LibraryReadingStatus } from "@stella/shared/library/types";
import { profiles } from "./schema.js";
// Millisecond timestamps; tenant-qualified foreign keys reject cross-tenant children.

export const libraryBooks = sqliteTable(
  "library_books",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id").notNull(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    author: text("author"),
    kind: text("kind").$type<LibraryBookKind>().notNull().default("commercial"),
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
    index("library_books_idx_0").on(t.tenantId, t.ownerId, t.updatedAt),
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
