/** 本番に配備済みの教材へ、VIDEO_MANIFEST の動画だけを登録する。 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildContentManifest } from "@stella/content";
import { verifyRemoteContent } from "../../content/scripts/content-state.js";
import type { VideoManifest } from "../../content/src/material-video.js";
import { lessonVideoStatements } from "./lesson-video-sql.js";
import {
  MAX_CHUNK_BYTES,
  chunkStatements,
  describeRowsWritten,
  executeChunks,
  parseD1Config,
} from "../../../apps/api/scripts/lib/d1-remote.js";

const file = process.env.VIDEO_MANIFEST;
if (!file) throw new Error("VIDEO_MANIFEST が未設定です");
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
if (!apiToken) throw new Error("CLOUDFLARE_API_TOKEN が未設定です (D1: Edit 権限が要る)");

const manifest: VideoManifest = JSON.parse(readFileSync(file, "utf8"));
const { stages } = buildContentManifest();
const chunks = chunkStatements(lessonVideoStatements(stages, manifest), MAX_CHUNK_BYTES);
const config = parseD1Config(
  readFileSync(join(import.meta.dirname, "../../../apps/api/wrangler.toml"), "utf8"),
  "stella-db",
);
await verifyRemoteContent();
const written = await executeChunks({ ...config, apiToken }, chunks);
console.log(`✓ 教材動画の登録完了 (${describeRowsWritten(written)})`);
