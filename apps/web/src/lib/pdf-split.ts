/**
 * 上限を超える PDF の分け方。book-narrator の `src/web/lib/pdf-split.ts` (ADR-0012) から移植した。
 * ブラウザの Web Worker (`pdf-worker.ts`) から使う。ページ数で等分し、分けた結果が上限を
 * 超えていたら、その部分をさらに半分にする。ページを写すだけで、描画や再圧縮はしない。
 */
import { PDFDocument } from "pdf-lib";

/** 最初に分ける数。ページ数と大きさの両方の上限に収まる見込みの数。 */
export function initialParts(
  pageCount: number,
  sizeBytes: number,
  maxPages: number,
  maxBytes: number,
): number {
  return Math.max(1, Math.ceil(pageCount / maxPages), Math.ceil(sizeBytes / maxBytes));
}

/** 0 始まりのページ番号の範囲 [最初, 最後] を、できるだけ同じページ数ずつ parts 個に分ける。 */
export function equalRanges(pageCount: number, parts: number): [number, number][] {
  const n = Math.min(parts, pageCount);
  const out: [number, number][] = [];
  let start = 0;
  for (let i = 0; i < n; i++) {
    const size = Math.floor(pageCount / n) + (i < pageCount % n ? 1 : 0);
    out.push([start, start + size - 1]);
    start += size;
  }
  return out;
}

export const needsSplit = (
  pageCount: number,
  sizeBytes: number,
  maxPages: number,
  maxBytes: number,
): boolean => pageCount > maxPages || sizeBytes > maxBytes;

/** 分けた PDF の名前。元の名前に連番を付ける (book.pdf → book_01.pdf)。 */
export function partName(fileName: string, index: number, total: number): string {
  const base = fileName.replace(/\.pdf$/i, "");
  return `${base}_${String(index + 1).padStart(Math.max(2, String(total).length), "0")}.pdf`;
}

async function extract(src: PDFDocument, [first, last]: [number, number]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const pages = await out.copyPages(
    src,
    Array.from({ length: last - first + 1 }, (_, i) => first + i),
  );
  for (const page of pages) out.addPage(page);
  return out.save({ useObjectStreams: true });
}

/** PDF を上限に収まるよう分ける。上限を超えた部分は半分にして、元の位置に戻す。 */
export async function splitDocument(
  src: PDFDocument,
  sizeBytes: number,
  maxPages: number,
  maxBytes: number,
  onProgress: (done: number, total: number) => void = () => undefined,
): Promise<{ bytes: Uint8Array; pageCount: number }[]> {
  const pageCount = src.getPageCount();
  const queue = equalRanges(pageCount, initialParts(pageCount, sizeBytes, maxPages, maxBytes));
  const parts: { bytes: Uint8Array; pageCount: number }[] = [];
  let done = 0;
  for (let range = queue.shift(); range; range = queue.shift()) {
    const bytes = await extract(src, range);
    const pages = range[1] - range[0] + 1;
    if (bytes.length > maxBytes || pages > maxPages) {
      if (pages === 1)
        throw new Error(
          `1ページで上限 (${Math.round(maxBytes / 1024 / 1024)}MB) を超えるため分割できません`,
        );
      const mid = range[0] + Math.floor(pages / 2) - 1;
      queue.unshift([range[0], mid], [mid + 1, range[1]]);
      continue;
    }
    parts.push({ bytes, pageCount: pages });
    done += pages;
    onProgress(done, pageCount);
  }
  return parts;
}
