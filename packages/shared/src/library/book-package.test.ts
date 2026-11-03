import { describe, expect, it } from "vitest";
import {
  BOOK_PACKAGE_LIMITS,
  contentKeyOf,
  isSafePackagePath,
  parseBookManifest,
  planPackageFiles,
  resolveMarkdownImage,
  type BookManifest,
  type PackageEntry,
} from "./book-package";
import {
  LibraryInputError,
  parseChapterState,
  parseCreateImport,
  parseShelfUpdate,
} from "./schemas";

const ID = "6F1C2A8E-1B2C-4D3E-8F90-123456789ABC";

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    format: "stella-book",
    version: 1,
    id: ID,
    title: "  ソフトウェアエンジニアリングの基礎 ",
    authors: ["著者 A"],
    cover: "cover.webp",
    chapters: [
      {
        id: "ch01",
        title: "第1章",
        text: "chapters/01.md",
        audio: "audio/01.m4a",
        video: "video/01.mp4",
      },
      { id: "ch02", title: "第2章", text: "chapters/02.md" },
    ],
    ...overrides,
  };
}

function parsed(overrides: Record<string, unknown> = {}): BookManifest {
  const result = parseBookManifest(manifest(overrides));
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.value;
}

function errorsOf(input: unknown): string[] {
  const result = parseBookManifest(input);
  return result.ok ? [] : result.errors;
}

const entry = (path: string, size = 10, crc32 = 1): PackageEntry => ({ path, size, crc32 });
const fullZip = [
  entry("book.json"),
  entry("cover.webp"),
  entry("chapters/01.md"),
  entry("chapters/02.md"),
  entry("audio/01.m4a", 1000),
  entry("video/01.mp4", 2000),
];

describe("parseBookManifest", () => {
  it("accepts a valid book and normalizes the id, title and defaults", () => {
    const book = parsed();
    expect(book.id).toBe(ID.toLowerCase());
    expect(book.title).toBe("ソフトウェアエンジニアリングの基礎");
    expect(book.language).toBe("ja");
    expect(book.description).toBeNull();
    expect(book.chapters[1]).toEqual({
      id: "ch02",
      title: "第2章",
      text: "chapters/02.md",
      audio: null,
      video: null,
    });
  });

  it("reports every problem it finds in Japanese", () => {
    const errors = errorsOf(
      manifest({ format: "pdf", version: 2, id: "x", title: "", extra: 1, chapters: [] }),
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        "extra: 知らない項目です",
        'format: "stella-book" を指定してください',
        "version: この画面が読めるのは 1 だけです",
        "id: UUID を指定してください",
        "title: 1〜200 文字で指定してください",
        "chapters: 章を 1 つ以上並べてください",
      ]),
    );
  });

  it("rejects bad chapter ids, duplicates, unknown keys and wrong formats", () => {
    const errors = errorsOf(
      manifest({
        chapters: [
          { id: "Ch 1", title: "a", text: "chapters/01.md" },
          { id: "ch02", title: "b", text: "chapters/02.txt", audo: "x" },
          { id: "ch02", title: "c", text: "chapters/03.md", audio: "audio/03.wav", video: "v.mov" },
        ],
      }),
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("chapters[0].id"),
        "chapters[1].audo: 知らない項目です",
        "chapters[1].text: 本文に使えない形式です (.md)",
        'chapters[2].id: "ch02" が重複しています',
        "chapters[2].audio: 音声に使えない形式です (.m4a / .mp3)",
        "chapters[2].video: 動画に使えない形式です (.mp4)",
      ]),
    );
  });

  it("refuses formats that could run in the page (HTML, SVG) and the manifest itself", () => {
    expect(errorsOf(manifest({ cover: "cover.svg" }))).toEqual([
      "cover: 表紙に使えない形式です (.webp / .jpg / .jpeg / .png)",
    ]);
    expect(errorsOf(manifest({ chapters: [{ id: "a", title: "a", text: "book.json" }] }))).toEqual([
      "chapters[0].text: book.json は指定できません",
    ]);
    expect(
      errorsOf(manifest({ chapters: [{ id: "a", title: "a", text: "chapters/a.html" }] })),
    ).toHaveLength(1);
  });

  it.each(["../x.md", "/abs.md", "a\\b.md", "chapters/../../x.md", "chapters//x.md", "./x.md"])(
    "rejects the unsafe path %s",
    (path) => {
      expect(errorsOf(manifest({ chapters: [{ id: "a", title: "a", text: path }] }))).toEqual([
        "chapters[0].text: zip の中の相対パス (例 chapters/01.md) を指定してください",
      ]);
    },
  );

  it("checks optional fields and the chapter limit", () => {
    expect(errorsOf(manifest({ language: "日本語" }))).toHaveLength(1);
    expect(errorsOf(manifest({ authors: "A" }))).toHaveLength(1);
    expect(errorsOf(manifest({ description: "x".repeat(2001) }))).toHaveLength(1);
    expect(parsed({ language: "en-US", description: " 紹介 " })).toMatchObject({
      language: "en-US",
      description: "紹介",
    });
    const many = Array.from({ length: BOOK_PACKAGE_LIMITS.maxChapters + 1 }, (_, i) => ({
      id: `c${i}`,
      title: "t",
      text: `chapters/${i}.md`,
    }));
    expect(errorsOf(manifest({ chapters: many }))).toEqual(["chapters: 章は 300 個までです"]);
    expect(errorsOf([])).toEqual(["book.json は JSON のオブジェクトにしてください"]);
  });
});

