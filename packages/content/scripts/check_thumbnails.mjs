#!/usr/bin/env node
/**
 * 講座サムネイル (courses/<slug>/thumbnail.webp|png|jpg) の検査。
 *
 *   node scripts/check_thumbnails.mjs
 *
 * サムネイルは LMS の一覧カード (16:9) にそのまま出るため、規格外の画像が main に
 * 入ると R2 へ流れてから気づくことになる。ここで拡張子・寸法・ファイルサイズを見る。
 * 画像を置いていない講座は検査対象外（色のストライプ表示にフォールバックする）。
 *
 * 寸法はヘッダだけを読んで判定する（依存を増やさないため）。
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { COURSES_ROOT, CONTENT_ROOT, listCourseSlugs } from "./course-roots.mjs";

/**
 * course.json の thumbnail 省略時に探すファイル名。
 * src/manifest.ts の THUMBNAIL_CANDIDATES と同じ並びに保つこと（片方だけ知っている
 * 拡張子があると、検査は通るのに R2 にも D1 にも載らない画像ができる）。
 */
const CANDIDATES = ["thumbnail.webp", "thumbnail.png", "thumbnail.jpg", "thumbnail.jpeg"];

/** 一覧カードは 16:9。 ±2% までのずれは切り抜きで吸収できる範囲として許す。 */
const TARGET_RATIO = 16 / 9;
const RATIO_TOLERANCE = 0.02;
/** カードの実表示幅は 400px 前後。 Retina を考えて最低 800px。 */
const MIN_WIDTH = 800;
/** 一覧は複数枚を同時に読むので 1 枚あたりの上限を決めておく。 */
const MAX_BYTES = 400 * 1024;

/** PNG / JPEG / WebP のヘッダから寸法を読む。読めなければ null。 */
function imageSize(buf) {
  // PNG: 8 byte signature + IHDR(length 4 + type 4 + width 4 + height 4)
  if (buf.length >= 24 && buf.toString("ascii", 1, 4) === "PNG") {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // WebP: RIFF....WEBP + チャンク種別ごとに位置が違う
  if (
    buf.length >= 30 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    const kind = buf.toString("ascii", 12, 16);
    if (kind === "VP8X") {
      return {
        width: 1 + buf.readUIntLE(24, 3),
        height: 1 + buf.readUIntLE(27, 3),
      };
    }
    if (kind === "VP8 ") {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (kind === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    return null;
  }
  // JPEG: SOFn マーカー (0xC0..0xCF、0xC4/0xC8/0xCC を除く) に寸法が入る
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1];
      const length = buf.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

/** course.json の thumbnail 指定があればそれを、無ければ規約のファイル名を探す。 */
function findThumbnail(courseDir) {
  const configFile = join(courseDir, "course.json");
  let explicit;
  if (existsSync(configFile)) {
    explicit = JSON.parse(readFileSync(configFile, "utf8")).thumbnail?.trim();
  }
  if (explicit) {
    const file = join(courseDir, explicit);
    return { file, explicit };
  }
  for (const name of CANDIDATES) {
    const file = join(courseDir, name);
    if (existsSync(file)) return { file, explicit: undefined };
  }
  return null;
}

const problems = [];

for (const slug of listCourseSlugs()) {
  const courseDir = join(COURSES_ROOT, slug);
  const found = findThumbnail(courseDir);
  if (!found) continue;
  const rel = relative(CONTENT_ROOT, found.file);

  if (!existsSync(found.file)) {
    problems.push(`${slug}: course.json の thumbnail が指すファイルがありません — ${rel}`);
    continue;
  }
  if (!CANDIDATES.some((c) => found.file.toLowerCase().endsWith(c.slice("thumbnail".length)))) {
    problems.push(`${rel}: 対応形式は .webp / .png / .jpg です`);
    continue;
  }

  const bytes = statSync(found.file).size;
  if (bytes > MAX_BYTES) {
    problems.push(
      `${rel}: ${Math.round(bytes / 1024)}KB — 上限 ${MAX_BYTES / 1024}KB を超えています (WebP へ変換 / 圧縮してください)`,
    );
  }

  const size = imageSize(readFileSync(found.file));
  if (!size) {
    problems.push(`${rel}: 画像の寸法を読めませんでした (破損しているか未対応の形式です)`);
    continue;
  }
  if (size.width < MIN_WIDTH) {
    problems.push(`${rel}: 幅 ${size.width}px — 最低 ${MIN_WIDTH}px 必要です`);
  }
  const ratio = size.width / size.height;
  if (Math.abs(ratio - TARGET_RATIO) / TARGET_RATIO > RATIO_TOLERANCE) {
    problems.push(`${rel}: ${size.width}×${size.height} は 16:9 から外れています (推奨 1600×900)`);
  }
}

if (problems.length > 0) {
  console.error(`\n講座サムネイルに ${problems.length} 件の問題があります:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error("");
  process.exit(1);
}
