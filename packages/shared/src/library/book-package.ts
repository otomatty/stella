/**
 * 本棚の本の形式 `stella-book` (zip)。Web (取り込み前の確認) と API (受け取り) が同じ規則を使う。
 *
 * ```text
 * <任意の名前>.zip
 * ├── book.json                     必須
 * ├── cover.(webp|jpg|jpeg|png)     必須 (book.json の cover が指す)
 * ├── chapters/*.md                 必須 (章ごと 1 ファイル)
 * ├── audio/*.(m4a|mp3)             任意 (章の朗読)
 * ├── video/*.mp4                   任意 (章の対話解説)
 * └── images/*.(png|jpg|jpeg|webp|gif)  任意 (本文から相対パスで参照する図)
 * ```
 *
 * zip の中のパスは R2 のキーにしない (サーバーが別の ID を振る)。ここでの検査は、本の中で
 * 参照を解決するためと、HTML・SVG のように同じオリジンで実行されうる形式を入れないため。
 */

export const BOOK_PACKAGE_FORMAT = "stella-book";
export const BOOK_PACKAGE_VERSION = 1;
export const BOOK_MANIFEST_PATH = "book.json";

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;

export const BOOK_PACKAGE_LIMITS = {
  /** book.json の大きさ。 */
  maxManifestBytes: 1 * MiB,
  maxTextBytes: 2 * MiB,
  maxImageBytes: 10 * MiB,
  maxCoverBytes: 10 * MiB,
  maxAudioBytes: 1 * GiB,
  maxVideoBytes: 2 * GiB,
  /** 1 冊のファイルの合計 (サムネイルを除く)。 */
  maxBookBytes: 4 * GiB,
  maxBookFiles: 1000,
  maxChapters: 300,
  /** 1 人の本の合計。 */
  maxOwnerBytes: 20 * GiB,
  /** ブラウザが作る表紙のサムネイル (JPEG)。 */
  maxThumbnailBytes: 1 * MiB,
  /** これ以下は 1 回の PUT で送る。Workers の要求本文 100MB に余裕を持たせる。 */
  singleUploadMaxBytes: 90 * MiB,
  /** multipart の 1 部分 (最後の部分以外は同じ大きさ。R2 は 5MiB 以上を求める)。 */
  multipartPartBytes: 64 * MiB,
} as const;

export type BookPackageLimits = typeof BOOK_PACKAGE_LIMITS;

/** 本のファイルの種類。thumbnail は zip には無く、ブラウザが表紙から作る。 */
export type BookFileKind = "cover" | "text" | "audio" | "video" | "image" | "thumbnail";

interface ExtensionInfo {
  contentType: string;
  kinds: readonly BookFileKind[];
}

const EXTENSIONS: Record<string, ExtensionInfo> = {
  md: { contentType: "text/markdown; charset=utf-8", kinds: ["text"] },
  m4a: { contentType: "audio/mp4", kinds: ["audio"] },
  mp3: { contentType: "audio/mpeg", kinds: ["audio"] },
  mp4: { contentType: "video/mp4", kinds: ["video"] },
  png: { contentType: "image/png", kinds: ["cover", "image"] },
  jpg: { contentType: "image/jpeg", kinds: ["cover", "image"] },
  jpeg: { contentType: "image/jpeg", kinds: ["cover", "image"] },
  webp: { contentType: "image/webp", kinds: ["cover", "image"] },
  gif: { contentType: "image/gif", kinds: ["image"] },
};

const KIND_LABEL: Record<BookFileKind, string> = {
  cover: "表紙",
  text: "本文",
  audio: "音声",
  video: "動画",
  image: "画像",
  thumbnail: "サムネイル",
};

const EXPECTED_EXTENSIONS: Record<Exclude<BookFileKind, "thumbnail">, string> = {
  cover: ".webp / .jpg / .jpeg / .png",
  text: ".md",
  audio: ".m4a / .mp3",
  video: ".mp4",
  image: ".png / .jpg / .jpeg / .webp / .gif",
};

export function maxBytesOf(kind: BookFileKind): number {
  switch (kind) {
    case "cover":
      return BOOK_PACKAGE_LIMITS.maxCoverBytes;
    case "text":
      return BOOK_PACKAGE_LIMITS.maxTextBytes;
    case "audio":
      return BOOK_PACKAGE_LIMITS.maxAudioBytes;
    case "video":
      return BOOK_PACKAGE_LIMITS.maxVideoBytes;
    case "image":
      return BOOK_PACKAGE_LIMITS.maxImageBytes;
    case "thumbnail":
      return BOOK_PACKAGE_LIMITS.maxThumbnailBytes;
  }
}

