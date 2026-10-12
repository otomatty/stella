/**
 * 本棚の PDF 登録。Web Worker で PDF を確認・分割し、分けた原本を 1 つずつ API へ送る。
 * 原本 1 つは 50MB 以下なので、R2 の multipart は使わず 1 回の PUT で送る
 * (docs/book-library-design.md 7 章)。
 */
import type { LibraryCapabilities, LibraryPdf } from "@stella/shared/library/types";
import { ApiClientError, apiFetch, apiFetchRaw } from "./api-client";
import { partName } from "./pdf-split";
import type { PdfWorkerRequest, PdfWorkerResponse } from "./pdf-worker";

type Limits = LibraryCapabilities["limits"];
type Part = { bytes: ArrayBuffer; pageCount: number };

let worker: Worker | undefined;
let nextId = 1;

function splitPdf(file: File, limits: Limits, onProgress: (done: number, total: number) => void) {
  worker ??= new Worker(new URL("./pdf-worker.ts", import.meta.url), { type: "module" });
  const w = worker;
  const id = nextId++;
  return new Promise<Part[]>((resolve, reject) => {
    const handle = (event: MessageEvent<PdfWorkerResponse>) => {
      const data = event.data;
      if (data.id !== id) return;
      if (data.type === "progress") return onProgress(data.done, data.total);
      w.removeEventListener("message", handle);
      if (data.type === "error") reject(new Error(`${file.name}: ${data.message}`));
      else resolve(data.parts);
    };
    w.addEventListener("message", handle);
    w.postMessage({
      id,
      file,
      maxPages: limits.maxPdfPages,
      maxBytes: limits.maxPdfBytes,
    } satisfies PdfWorkerRequest);
  });
}

// The API accepts file names up to 200 characters.
const fileName = (name: string) => (name.length <= 200 ? name : `${name.slice(0, 196)}.pdf`);

/** Network failures and 5xx are retried; 4xx (bad PDF, limits) are final. */
async function retrying(action: () => Promise<unknown>): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await action();
      return;
    } catch (error) {
      const permanent = error instanceof ApiClientError && error.status < 500;
      if (attempt >= 3 || permanent) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function sendPart(bookId: string, name: string, part: Part): Promise<void> {
  // The client-chosen id makes a retried registration return the same PDF, even when the
  // first response was lost after the server saved it.
  const id = crypto.randomUUID();
  await retrying(() =>
    apiFetch<{ pdf: LibraryPdf }>(`/api/library/books/${bookId}/pdfs`, {
      method: "POST",
      body: {
        id,
        fileName: fileName(name),
        sizeBytes: part.bytes.byteLength,
        pageCount: part.pageCount,
      },
    }),
  );
  await retrying(() =>
    apiFetchRaw(`/api/library/books/${bookId}/pdfs/${id}`, {
      method: "PUT",
      body: new Blob([part.bytes], { type: "application/pdf" }),
      contentType: "application/pdf",
    }),
  );
}

export interface UploadProgress {
  /** Human-readable step, e.g. "book.pdf を分割中 (40/120ページ)". */
  label: string;
  /** 0–100 across all selected files. */
  percent: number;
}

/** What the book already holds, so each file is checked against every book limit before sending. */
export interface BookTotals {
  pdfs: number;
  bytes: number;
  pages: number;
}

/** The first book limit the totals pass, worded for the message, or null when all fit. */
export function overBookLimit(totals: BookTotals, limits: Limits): string | null {
  if (totals.pdfs > limits.maxBookPdfs) return `PDF${limits.maxBookPdfs}個`;
  if (totals.bytes > limits.maxBookBytes)
    return `${Math.round(limits.maxBookBytes / 1024 / 1024 / 1024)}GB`;
  if (totals.pages > limits.maxBookPages) return `${limits.maxBookPages}ページ`;
  return null;
}

/**
 * Splits each file in the chosen order and uploads the parts in that order. A file whose parts
 * would pass any book limit (PDF count, bytes, pages) is rejected before any of its parts is sent,
 * so a file is never left half uploaded.
 */
export async function uploadBookPdfs(
  bookId: string,
  files: File[],
  limits: Limits,
  known: BookTotals,
  onProgress: (progress: UploadProgress) => void,
): Promise<void> {
  let { pdfs, bytes, pages } = known;
  for (const [index, file] of files.entries()) {
    const base = (index / files.length) * 100,
      share = 100 / files.length;
    onProgress({ label: `${file.name} を確認中`, percent: base });
    const parts = await splitPdf(file, limits, (done, total) =>
      onProgress({
        label: `${file.name} を分割中 (${done}/${total}ページ)`,
        percent: base + (share * done) / total / 2,
      }),
    );
    pdfs += parts.length;
    bytes += parts.reduce((sum, part) => sum + part.bytes.byteLength, 0);
    pages += parts.reduce((sum, part) => sum + part.pageCount, 0);
    const over = overBookLimit({ pdfs, bytes, pages }, limits);
    if (over)
      throw new Error(`${file.name} を加えると1冊${over}を超えます。本を分けて登録してください`);
    for (const [n, part] of parts.entries()) {
      onProgress({
        label: `${file.name} を送信中 (${n + 1}/${parts.length})`,
        percent: base + share / 2 + (share * n) / parts.length / 2,
      });
      await sendPart(
        bookId,
        parts.length > 1 ? partName(file.name, n, parts.length) : file.name,
        part,
      );
    }
  }
  onProgress({ label: "送信が終わりました", percent: 100 });
}
