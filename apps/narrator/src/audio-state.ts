export interface AudioTarget {
  tenantId: string;
  bookId: string;
  chapterId: string;
  revision: number;
}
/** A retired attempt may release only its own claim; its book/dispatch need not remain live. */
export async function releaseAudioClaim(
  db: D1Database,
  target: AudioTarget,
  claim: string,
): Promise<void> {
  await db
    .prepare(
      "UPDATE library_audios SET status = CASE WHEN status = 'ready' THEN 'ready' ELSE 'failed' END, generation_job_id = NULL WHERE tenant_id = ? AND book_id = ? AND chapter_id = ? AND revision = ? AND generation_job_id = ?",
    )
    .bind(target.tenantId, target.bookId, target.chapterId, target.revision, claim)
    .run();
}