describe("planPackageFiles", () => {
  it("picks the referenced files and the images, ignoring noise", () => {
    const result = planPackageFiles(parsed(), [
      ...fullZip,
      entry("images/fig1.png"),
      entry("images/"),
      entry("__MACOSX/._cover.webp"),
      entry(".DS_Store"),
      entry("notes.txt"),
      entry("images/diagram.svg"),
    ]);
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.value.files.map((file) => [file.path, file.kind])).toEqual([
      ["cover.webp", "cover"],
      ["chapters/01.md", "text"],
      ["audio/01.m4a", "audio"],
      ["video/01.mp4", "video"],
      ["chapters/02.md", "text"],
      ["images/fig1.png", "image"],
    ]);
    expect(result.value.ignored).toEqual([
      "__MACOSX/._cover.webp",
      ".DS_Store",
      "notes.txt",
      "images/diagram.svg",
    ]);
    expect(result.value.totalBytes).toBe(10 * 4 + 1000 + 2000);
    expect(result.value.files[0]?.contentType).toBe("image/webp");
  });

  it("reports missing, empty, duplicated and oversized files", () => {
    const result = planPackageFiles(parsed(), [
      entry("cover.webp", 0),
      entry("chapters/01.md"),
      entry("chapters/01.md"),
      entry("audio/01.m4a", BOOK_PACKAGE_LIMITS.maxAudioBytes + 1),
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "chapters/01.md: zip の中に同じパスが 2 つあります",
        "cover: cover.webp が空です",
        "chapters[0].audio: audio/01.m4a が大きすぎます (音声は 1GB まで)",
        "chapters[0].video: zip に video/01.mp4 がありません",
        "chapters[1].text: zip に chapters/02.md がありません",
      ]),
    );
  });

  it("allows two chapters to share one file of the same kind only", () => {
    const shared = parsed({
      chapters: [
        { id: "a", title: "a", text: "chapters/01.md", audio: "audio/all.mp3" },
        { id: "b", title: "b", text: "chapters/02.md", audio: "audio/all.mp3" },
      ],
    });
    const ok = planPackageFiles(shared, [
      entry("cover.webp"),
      entry("chapters/01.md"),
      entry("chapters/02.md"),
      entry("audio/all.mp3"),
    ]);
    expect(ok.ok && ok.value.files.length).toBe(4);
    const clash = parsed({ cover: "images/a.png" });
    const result = planPackageFiles(
      {
        ...clash,
        chapters: [{ id: "a", title: "a", text: "chapters/01.md", audio: null, video: null }],
      },
      [entry("images/a.png"), entry("chapters/01.md")],
    );
    expect(result.ok && result.value.files.map((f) => f.kind)).toEqual(["cover", "text"]);
  });

  it("enforces the per-book total", () => {
    const big = parsed({
      chapters: [1, 2].map((n) => ({
        id: `ch${n}`,
        title: `${n}`,
        text: `chapters/${n}.md`,
        audio: `audio/${n}.m4a`,
        video: `video/${n}.mp4`,
      })),
    });
    const result = planPackageFiles(big, [
      entry("cover.webp"),
      ...[1, 2].flatMap((n) => [
        entry(`chapters/${n}.md`),
        entry(`audio/${n}.m4a`, BOOK_PACKAGE_LIMITS.maxAudioBytes),
        entry(`video/${n}.mp4`, BOOK_PACKAGE_LIMITS.maxVideoBytes),
      ]),
    ]);
    expect(result.ok ? [] : result.errors).toEqual(["1 冊の合計は 4GB までです"]);
  });
});

