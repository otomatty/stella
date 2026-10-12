export const LIBRARY_READING_STATUSES = ["unread", "reading", "finished", "archived"] as const;
export type LibraryReadingStatus = (typeof LIBRARY_READING_STATUSES)[number];
export type LibraryBookKind = "commercial" | "in_house";
export type LibraryBookStatus =
  | "draft"
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "deleting";
export interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  kind: LibraryBookKind;
  status: LibraryBookStatus;
  pageCount: number | null;
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
  metadata: boolean;
  processingAvailable: boolean;
  upload: boolean;
  audio: boolean;
  sharing: boolean;
  limits: {
    maxPdfBytes: number;
    maxPdfPages: number;
    maxBookBytes: number;
    maxBookPages: number;
    maxBookPdfs: number;
  };
}
export const MAX_LIBRARY_BOOK_PDFS = 50;
export const LIBRARY_LIMITS: LibraryCapabilities["limits"] = {
  maxPdfBytes: 50 * 1024 * 1024,
  maxPdfPages: 100,
  maxBookBytes: 1024 * 1024 * 1024,
  maxBookPages: 1000,
  maxBookPdfs: MAX_LIBRARY_BOOK_PDFS,
};
export interface LibraryPdf {
  id: string;
  position: number;
  fileName: string;
  sizeBytes: number;
  uploadStatus: "uploading" | "completed";
  pageCount: number | null;
}
export interface LibraryJob {
  id: string;
  type: "ocr" | "split" | "tts";
  status: "queued" | "running" | "succeeded" | "failed";
  attempt: number;
  progressCurrent: number;
  progressTotal: number | null;
  errorMessage: string | null;
  createdAt: number;
  finishedAt: number | null;
}
export interface CreateLibraryPdf {
  fileName: string;
  sizeBytes: number;
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
/** Internal service binding contract. Never accept identities or arbitrary operations from HTTP. */
export interface NarratorJobRequest {
  tenantId: string;
  bookId: string;
  jobId: string;
  generation: number;
}
export interface NarratorCapabilities {
  configured: boolean;
  provider: "fake" | "gemini" | "unconfigured";
}
export interface NarratorService {
  capabilities(): Promise<NarratorCapabilities>;
  startJob(request: NarratorJobRequest): Promise<{ instanceId: string }>;
}
