/** 本番に配備済みの教材へ、動画 manifest の内容を登録する。 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildContentManifest } from "@stella/content";
import {
  checkoutContentFingerprint,
  verifyRemoteContent,
} from "../../content/scripts/content-state.js";
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

const syncCommand =
  "bun run --filter=@stella/content video:sync <stage> --topics <ID,...> --remote --tts gemini --cached-only";

function verifyManifestSource(manifestFile: string): void {
  const file = `${manifestFile.replace(/\.json$/, "")}.source.json`;
  const retry = `このチェックアウトで ${syncCommand} から作り直してください。`;
  let source: ReturnType<typeof checkoutContentFingerprint>;
  try {
    source = JSON.parse(readFileSync(file, "utf8"));
    if (typeof source?.checkoutFingerprint !== "string" || typeof source.dirty !== "boolean") {
      throw new Error("教材指紋または未コミット変更の記録が無効です");
    }
  } catch (cause) {
    const reason =
      (cause as NodeJS.ErrnoException).code === "ENOENT" ? "がありません" : "を読み取れません";
    throw new Error(`動画 manifest の付帯ファイル${reason} (${file})。${retry}`, { cause });
  }
  if (source.dirty) throw new Error(`動画を上げたときの教材に未コミットの変更があります。${retry}`);
  const current = checkoutContentFingerprint();
  if (current.dirty)
    throw new Error(`今のチェックアウトの教材に未コミットの変更があります。${retry}`);
  if (source.checkoutFingerprint !== current.checkoutFingerprint) {
    throw new Error(`動画を上げたときの教材指紋が今のチェックアウトと一致しません。${retry}`);
  }
}

export async function registerLessonVideos(): Promise<void> {
  const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID } = process.env;
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    const missing = Object.entries({ CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID })
      .filter(([, value]) => !value)
      .map(([name]) => name);
    throw new Error(
      `環境変数 ${missing.join(", ")} を設定してください。deploy で PDF_KEY_SALT を設定している場合は同じ値を設定してください。値が違うと指紋が合わず登録できません。`,
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
    throw new Error(`動画 manifest がありません (${file})。${syncCommand} で作成してください。`);
  }
  verifyManifestSource(file);
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