describe("resolveMarkdownImage", () => {
  it("resolves paths relative to the chapter", () => {
    expect(resolveMarkdownImage("chapters/01.md", "../images/fig%201.png")).toBe(
      "images/fig 1.png",
    );
    expect(resolveMarkdownImage("chapters/01.md", "./../images/a.webp?x=1#y")).toBe(
      "images/a.webp",
    );
    expect(resolveMarkdownImage("index.md", "images/a.gif")).toBe("images/a.gif");
  });

  it.each([
    ["chapters/01.md", "https://example.com/a.png"],
    ["chapters/01.md", "//example.com/a.png"],
    ["chapters/01.md", "/images/a.png"],
    ["chapters/01.md", "data:image/png;base64,AAAA"],
    ["chapters/01.md", "../../images/a.png"],
    ["chapters/01.md", "../audio/01.mp3"],
    ["chapters/01.md", "../images/a.svg"],
    ["chapters/01.md", "../images/%E0%A4%A.png"],
  ])("refuses %s → %s", (md, src) => {
    expect(resolveMarkdownImage(md, src)).toBeNull();
  });
});

describe("small helpers", () => {
  it("builds content keys and checks paths", () => {
    expect(contentKeyOf(0xdeadbeef, 12)).toBe("deadbeef-12");
    expect(contentKeyOf(-1, 1)).toBe("ffffffff-1");
    expect(isSafePackagePath("a/b.md")).toBe(true);
    expect(isSafePackagePath("a/\u0000.md")).toBe(false);
    expect(isSafePackagePath("x".repeat(201))).toBe(false);
  });
});

describe("request schemas", () => {
  it("parses shelf updates including the last chapter", () => {
    expect(parseShelfUpdate({ lastChapterId: "ch01", tags: [" a ", "a"] })).toEqual({
      lastChapterId: "ch01",
      tags: ["a"],
    });
    expect(() => parseShelfUpdate({ lastChapterId: "../x" })).toThrow(LibraryInputError);
    expect(() => parseShelfUpdate({})).toThrow(/変更する項目/);
  });

  it("parses chapter positions", () => {
    expect(parseChapterState({ audioSec: 12.345, clientUpdatedAt: 5 })).toEqual({
      audioSec: 12.3,
      clientUpdatedAt: 5,
    });
    expect(() => parseChapterState({ clientUpdatedAt: 5 })).toThrow(/変更する項目/);
    expect(() => parseChapterState({ audioSec: -1, clientUpdatedAt: 5 })).toThrow(/音声の位置/);
    expect(() => parseChapterState({ completed: true })).toThrow(/端末の時刻/);
  });

  it("parses the import request shape", () => {
    const sha = "a".repeat(64);
    expect(
      parseCreateImport({
        manifest: {},
        files: [{ path: "cover.webp", size: 1, crc32: 4294967295 }],
        thumbnail: { size: 10, sha256: sha.toUpperCase() },
      }).thumbnail.sha256,
    ).toBe(sha);
    expect(() =>
      parseCreateImport({
        manifest: {},
        files: [{ path: "a", size: 1, crc32: -1 }],
        thumbnail: { size: 1, sha256: sha },
      }),
    ).toThrow(/CRC-32/);
    expect(() =>
      parseCreateImport({
        manifest: {},
        files: [],
        thumbnail: { size: 2 * 1024 * 1024, sha256: sha },
      }),
    ).toThrow(/サムネイル/);
  });
});
