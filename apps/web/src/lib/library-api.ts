/**
 * 本棚の API (`/api/library/*`)。取り込みは「一覧を送る → 足りないファイルだけ送る → 完了」。
 */
import type {
  LibraryBook,
  LibraryBookDetail,
  LibraryCapabilities,
  LibraryChapterState,
  LibraryImportResponse,
  LibraryImportSlot,
  LibraryShelfEntry,
  LibraryShelfFilter,
  LibraryShelfResponse,
  UpdateLibraryChapterState,
  UpdateLibraryShelf,
} from "@stella/shared/library/types";
import { BlobWriter } from "@zip.js/zip.js";
import { ApiClientError, apiFetch, apiFetchRaw } from "./api-client";
import type { OpenedBookPackage } from "./book-package/read-package";

export const getLibraryCapabilities = (signal?: AbortSignal) =>
  apiFetch<LibraryCapabilities>("/api/library/capabilities", { signal });

/** API が 1 回に返す冊数の上限。 */
const SHELF_PAGE = 200;

/**
 * 本棚の本を全部取る。冊数の上限は無い (容量だけ) ので、API の 1 回ぶん (200 冊) で
 * 打ち切らず、`total` に届くまで続きを取る。
 */
export async function getShelf(
  filter: LibraryShelfFilter,
  signal?: AbortSignal,
): Promise<LibraryShelfResponse> {
  const entries: LibraryShelfEntry[] = [];
  let total = 0;
  // 1 万冊 (50 回) で止める: 並びが取得中に変わり続けても終わるように。
  for (let page = 0; page < 50; page++) {
    const response = await apiFetch<LibraryShelfResponse>(
      `/api/library/mine?filter=${filter}&limit=${SHELF_PAGE}&offset=${page * SHELF_PAGE}`,
      { signal },
    );
    entries.push(...response.entries);
    total = response.total;
    if (response.entries.length < SHELF_PAGE || entries.length >= total) break;
  }
  return { entries, total, limit: entries.length, offset: 0 };
}

export const getBook = (bookId: string, signal?: AbortSignal) =>
  apiFetch<LibraryBookDetail>(`/api/library/books/${encodeURIComponent(bookId)}`, { signal });

export const updateShelf = (bookId: string, body: UpdateLibraryShelf) =>
  apiFetch<{ entry: LibraryShelfEntry }>(`/api/library/shelf/${encodeURIComponent(bookId)}`, {
    method: "PUT",
    body,
  });

export const saveChapterState = (
  bookId: string,
  chapterId: string,
  body: UpdateLibraryChapterState,
) =>
  apiFetch<{ state: LibraryChapterState }>(
    `/api/library/books/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(chapterId)}/state`,
    { method: "PUT", body },
  );

export const deleteBook = (bookId: string) =>
  apiFetch<{ ok: true }>(`/api/library/books/${encodeURIComponent(bookId)}`, { method: "DELETE" });

