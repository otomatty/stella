// book-narrator の test/pdf-split.test.ts (AC-02-8) から移植した。
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { equalRanges, initialParts, needsSplit, partName, splitDocument } from "./pdf-split";

/** ページごとに幅を変えた PDF (順番を確かめるため)。 */
async function pdfWithWidths(n: number, filler = 0) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) {
    const page = doc.addPage([100 + i, 200]);
    // 大きさを持たせるための図形
    for (let k = 0; k < filler; k++)
      page.drawRectangle({ x: k % 90, y: k % 190, width: 1, height: 1 });
  }
  return doc;
}
const widths = async (bytes: Uint8Array) =>
  (await PDFDocument.load(bytes)).getPages().map((page) => page.getWidth());

describe("PDF の自動分割", () => {
  it("分ける数と範囲: ページ数で等分し、端数は前に寄せる", () => {
    expect(initialParts(250, 10, 100, 1000)).toBe(3);
    expect(initialParts(50, 2500, 100, 1000)).toBe(3);
    expect(equalRanges(250, 3)).toEqual([
      [0, 83],
      [84, 166],
      [167, 249],
    ]);
    expect(needsSplit(100, 1000, 100, 1000)).toBe(false);
    expect(needsSplit(101, 1000, 100, 1000)).toBe(true);
    expect(partName("本.pdf", 0, 3)).toBe("本_01.pdf");
    expect(partName("book.PDF", 9, 120)).toBe("book_010.pdf");
  });

  it("上限以下に収まり、ページの内容と順番は元のまま", async () => {
    const parts = await splitDocument(await pdfWithWidths(23), 1, 10, 10 * 1024 * 1024);
    expect(parts.map((part) => part.pageCount)).toEqual([8, 8, 7]);
    const all = (await Promise.all(parts.map((part) => widths(part.bytes)))).flat();
    expect(all).toEqual(Array.from({ length: 23 }, (_, i) => 100 + i));
  });

  it("等分しても大きさの上限を超える部分は、さらに半分にする", async () => {
    const src = await pdfWithWidths(8, 400);
    const maxBytes = Math.ceil((await src.save()).length / 3);
    const parts = await splitDocument(src, 1, 100, maxBytes);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((part) => part.bytes.length <= maxBytes)).toBe(true);
    expect((await Promise.all(parts.map((part) => widths(part.bytes)))).flat()).toEqual(
      Array.from({ length: 8 }, (_, i) => 100 + i),
    );
  });
});
