/** 本番に配備済みの教材へ、動画 manifest の内容を登録する。 */
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
import { resolveDeployDatabase } from "../../../apps/api/scripts/lib/deploy-target.js";

export async function registerLessonVideos(): Promise<void> {
  const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, PDF_KEY_SALT } = process.env;
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !PDF_KEY_SALT) {
    const missing = Object.entries({ CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, PDF_KEY_SALT })
      .filter(([, value]) => !value)
      .map(([name]) => name);
    throw new Error(
      `環境変数 ${missing.join(", ")} を設定してください。PDF_KEY_SALT は deploy の GitHub Secret と同じ値が必要です。`,
    );
  }

  const file =
    process.env.VIDEO_MANIFEST ??
    join(import.meta.dirname, "../../content/dist/video-manifest.json");
  let manifest: VideoManifest;
  try {
    manifest = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    throw new Error(
      `動画 manifest がありません (${file})。bun run --filter=@stella/content video:sync <stage> --topics <ID,...> --remote --tts gemini --cached-only で作成してください。`,
    );
  }
  const { stages } = buildContentManifest();
  const chunks = chunkStatements(lessonVideoStatements(stages, manifest), MAX_CHUNK_BYTES);
  const toml = readFileSync(join(import.meta.dirname, "../../../apps/api/wrangler.toml"), "utf8");
  const config = parseD1Config(toml, "stella-db");
  const databaseId = await resolveDeployDatabase(toml, CLOUDFLARE_API_TOKEN);
  await verifyRemoteContent({ databaseId });
  const written = await executeChunks(
    { ...config, databaseId, apiToken: CLOUDFLARE_API_TOKEN },
    chunks,
  );
  console.log(`✓ 教材動画の登録完了 (${describeRowsWritten(written)})`);
}

if (import.meta.main) await registerLessonVideos();
