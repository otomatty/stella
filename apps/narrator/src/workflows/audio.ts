import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import type { NarratorJobRequest } from "@stella/shared/library/types";
import { chunkParagraphs, speechHash, toSpeechParagraphs } from "@stella/book-core/speech";
import { pcmToMp3 } from "@stella/book-core/mp3";
import { ttsProvider } from "@stella/book-core/providers";
import { JobContext, generationPrefix, providerConfig, RETRY } from "../context";
import { releaseAudioClaim } from "../audio-state";
import { putWhileWriting } from "../audio-stream";
import { audioBatchStarts, AUDIO_CHUNKS_PER_STEP } from "../audio-batches";
export class AudioWorkflow extends WorkflowEntrypoint<NarratorEnv, NarratorJobRequest> {
  async run(event: WorkflowEvent<NarratorJobRequest>, step: WorkflowStep): Promise<void> {
    const job = new JobContext(this.env, event.payload, event.instanceId),
      p = job.p;
    const claim = event.instanceId;
    const temp = `${generationPrefix(p)}audio/tmp/${claim}/`;
    const key = `${generationPrefix(p)}audio/${claim}.mp3`;
    const tts = ttsProvider(providerConfig(this.env));
    let input: { chapterId: string; revision: number; hash: string } | undefined;
    try {
      const prepared = await step.do("prepare", async () => {
        const row = await job.guard();
        if (!row.chapter_id) throw new NonRetryableError("章がありません");
        const chapter = await this.env.DB.prepare(
          "SELECT id, revision, markdown FROM library_chapters WHERE tenant_id = ? AND book_id = ? AND id = ?",
        )
          .bind(p.tenantId, p.bookId, row.chapter_id)
          .first<{ id: string; revision: number; markdown: string }>();
        if (!chapter) throw new NonRetryableError("章がありません");
        const chunks = chunkParagraphs(toSpeechParagraphs(chapter.markdown), 300);
        if (!chunks.length) throw new NonRetryableError("読み上げる文がありません");
        audioBatchStarts(chunks.length); // Validate the persisted step budget before claiming audio.
        const hash = await speechHash(chapter.markdown);
        await job.guard();
        input = { chapterId: chapter.id, revision: chapter.revision, hash };
        const acquired = await this.env.DB.prepare(
          `INSERT INTO library_audios (id, tenant_id, book_id, chapter_id, revision, status, source_speech_hash, tts_model, created_at, generation_job_id) SELECT ?, ?, ?, ?, ?, 'generating', ?, ?, ?, ? WHERE ${job.live} ON CONFLICT (tenant_id, book_id, chapter_id, revision) DO UPDATE SET generation_job_id = excluded.generation_job_id, status = CASE WHEN library_audios.status = 'ready' THEN 'ready' ELSE 'generating' END WHERE library_audios.generation_job_id IS NULL OR library_audios.generation_job_id = excluded.generation_job_id OR NOT EXISTS (SELECT 1 FROM library_jobs j JOIN library_job_dispatches d ON d.tenant_id = j.tenant_id AND d.book_id = j.book_id AND d.job_id = j.id AND d.instance_id = j.id || '-' || j.attempt WHERE j.tenant_id = library_audios.tenant_id AND j.book_id = library_audios.book_id AND j.generation = ? AND j.status IN ('queued','running') AND d.instance_id = library_audios.generation_job_id)`,
        )
          .bind(
            crypto.randomUUID(),
            p.tenantId,
            p.bookId,
            chapter.id,
            chapter.revision,
            hash,
            tts.model,
            Date.now(),
            claim,
            ...job.scope,
            p.generation,
          )
          .run();
        if (acquired.meta.changes !== 1) throw new NonRetryableError("この章の音声は生成中です");
        await job.put(`${temp}chunks.json`, JSON.stringify(chunks));
        await job.progress(0, chunks.length);
        return { chapterId: chapter.id, revision: chapter.revision, hash, count: chunks.length };
      });
      input = prepared;
      const parts: { bytes: number; seconds: number }[] = [];
      for (const start of audioBatchStarts(prepared.count))
        parts.push(
          ...(await step.do(`tts-${start}`, RETRY, async () => {
            await job.guard();
            const object = await this.env.BUCKET.get(`${temp}chunks.json`);
            const chunks = await object?.json<string[]>();
            const batch = [];
            for (let n = start; n < Math.min(prepared.count, start + AUDIO_CHUNKS_PER_STEP); n++) {
              await job.guard();
              const text = chunks?.[n];
              if (!text) throw new NonRetryableError("読み上げる文がありません");
              const result = await tts.synthesize(text);
              await job.usage(tts.model, result.usage);
              const mp3 = pcmToMp3(result.pcm, result.sampleRate);
              await job.put(`${temp}${n}.mp3`, mp3);
              await job.progress(n + 1, prepared.count);
              batch.push({ bytes: mp3.length, seconds: result.pcm.length / 2 / result.sampleRate });
            }
            return batch;
          })),
        );
      await step.do("concat", RETRY, async () => {
        await job.guard();
        const { readable, writable } = new FixedLengthStream(
          parts.reduce((sum, part) => sum + part.bytes, 0),
        );
        const writer = writable.getWriter();
        const writing = (async () => {
          try {
            for (let n = 0; n < parts.length; n++) {
              const part = await this.env.BUCKET.get(`${temp}${n}.mp3`);
              if (!part) throw new Error("音声の分割がありません");
              await writer.write(new Uint8Array(await part.arrayBuffer()));
            }
            await writer.close();
          } catch (error) {
            await writer.abort(error);
            throw error;
          }
        })();
        // Await both sides even on failure; otherwise a rejected writer/put can remain unhandled.
        await putWhileWriting(writing, readable, () =>
          job.put(key, readable, { httpMetadata: { contentType: "audio/mpeg" } }),
        );
      });
      await step.do("finish", async () => {
        if ((await job.authorize()).status === "succeeded") return;
        await job.guard();
        // A changed revision/hash can never acquire an audio made for an older input.
        const result = await this.env.DB.prepare(
          `UPDATE library_audios SET status = 'ready', generation_job_id = NULL, r2_key = ?, duration_sec = ?, size_bytes = ?, source_speech_hash = ?, tts_model = ?, created_at = ? WHERE tenant_id = ? AND book_id = ? AND chapter_id = ? AND revision = ? AND generation_job_id = ? AND EXISTS (SELECT 1 FROM library_chapters c WHERE c.tenant_id = library_audios.tenant_id AND c.book_id = library_audios.book_id AND c.id = library_audios.chapter_id AND c.revision = library_audios.revision AND c.speech_hash = ?) AND ${job.live}`,
        )
          .bind(
            key,
            parts.reduce((sum, part) => sum + part.seconds, 0),
            parts.reduce((sum, part) => sum + part.bytes, 0),
            prepared.hash,
            tts.model,
            Date.now(),
            p.tenantId,
            p.bookId,
            prepared.chapterId,
            prepared.revision,
            claim,
            prepared.hash,
            ...job.scope,
          )
          .run();
        if (result.meta.changes !== 1) {
          const completed = await this.env.DB.prepare(
            "SELECT id FROM library_audios WHERE tenant_id = ? AND book_id = ? AND chapter_id = ? AND revision = ? AND r2_key = ? AND status = 'ready'",
          )
            .bind(p.tenantId, p.bookId, prepared.chapterId, prepared.revision, key)
            .first();
          if (completed) {
            await job.finish();
            return;
          }
          await this.env.BUCKET.delete(key);
          throw new NonRetryableError("本文の版が変わりました");
        }
        await job.finish();
      });
    } catch {
      if (input) {
        const failed = input;
        await step.do("fail-audio", async () => {
          await releaseAudioClaim(this.env.DB, { ...p, ...failed }, claim);
        });
      }
      await step.do("discard-audio", async () => {
        const published = await this.env.DB.prepare(
          "SELECT id FROM library_audios WHERE tenant_id = ? AND book_id = ? AND r2_key = ? AND status = 'ready'",
        )
          .bind(p.tenantId, p.bookId, key)
          .first();
        if (!published) await this.env.BUCKET.delete(key);
      });
      await step.do("fail", () => job.fail());
    }
    await step.do("cleanup", async () => {
      for (;;) {
        const objects = await this.env.BUCKET.list({ prefix: temp });
        if (objects.objects.length)
          await this.env.BUCKET.delete(objects.objects.map((object) => object.key));
        if (!objects.truncated) break;
      }
    });
  }
}
