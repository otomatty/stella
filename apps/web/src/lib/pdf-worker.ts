/**
 * PDF の確認と自動分割をする Web Worker。画面を止めずにブラウザの中で行う
 * (book-narrator の `src/web/lib/pdf-worker.ts` から移植)。pdf-lib はこの Worker の
 * チャンクにだけ入り、本棚以外の画面の bundle には載らない。
 */
import { PDFDocument } from "pdf-lib";
import { needsSplit, splitDocument } from "./pdf-split";

export type PdfWorkerRequest = { id: number; file: File; maxPages: number; maxBytes: number };
export type PdfWorkerResponse =
  | { id: number; type: "progress"; done: number; total: number }
  | { id: number; type: "split"; parts: { bytes: ArrayBuffer; pageCount: number }[] }
  | { id: number; type: "error"; message: string };

async function load(file: File): Promise<PDFDocument> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-")
    throw new Error("PDFではありません");
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    throw new Error(
      /encrypt/i.test(String(error))
        ? "パスワード付きのPDFは扱えません"
        : "PDFを読めません (壊れている可能性があります)",
    );
  }
}

self.onmessage = async (event: MessageEvent<PdfWorkerRequest>) => {
  const { id, file, maxPages, maxBytes } = event.data;
  const post = (message: PdfWorkerResponse, transfer: Transferable[] = []) =>
    (self as unknown as Worker).postMessage(message, transfer);
  try {
    const src = await load(file);
    const pageCount = src.getPageCount();
    if (!needsSplit(pageCount, file.size, maxPages, maxBytes)) {
      const bytes = await file.arrayBuffer();
      post({ id, type: "split", parts: [{ bytes, pageCount }] }, [bytes]);
      return;
    }
    const parts = (
      await splitDocument(src, file.size, maxPages, maxBytes, (done, total) =>
        post({ id, type: "progress", done, total }),
      )
    ).map((part) => ({
      // Copy exactly this view: a saved Uint8Array may sit inside a larger buffer.
      bytes: part.bytes.slice().buffer as ArrayBuffer,
      pageCount: part.pageCount,
    }));
    post(
      { id, type: "split", parts },
      parts.map((part) => part.bytes),
    );
  } catch (error) {
    post({ id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
