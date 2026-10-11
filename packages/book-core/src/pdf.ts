// PDFのページ数を数える、図版のあるページを画像にして切り抜く(検証S-1の案A: Workersの中でPDFiumで描画する)。
// 大きなPDFをPDFiumに丸ごと渡さず、そのページだけのPDFを作ってから描画する(S-1の slim)。
// ponytail: 1つのPDFを丸ごとメモリに読む。実環境では48.5MB・100ページを描画できた(S-1)。上限は50MBのまま【仮】。
import { PDFiumLibrary } from "@hyzyla/pdfium";
import pdfiumWasm from "@hyzyla/pdfium/pdfium.wasm";
import encodeWebp, { init as initWebp } from "@jsquash/webp/encode";
import webpWasm from "@jsquash/webp/codec/enc/webp_enc_simd.wasm";
import { PDFDocument } from "pdf-lib";
import type { FigureSpec } from "./ocr";

/** 描画するページ画像の幅(画素)。スキャンの解像度(約2000×2700)に合わせる。 */
const RENDER_WIDTH = 2000;

export class InvalidPdfError extends Error {
  constructor(message: string) {
    super(`[invalid_pdf] ${message}`);
  }
}

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    throw new InvalidPdfError(
      /encrypt/i.test(msg) ? "パスワードつきのPDFは扱えません" : "PDFを読めません",
    );
  }
}

let pdfium: Promise<PDFiumLibrary> | undefined;
function library() {
  // Workersは実行時にWebAssemblyをコンパイルできないため、取り込み済みのモジュールから作る
  pdfium ??= PDFiumLibrary.init({
    instantiateWasm(imports: WebAssembly.Imports, done: (instance: WebAssembly.Instance) => void) {
      const instance = new WebAssembly.Instance(pdfiumWasm, imports);
      done(instance);
      return instance.exports;
    },
  } as never);
  return pdfium;
}
let webpReady: Promise<unknown> | undefined;

interface Rgba {
  data: Uint8Array;
  width: number;
  height: number;
}

/** そのページだけのPDFを作り、PDFiumで描画する。RGBAで返す。 */
export async function renderPage(doc: PDFDocument, pageIndex: number): Promise<Rgba> {
  const single = await PDFDocument.create();
  const [copied] = await single.copyPages(doc, [pageIndex]);
  single.addPage(copied);
  const lib = await library();
  const document = await lib.loadDocument(await single.save());
  try {
    const page = document.getPage(0);
    const { originalWidth } = page.getOriginalSize();
    const image = await page.render({
      scale: RENDER_WIDTH / originalWidth,
      render: "bitmap",
      colorSpace: "BGRA",
    });
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const b = data[i];
      data[i] = data[i + 2];
      data[i + 2] = b;
    }
    return { data, width: image.width, height: image.height };
  } finally {
    document.destroy();
  }
}

/** LLMが返す矩形 [ymin, xmin, ymax, xmax](0〜1000)を画素に直す。図が欠けないよう、少し外側に広げる。 */
export function boxToPixels(
  box: [number, number, number, number],
  width: number,
  height: number,
  padRatio = 0.01,
) {
  const [ymin, xmin, ymax, xmax] = box;
  const padX = Math.round(width * padRatio);
  const padY = Math.round(height * padRatio);
  const left = Math.max(0, Math.round((xmin / 1000) * width) - padX);
  const top = Math.max(0, Math.round((ymin / 1000) * height) - padY);
  const right = Math.min(width, Math.round((xmax / 1000) * width) + padX);
  const bottom = Math.min(height, Math.round((ymax / 1000) * height) + padY);
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

export function crop(
  image: Rgba,
  rect: { left: number; top: number; width: number; height: number },
): Rgba {
  const out = new Uint8Array(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y++) {
    const start = ((rect.top + y) * image.width + rect.left) * 4;
    out.set(image.data.subarray(start, start + rect.width * 4), y * rect.width * 4);
  }
  return { data: out, width: rect.width, height: rect.height };
}

export async function toWebp(image: Rgba, quality = 80): Promise<Uint8Array> {
  webpReady ??= initWebp(webpWasm);
  await webpReady;
  const imageData = {
    data: new Uint8ClampedArray(image.data.buffer, image.data.byteOffset, image.data.byteLength),
    width: image.width,
    height: image.height,
    colorSpace: "srgb",
  };
  // Workersには ImageData がないので、同じ形のオブジェクトを渡す
  return new Uint8Array(await encodeWebp(imageData as never, { quality }));
}

/** 図版のあるページを描画し、ページ全体の画像と、切り抜いた図版をWebPで返す。 */
export async function extractFigures(doc: PDFDocument, pageIndex: number, figures: FigureSpec[]) {
  const page = await renderPage(doc, pageIndex);
  const out = [];
  for (const f of figures) {
    const c = crop(page, boxToPixels(f.box, page.width, page.height));
    out.push({ ...f, webp: await toWebp(c), width: c.width, height: c.height });
  }
  return { pageWebp: await toWebp(page, 70), figures: out };
}
