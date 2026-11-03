/**
 * 本棚の zip (`stella-book` 形式) をブラウザで読む。zip 全体をメモリに載せず、zip.js が中央
 * ディレクトリだけを読んで一覧を作り、ファイルは送るときに 1 つずつ取り出す。
 *
 * 規則 (book.json の検査・取り込むファイルの選び方) は API と同じ `@stella/shared` を使う。
 */
import {
  BlobReader,
  BlobWriter,
  TextWriter,
  ZipReader,
  configure,
  type FileEntry,
} from "@zip.js/zip.js";
import {
  BOOK_MANIFEST_PATH,
  BOOK_PACKAGE_LIMITS,
  parseBookManifest,
  planPackageFiles,
  type BookManifest,
  type PackagePlan,
} from "@stella/shared/library/book-package";

// Web Worker を作らない (CSP の worker-src に頼らない)。展開はブラウザの DecompressionStream。
configure({ useWebWorkers: false });

export class BookPackageError extends Error {
  constructor(
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = "BookPackageError";
  }
}

export interface OpenedBookPackage {
  fileName: string;
  manifest: BookManifest;
  plan: PackagePlan;
  /** 取り込むファイル (zip の中のパス → zip.js のエントリ)。 */
  entries: Map<string, FileEntry>;
  /** API に送る一覧 (無視するファイルも含む。サーバーでも同じ規則で選び直す)。 */
  listing: { path: string; size: number; crc32: number }[];
  thumbnail: { blob: Blob; sha256: string; url: string };
  close(): Promise<void>;
}

/** 表紙のサムネイルの幅 (縦 2:3 の本を棚に並べる大きさの 2 倍程度)。 */
const THUMBNAIL_WIDTH = 360;

export async function sha256Hex(data: Blob | ArrayBuffer): Promise<string> {
  const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** 表紙を幅 360px の JPEG に縮める (OffscreenCanvas が無いブラウザは canvas 要素)。 */
async function makeThumbnail(cover: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(cover);
  } catch {
    throw new BookPackageError("表紙の画像を読めません。画像が壊れていないか確かめてください");
  }
  const scale = Math.min(1, THUMBNAIL_WIDTH / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  try {
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no 2d context");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      return await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))),
        "image/jpeg",
        0.85,
      ),
    );
  } finally {
    bitmap.close();
  }
}

export async function openBookPackage(file: File): Promise<OpenedBookPackage> {
  if (!/\.zip$/i.test(file.name) && file.type !== "application/zip")
    throw new BookPackageError("zip ファイルを選んでください");
  const reader = new ZipReader(new BlobReader(file));
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await reader.close();
  };
  try {
    let all: Awaited<ReturnType<typeof reader.getEntries>>;
    try {
      all = await reader.getEntries();
    } catch {
      throw new BookPackageError("zip ファイルとして読めません。壊れていないか確かめてください");
    }
    const files = all.filter((entry): entry is FileEntry => !entry.directory);
    if (files.some((entry) => entry.encrypted))
      throw new BookPackageError("パスワード付きの zip は読めません");
    const listing = files.map((entry) => ({
      path: entry.filename,
      size: entry.uncompressedSize,
      crc32: entry.crc32 ?? 0,
    }));
    const manifestEntry = files.find((entry) => entry.filename === BOOK_MANIFEST_PATH);
    if (!manifestEntry)
      throw new BookPackageError(
        "zip のいちばん上に book.json がありません。本棚の形式で作った zip か確かめてください",
      );
    if (manifestEntry.uncompressedSize > BOOK_PACKAGE_LIMITS.maxManifestBytes)
      throw new BookPackageError("book.json が大きすぎます");
    let json: unknown;
    try {
      json = JSON.parse(await manifestEntry.getData(new TextWriter("utf-8")));
    } catch {
      throw new BookPackageError("book.json を JSON として読めません");
    }
    const parsed = parseBookManifest(json);
    if (!parsed.ok) throw new BookPackageError("book.json に問題があります", parsed.errors);
    const plan = planPackageFiles(parsed.value, listing);
    if (!plan.ok) throw new BookPackageError("zip の中身に問題があります", plan.errors);
    const entries = new Map(
      files
        .filter((entry) => plan.value.files.some((planned) => planned.path === entry.filename))
        .map((entry) => [entry.filename, entry]),
    );
    const coverEntry = entries.get(parsed.value.cover);
    if (!coverEntry) throw new BookPackageError("表紙が見つかりません");
    const cover = await coverEntry.getData(new BlobWriter());
    const thumbnail = await makeThumbnail(cover);
    if (thumbnail.size > BOOK_PACKAGE_LIMITS.maxThumbnailBytes)
      throw new BookPackageError("表紙を縮められませんでした");
    return {
      fileName: file.name,
      manifest: parsed.value,
      plan: plan.value,
      entries,
      listing,
      thumbnail: {
        blob: thumbnail,
        sha256: await sha256Hex(thumbnail),
        url: URL.createObjectURL(thumbnail),
      },
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