/** 本の中のファイル (本文・画像・音声・動画) の URL。パスは zip の中のパス。 */
export function bookContentPath(bookId: string, path: string): string {
  return `/api/library/books/${encodeURIComponent(bookId)}/content/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export async function getChapterText(bookId: string, path: string, signal?: AbortSignal) {
  const res = await apiFetchRaw(bookContentPath(bookId, path), { signal });
  return res.text();
}

export interface ImportProgress {
  phase: "preparing" | "uploading" | "finishing" | "done";
  sentBytes: number;
  totalBytes: number;
  /** 前の版や前回の送信から使い回したファイルの数。 */
  reusedFiles: number;
  update: boolean;
}

/** 一時的な失敗 (通信・5xx) だけを 3 回まで送り直す。 */
async function withRetry<T>(run: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal?.aborted) throw signal.reason ?? new DOMException("aborted", "AbortError");
    try {
      return await run();
    } catch (error) {
      last = error;
      const retryable =
        !(error instanceof ApiClientError) || error.status >= 500 || error.status === 429;
      if (!retryable || (error instanceof DOMException && error.name === "AbortError")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  throw last;
}

/** zip から 1 ファイルを取り出して 1 回で送る。 */
async function sendSingle(
  bookId: string,
  slot: LibraryImportSlot,
  data: () => Promise<Blob>,
  signal: AbortSignal,
) {
  await withRetry(async () => {
    const body = await data();
    await apiFetchRaw(`/api/library/books/${bookId}/files/${slot.fileId}`, {
      method: "PUT",
      body,
      contentType: "application/octet-stream",
      signal,
    });
  }, signal);
}

/**
 * 大きいファイルを部分に分けて送る。zip.js が取り出す流れを partSize ごとに区切り、送り終える
 * まで次を読まない (全体をメモリに載せない)。
 */
async function sendMultipart(
  bookId: string,
  slot: LibraryImportSlot,
  pipe: (writable: WritableStream<Uint8Array>) => Promise<unknown>,
  onSent: (bytes: number) => void,
  signal: AbortSignal,
) {
  const base = `/api/library/books/${bookId}/files/${slot.fileId}`;
  const created = await withRetry(
    () =>
      apiFetch<{ uploaded: boolean; uploadId: string | null; partSize?: number }>(
        `${base}/multipart`,
        { method: "POST", signal },
      ),
    signal,
  );
  if (created.uploaded || !created.uploadId) return;
  const uploadId = created.uploadId;
  const partSize = created.partSize ?? slot.partSize ?? 64 * 1024 * 1024;
  const parts: { partNumber: number; etag: string }[] = [];
  let buffer = new Uint8Array(partSize);
  let filled = 0;
  const flush = async () => {
    if (!filled) return;
    const partNumber = parts.length + 1;
    const body = new Blob([buffer.subarray(0, filled)]);
    const part = await withRetry(async () => {
      const res = await apiFetchRaw(`${base}/multipart/parts/${partNumber}?uploadId=${uploadId}`, {
        method: "PUT",
        body,
        contentType: "application/octet-stream",
        signal,
      });
      return (await res.json()) as { partNumber: number; etag: string };
    }, signal);
    parts.push(part);
    onSent(filled);
    buffer = new Uint8Array(partSize);
    filled = 0;
  };
  await pipe(
    new WritableStream<Uint8Array>({
      async write(chunk) {
        let offset = 0;
        while (offset < chunk.length) {
          const take = Math.min(partSize - filled, chunk.length - offset);
          buffer.set(chunk.subarray(offset, offset + take), filled);
          filled += take;
          offset += take;
          if (filled === partSize) await flush();
        }
      },
      async close() {
        await flush();
      },
    }),
  );
  await withRetry(
    () =>
      apiFetch(`${base}/multipart/complete`, {
        method: "POST",
        body: { uploadId, parts },
        signal,
      }),
    signal,
  );
}

/**
 * 開いた zip を本棚に取り込む。途中で止まっても、同じ zip をもう一度開けば送り終えた
 * ファイルは飛ばして続きから送る。
 */
export async function importBookPackage(
  opened: OpenedBookPackage,
  onProgress: (progress: ImportProgress) => void,
  signal: AbortSignal,
): Promise<LibraryBook> {
  onProgress({ phase: "preparing", sentBytes: 0, totalBytes: 0, reusedFiles: 0, update: false });
  const started = await apiFetch<LibraryImportResponse>("/api/library/imports", {
    method: "POST",
    body: {
      manifest: opened.manifest,
      files: opened.listing,
      thumbnail: { size: opened.thumbnail.blob.size, sha256: opened.thumbnail.sha256 },
    },
    signal,
  });
  const seen = new Set<string>();
  const todo: LibraryImportSlot[] = [];
  let reusedFiles = 0;
  for (const slot of [...started.files, started.thumbnail]) {
    if (seen.has(slot.fileId)) continue;
    seen.add(slot.fileId);
    if (slot.uploaded) reusedFiles++;
    else todo.push(slot);
  }
  const totalBytes = todo.reduce((sum, slot) => sum + slot.size, 0);
  let sentBytes = 0;
  const report = (phase: ImportProgress["phase"]) =>
    onProgress({ phase, sentBytes, totalBytes, reusedFiles, update: started.update });
  report("uploading");
  for (const slot of todo) {
    if (slot.kind === "thumbnail") {
      await sendSingle(started.bookId, slot, async () => opened.thumbnail.blob, signal);
      sentBytes += slot.size;
      report("uploading");
      continue;
    }
    const entry = opened.entries.get(slot.path);
    if (!entry) throw new Error(`${slot.path} が zip にありません`);
    if (slot.mode === "single") {
      await sendSingle(
        started.bookId,
        slot,
        () => entry.getData(new BlobWriter(), { signal }),
        signal,
      );
      sentBytes += slot.size;
    } else {
      await sendMultipart(
        started.bookId,
        slot,
        (writable) => entry.getData(writable, { signal }),
        (bytes) => {
          sentBytes += bytes;
          report("uploading");
        },
        signal,
      );
    }
    report("uploading");
  }
  report("finishing");
  const done = await withRetry(
    () =>
      apiFetch<{ book: LibraryBook }>(
        `/api/library/books/${started.bookId}/imports/${started.revision}/complete`,
        { method: "POST", signal },
      ),
    signal,
  );
  report("done");
  return done.book;
}
