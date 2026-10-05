import { inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { submissionFiles } from "../db/schema.js";
import type { Env } from "../env.js";
import { chunk } from "./enrollment-bulk.js";
import { withResourceLock } from "./resource-lock.js";

const CURSOR_KEY = "maintenance/submission-orphans.json";
const GRACE_MS = 24 * 60 * 60 * 1000;
const OBJECT_KEY = /^submissions\/[^/]+\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/\d+$/;

/**
 * 削除された提出・テナントと保存失敗の残りを回収する。R2保存からD1確定までの
 * ファイルを消さないよう24時間待ち、削除直前にファイル索引を確認する。
 * 15分ごとの既存cronで1000件ずつ走査し、カーソルを非公開バケットに残す。
 */
export async function runSubmissionOrphanCleanup(env: Env, db: Db, now = new Date()) {
  const bucket = env.SUBMISSIONS_BUCKET;
  if (!bucket) return;
  const locked = await withResourceLock(
    db,
    "submission-orphan-cleanup",
    async () => {
      const saved = await bucket.get(CURSOR_KEY);
      const state = saved ? await saved.json<{ cursor: string | null }>() : null;
      if (state && state.cursor !== null && typeof state.cursor !== "string")
        throw new Error("提出ファイル回収のカーソルが不正です");
      const page = await bucket.list({
        prefix: "submissions/",
        limit: 1000,
        ...(state?.cursor ? { cursor: state.cursor } : {}),
      });
      const candidates = page.objects.flatMap((object) => {
        const submissionId = object.key.match(OBJECT_KEY)?.[1];
        return submissionId && object.uploaded.getTime() < now.getTime() - GRACE_MS
          ? [{ key: object.key, submissionId }]
          : [];
      });
      let deleted = 0;
      // 主キー(submission_id, path)を使い、D1全体をobject_keyで繰り返し走査しない。
      for (const ids of chunk([...new Set(candidates.map((o) => o.submissionId))], 80)) {
        const references = await db
          .select({ objectKey: submissionFiles.objectKey })
          .from(submissionFiles)
          .where(inArray(submissionFiles.submissionId, ids));
        const referenced = new Set(references.map((f) => f.objectKey));
        const idSet = new Set(ids);
        const target = candidates
          .filter((o) => idSet.has(o.submissionId) && !referenced.has(o.key))
          .map((o) => o.key);
        if (target.length) {
          await bucket.delete(target);
          deleted += target.length;
        }
      }
      const cursor = page.truncated ? page.cursor : null;
      // 読み出しや削除に失敗したときは先へ進めず、次回同じページから再試行する。
      await bucket.put(CURSOR_KEY, JSON.stringify({ cursor }), {
        httpMetadata: { contentType: "application/json" },
      });
      return { scanned: page.objects.length, deleted, cursor };
    },
    { waitMs: 0, ttlMs: 120_000 },
  );
  return locked.ran ? locked.value : undefined;
}
