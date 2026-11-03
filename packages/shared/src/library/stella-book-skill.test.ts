/**
 * スキル `.claude/skills/stella-book` の梱包スクリプト (pack_book.py) が、取り込みの規則の正本
 * (parseBookManifest・planPackageFiles) と同じ判定をすることを確かめる。規則を変えたのにスキルを
 * 直し忘れると、スキルが作った zip が本棚の取り込みで止まるため。
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { parseBookManifest, planPackageFiles } from "./book-package";

const PACK_BOOK = fileURLToPath(
  new URL("../../../../.claude/skills/stella-book/scripts/pack_book.py", import.meta.url),
);
const root = mkdtempSync(join(tmpdir(), "stella-book-skill-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

type Manifest = Record<string, unknown> & { chapters: Record<string, unknown>[] };

function baseManifest(): Manifest {
  return {
    format: "stella-book",
    version: 1,
    id: "6f1c2a8e-1b2c-4d3e-8f90-123456789abc",
    title: "試験の本",
    authors: ["見本 太郎"],
    language: "ja",
    cover: "cover.jpg",
    chapters: [{ id: "ch01", title: "1章 はじめに", text: "chapters/01.md" }],
  };
}

const baseFiles = (): Record<string, string> => ({
  "cover.jpg": "jpeg-bytes",
  "chapters/01.md": "# 1章 はじめに\n\n<!-- p.1 -->\n\n本文です。\n",
});

let count = 0;
function makeBook(manifest: Manifest, files: Record<string, string>): string {
  const dir = join(root, `book-${++count}`);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  writeFileSync(join(dir, "book.json"), JSON.stringify(manifest));
  return dir;
}

function listFiles(dir: string): { path: string; size: number; crc32: number }[] {
  const out: { path: string; size: number; crc32: number }[] = [];
  const walk = (current: string) => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else
        out.push({
          path: relative(dir, full).split("\\").join("/"),
          size: statSync(full).size,
          crc32: 0,
        });
    }
  };
  walk(dir);
  return out;
}

function packer(
  dir: string,
  ...args: string[]
): { ok: boolean; errors: string[] } & Record<string, unknown> {
  const run = (): string => {
    try {
      return execFileSync("python3", ["-I", PACK_BOOK, dir, ...args], { encoding: "utf8" });
    } catch (error) {
      // 検査で落ちたときは終了コード 1 で、結果の JSON は標準出力にある。
      return (error as { stdout: string }).stdout;
    }
  };
  return JSON.parse(run());
}

function shared(manifest: Manifest, dir: string): boolean {
  const parsed = parseBookManifest(manifest);
  return parsed.ok && planPackageFiles(parsed.value, listFiles(dir)).ok;
}

const cases: [string, (m: Manifest, f: Record<string, string>) => void][] = [
  [
    "そのままの本",
    () => {
      // 変えない (正しい本は両方が通す)
    },
  ],
  ["知らない項目", (m) => Object.assign(m, { subtitle: "x" })],
  [
    "表紙が SVG",
    (m, f) => {
      m.cover = "cover.svg";
      f["cover.svg"] = "<svg/>";
    },
  ],
  ["音声のファイルが無い", (m) => Object.assign(m.chapters[0] ?? {}, { audio: "audio/01.m4a" })],
  [
    "音声が WAV",
    (m, f) => {
      Object.assign(m.chapters[0] ?? {}, { audio: "audio/01.wav" });
      f["audio/01.wav"] = "wav";
    },
  ],
  [
    "音声と動画がある",
    (m, f) => {
      Object.assign(m.chapters[0] ?? {}, { audio: "audio/01.m4a", video: "video/01.mp4" });
      f["audio/01.m4a"] = "m4a";
      f["video/01.mp4"] = "mp4";
    },
  ],
  ["本の外を指すパス", (m) => Object.assign(m.chapters[0] ?? {}, { text: "../01.md" })],
  ["章の id の重複", (m) => m.chapters.push({ ...m.chapters[0] })],
  ["章の id が大文字", (m) => Object.assign(m.chapters[0] ?? {}, { id: "Ch01" })],
  ["本の id が UUID でない", (m) => Object.assign(m, { id: "not-a-uuid" })],
  ["言語の形が違う", (m) => Object.assign(m, { language: "日本語" })],
  [
    "著者が 11 人",
    (m) => Object.assign(m, { authors: Array.from({ length: 11 }, (_, i) => `著者${i}`) }),
  ],
  ["説明が 2001 文字", (m) => Object.assign(m, { description: "あ".repeat(2001) })],
  ["本文が空", (_, f) => Object.assign(f, { "chapters/01.md": "" })],
  ["images の図 (取り込む)", (_, f) => Object.assign(f, { "images/fig.png": "png" })],
  [
    "images の外の図 (無視する)",
    (_, f) => Object.assign(f, { "fig.png": "png", ".DS_Store": "x" }),
  ],
  ["章が無い", (m) => Object.assign(m, { chapters: [] })],
];

describe("stella-book スキルの梱包スクリプト", () => {
  it.each(cases)("%s で取り込みの規則と同じ判定をする", (_name, change) => {
    const manifest = baseManifest();
    const files = baseFiles();
    change(manifest, files);
    const dir = makeBook(manifest, files);
    expect(packer(dir, "--check").ok).toBe(shared(manifest, dir));
  });

  it("zip には取り込むファイルだけを入れ、文字は圧縮し、HTML コメントと重なる見出しを外す", () => {
    const manifest = baseManifest();
    Object.assign(manifest.chapters[0] ?? {}, { video: "video/01.mp4" });
    const dir = makeBook(manifest, {
      ...baseFiles(),
      "video/01.mp4": "mp4-bytes",
      "images/fig.png": "png",
      "notes.txt": "作業メモ",
    });
    const zip = join(root, "book.zip");
    const report = packer(dir, "-o", zip);
    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual([
      "chapters/01.md: 章の題名と同じ先頭の見出しを外しました",
      "chapters/01.md: HTML コメント 1 個を外しました",
    ]);
    const listing = JSON.parse(
      execFileSync(
        "python3",
        [
          "-I",
          "-c",
          "import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({i.filename: [i.compress_type, z.read(i).decode('utf-8', 'replace')] for i in z.infolist()}))",
          zip,
        ],
        { encoding: "utf8" },
      ),
    ) as Record<string, [number, string]>;
    expect(Object.keys(listing).sort()).toEqual([
      "book.json",
      "chapters/01.md",
      "cover.jpg",
      "images/fig.png",
      "video/01.mp4",
    ]);
    const STORED = 0;
    const DEFLATED = 8;
    expect(listing["chapters/01.md"]).toEqual([DEFLATED, "本文です。\n"]);
    expect(listing["book.json"]?.[0]).toBe(DEFLATED);
    expect(listing["video/01.mp4"]?.[0]).toBe(STORED);
    expect(listing["cover.jpg"]?.[0]).toBe(STORED);
  });
});
