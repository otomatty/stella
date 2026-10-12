export const LIBRARY_READING_STATUSES = ["unread", "reading", "finished", "archived"] as const;
export type LibraryReadingStatus = (typeof LIBRARY_READING_STATUSES)[number];
export type LibraryBookKind = "commercial" | "in_house";
export interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  kind: LibraryBookKind;
  createdAt: number;
  updatedAt: number;
}
export interface LibraryShelfEntry {
  book: LibraryBook;
  readingStatus: LibraryReadingStatus;
  favorite: boolean;
  tags: string[];
  updatedAt: number;
}
export interface LibraryCapabilities {
  enabled: boolean;
}
export interface LibraryShelfResponse {
  entries: LibraryShelfEntry[];
  total: number;
  limit: number;
  offset: number;
}
export interface CreateLibraryBook {
  title: string;
  author?: string | null;
  kind?: LibraryBookKind;
}
export type UpdateLibraryBook = Partial<CreateLibraryBook>;
export interface UpdateLibraryShelf {
  readingStatus?: LibraryReadingStatus;
  favorite?: boolean;
  tags?: string[];
}