export function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/** 種類として受け付ける拡張子なら Content-Type を返す。 */
export function contentTypeFor(path: string, kind: BookFileKind): string | null {
  if (kind === "thumbnail") return "image/jpeg";
  const extension = extensionOf(path);
  // 表に無い拡張子 (constructor・__proto__ など継承したキーを含む) は受け付けない。
  const info = Object.hasOwn(EXTENSIONS, extension) ? EXTENSIONS[extension] : undefined;
  return info?.kinds.includes(kind) ? info.contentType : null;
}

/**
 * zip の中の相対パスとして安全か。`/` 区切り・先頭の `/` なし・`\` なし・空や `.`・`..` の
 * セグメントなし・制御文字なし・200 文字以内。
 */
export function isSafePackagePath(path: unknown): path is string {
  if (typeof path !== "string" || path.length === 0 || path.length > 200) return false;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: 制御文字を拒むための検査
  if (/[\u0000-\u001f\u007f\\]/.test(path)) return false;
  if (path.startsWith("/") || path.endsWith("/")) return false;
  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

export interface BookManifestChapter {
  id: string;
  title: string;
  text: string;
  audio: string | null;
  video: string | null;
}

export interface BookManifest {
  format: typeof BOOK_PACKAGE_FORMAT;
  version: typeof BOOK_PACKAGE_VERSION;
  /** 本の ID (UUID、小文字)。同じ利用者が同じ ID を開き直すと、その本の新しい版になる。 */
  id: string;
  title: string;
  authors: string[];
  language: string;
  description: string | null;
  cover: string;
  chapters: BookManifestChapter[];
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHAPTER_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const LANGUAGE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;
const TOP_KEYS = new Set([
  "format",
  "version",
  "id",
  "title",
  "authors",
  "language",
  "description",
  "cover",
  "chapters",
]);
const CHAPTER_KEYS = new Set(["id", "title", "text", "audio", "video"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function trimmed(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : null;
}

/**
 * book.json を検査する。利用者にそのまま見せる日本語のエラーを、見つかった順にすべて返す。
 */
export function parseBookManifest(input: unknown): ParseResult<BookManifest> {
  const errors: string[] = [];
  if (!isRecord(input))
    return { ok: false, errors: ["book.json は JSON のオブジェクトにしてください"] };
  for (const key of Object.keys(input))
    if (!TOP_KEYS.has(key)) errors.push(`${key}: 知らない項目です`);
  if (input.format !== BOOK_PACKAGE_FORMAT)
    errors.push(`format: "${BOOK_PACKAGE_FORMAT}" を指定してください`);
  if (input.version !== BOOK_PACKAGE_VERSION)
    errors.push(`version: この画面が読めるのは ${BOOK_PACKAGE_VERSION} だけです`);
  const id = typeof input.id === "string" && UUID.test(input.id) ? input.id.toLowerCase() : null;
  if (!id) errors.push("id: UUID を指定してください");
  const title = trimmed(input.title, 1, 200);
  if (!title) errors.push("title: 1〜200 文字で指定してください");

  let authors: string[] = [];
  if (input.authors !== undefined) {
    if (!Array.isArray(input.authors) || input.authors.length > 10)
      errors.push("authors: 10 人までの文字列の配列にしてください");
    else {
      authors = input.authors.flatMap((author, index) => {
        const name = trimmed(author, 1, 100);
        if (!name) errors.push(`authors[${index}]: 1〜100 文字で指定してください`);
        return name ? [name] : [];
      });
    }
  }

  let language = "ja";
  if (input.language !== undefined) {
    if (
      typeof input.language !== "string" ||
      input.language.length > 35 ||
      !LANGUAGE.test(input.language)
    )
      errors.push('language: "ja" や "en-US" の形で指定してください');
    else language = input.language;
  }

  let description: string | null = null;
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string" || input.description.trim().length > 2000)
      errors.push("description: 2000 文字以内の文字列にしてください");
    else description = input.description.trim() || null;
  }

  const filePath = (value: unknown, field: string, kind: BookFileKind): string | null => {
    if (!isSafePackagePath(value)) {
      errors.push(`${field}: zip の中の相対パス (例 chapters/01.md) を指定してください`);
      return null;
    }
    if (value === BOOK_MANIFEST_PATH) {
      errors.push(`${field}: book.json は指定できません`);
      return null;
    }
    if (kind !== "thumbnail" && !contentTypeFor(value, kind)) {
      errors.push(`${field}: ${KIND_LABEL[kind]}に使えない形式です (${EXPECTED_EXTENSIONS[kind]})`);
      return null;
    }
    return value;
  };

  const cover = filePath(input.cover, "cover", "cover");

  const chapters: BookManifestChapter[] = [];
  if (!Array.isArray(input.chapters) || input.chapters.length === 0)
    errors.push("chapters: 章を 1 つ以上並べてください");
  else if (input.chapters.length > BOOK_PACKAGE_LIMITS.maxChapters)
    errors.push(`chapters: 章は ${BOOK_PACKAGE_LIMITS.maxChapters} 個までです`);
  else {
    const seen = new Set<string>();
    input.chapters.forEach((chapter: unknown, index: number) => {
      const at = `chapters[${index}]`;
      if (!isRecord(chapter)) {
        errors.push(`${at}: オブジェクトにしてください`);
        return;
      }
      for (const key of Object.keys(chapter))
        if (!CHAPTER_KEYS.has(key)) errors.push(`${at}.${key}: 知らない項目です`);
      const chapterId =
        typeof chapter.id === "string" && CHAPTER_ID.test(chapter.id) ? chapter.id : null;
      if (!chapterId)
        errors.push(`${at}.id: 英小文字・数字・-・_ の 64 文字以内で指定してください (例 ch01)`);
      else if (seen.has(chapterId)) errors.push(`${at}.id: "${chapterId}" が重複しています`);
      else seen.add(chapterId);
      const chapterTitle = trimmed(chapter.title, 1, 200);
      if (!chapterTitle) errors.push(`${at}.title: 1〜200 文字で指定してください`);
      const text = filePath(chapter.text, `${at}.text`, "text");
      const audio =
        chapter.audio === undefined || chapter.audio === null
          ? null
          : filePath(chapter.audio, `${at}.audio`, "audio");
      const video =
        chapter.video === undefined || chapter.video === null
          ? null
          : filePath(chapter.video, `${at}.video`, "video");
      if (chapterId && chapterTitle && text)
        chapters.push({ id: chapterId, title: chapterTitle, text, audio, video });
    });
  }

  if (errors.length || !id || !title || !cover) return { ok: false, errors };
  return {
    ok: true,
    value: {
      format: BOOK_PACKAGE_FORMAT,
      version: BOOK_PACKAGE_VERSION,
      id,
      title,
      authors,
      language,
      description,
      cover,
      chapters,
    },
  };
}

/** zip の中央ディレクトリから読んだ 1 ファイル。 */
export interface PackageEntry {
  path: string;
  size: number;
  /** CRC-32 (符号なし 32 ビット)。 */
  crc32: number;
}

export interface PlannedFile {
  path: string;
  kind: Exclude<BookFileKind, "thumbnail">;
  size: number;
  crc32: number;
  contentType: string;
}

export interface PackagePlan {
  files: PlannedFile[];
  /** 取り込まずに無視したパス (`__MACOSX/`・隠しファイル・参照されない画像以外など)。 */
  ignored: string[];
  totalBytes: number;
}

/** OS やアーカイバが勝手に足すファイル。黙って無視する。 */
function isNoise(path: string): boolean {
  return path.split("/").some((segment) => segment === "__MACOSX" || segment.startsWith("."));
}

/**
 * book.json が指すファイルと `images/` の画像を、zip の一覧から選ぶ。欠け・重複・上限超過は
 * エラー、それ以外の余計なファイルは無視する。
 */
export function planPackageFiles(
  manifest: BookManifest,
  entries: readonly PackageEntry[],
): ParseResult<PackagePlan> {
  const errors: string[] = [];
  const byPath = new Map<string, PackageEntry>();
  const ignored: string[] = [];
  for (const entry of entries) {
    if (entry.path.endsWith("/")) continue; // ディレクトリ
    if (byPath.has(entry.path)) {
      errors.push(`${entry.path}: zip の中に同じパスが 2 つあります`);
      continue;
    }
    byPath.set(entry.path, entry);
  }

  const files = new Map<string, PlannedFile>();
  const want = (path: string, kind: PlannedFile["kind"], field: string) => {
    const existing = files.get(path);
    if (existing) {
      // 同じファイルを 2 か所から指すのは、種類が同じときだけ許す (例: 2 章で同じ音声)。
      if (existing.kind !== kind) errors.push(`${field}: ${path} は別の種類として使われています`);
      return;
    }
    const entry = byPath.get(path);
    if (!entry) {
      errors.push(`${field}: zip に ${path} がありません`);
      return;
    }
    const contentType = contentTypeFor(path, kind);
    if (!contentType) {
      errors.push(`${field}: ${KIND_LABEL[kind]}に使えない形式です`);
      return;
    }
    if (!Number.isSafeInteger(entry.size) || entry.size < 0) {
      errors.push(`${field}: ${path} の大きさを読めません`);
      return;
    }
    if (entry.size === 0) {
      errors.push(`${field}: ${path} が空です`);
      return;
    }
    if (entry.size > maxBytesOf(kind)) {
      errors.push(
        `${field}: ${path} が大きすぎます (${KIND_LABEL[kind]}は ${formatBytes(maxBytesOf(kind))} まで)`,
      );
      return;
    }
    files.set(path, { path, kind, size: entry.size, crc32: entry.crc32 >>> 0, contentType });
  };

  want(manifest.cover, "cover", "cover");
  manifest.chapters.forEach((chapter, index) => {
    want(chapter.text, "text", `chapters[${index}].text`);
    if (chapter.audio) want(chapter.audio, "audio", `chapters[${index}].audio`);
    if (chapter.video) want(chapter.video, "video", `chapters[${index}].video`);
  });

  for (const [path, entry] of byPath) {
    if (path === BOOK_MANIFEST_PATH || files.has(path)) continue;
    if (
      !isNoise(path) &&
      isSafePackagePath(path) &&
      path.startsWith("images/") &&
      contentTypeFor(path, "image")
    ) {
      if (entry.size > 0 && entry.size <= BOOK_PACKAGE_LIMITS.maxImageBytes)
        files.set(path, {
          path,
          kind: "image",
          size: entry.size,
          crc32: entry.crc32 >>> 0,
          contentType: contentTypeFor(path, "image") ?? "",
        });
      else
        errors.push(`${path}: 画像は ${formatBytes(BOOK_PACKAGE_LIMITS.maxImageBytes)} までです`);
      continue;
    }
    ignored.push(path);
  }

  const list = [...files.values()];
  const totalBytes = list.reduce((sum, file) => sum + file.size, 0);
  if (list.length > BOOK_PACKAGE_LIMITS.maxBookFiles)
    errors.push(`ファイルは 1 冊 ${BOOK_PACKAGE_LIMITS.maxBookFiles} 個までです`);
  if (totalBytes > BOOK_PACKAGE_LIMITS.maxBookBytes)
    errors.push(`1 冊の合計は ${formatBytes(BOOK_PACKAGE_LIMITS.maxBookBytes)} までです`);
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { files: list, ignored, totalBytes } };
}

/**
 * 本文の Markdown が参照する画像を、zip の中のパスに解決する。`images/` の下の許可された
 * 画像だけを返し、外部 URL・本の外を指すパス・それ以外の形式は null。
 */
export function resolveMarkdownImage(markdownPath: string, src: string): string | null {
  if (!src || /^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith("//") || src.startsWith("/"))
    return null;
  const bare = src.split(/[?#]/)[0] ?? "";
  let decoded: string;
  try {
    decoded = decodeURIComponent(bare);
  } catch {
    return null;
  }
  const segments = markdownPath.split("/").slice(0, -1);
  for (const segment of decoded.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (!segments.length) return null;
      segments.pop();
    } else segments.push(segment);
  }
  const path = segments.join("/");
  if (!isSafePackagePath(path) || !path.startsWith("images/") || !contentTypeFor(path, "image"))
    return null;
  return path;
}

/** 版をまたいで同じ中身のファイルを見分ける鍵 (CRC-32 とサイズ)。 */
export function contentKeyOf(crc32: number, size: number): string {
  return `${(crc32 >>> 0).toString(16).padStart(8, "0")}-${size}`;
}

export function thumbnailContentKey(sha256: string): string {
  return `thumb-${sha256.toLowerCase()}`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= GiB) return `${Math.round((bytes / GiB) * 10) / 10}GB`;
  if (bytes >= MiB) return `${Math.round((bytes / MiB) * 10) / 10}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}
