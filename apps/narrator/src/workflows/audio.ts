import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import type { NarratorJobRequest } from "@stella/shared/library/types";
import { chunkParagraphs, speechHash, toSpeechParagraphs } from "@stella/book-core/speech";
import { pcmToMp3 } from "@stella/book-core/mp3";
import { ttsProvider } from "@stella/book-core/providers";
import { JobContext, generationPrefix, providerConfig, RETRY } from "../context";
export class AudioWorkflow extends WorkflowEntrypoint<NarratorEnv, NarratorJobRequest> {
  async run(event: WorkflowEvent<NarratorJobRequest>, step: WorkflowStep): Promise<void> {
    const job = new JobContext(this.env, event.payload),
      p = job.p;
    const temp = `${generationPrefix(p)}audio/tmp/${p.jobId}/`;
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
        const hash = await speechHash(chapter.markdown);
        await job.guard();
        await this.env.BUCKET.put(`${temp}chunks.json`, JSON.stringify(chunks));
        await job.progress(0, chunks.length);
        await this.env.DB.prepare(
          `INSERT INTO library_audios (id, tenant_id, book_id, chapter_id, revision, status, source_speech_hash, tts_model, created_at) SELECT ?, ?, ?, ?, ?, 'generating', ?, ?, ? WHERE ${job.live} ON CONFLICT (tenant_id, book_id, chapter_id, revision) DO UPDATE SET status = 'generating'`,
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
            ...job.scope,
          )
          .run();
        return { chapterId: chapter.id, revision: chapter.revision, hash, count: chunks.length };
      });
      input = prepared;
      const parts: { bytes: number; seconds: number }[] = [];
      for (let n = 0; n < prepared.count; n++)
        parts.push(
          await step.do(`tts-${n}`, RETRY, async () => {
            await job.guard();
            const object = await this.env.BUCKET.get(`${temp}chunks.json`);
            const text = (await object?.json<string[]>())?.[n];
            if (!text) throw new NonRetryableError("読み上げる文がありません");
            const result = await tts.synthesize(text);
            await job.usage(tts.model, result.usage);
            const mp3 = pcmToMp3(result.pcm, result.sampleRate);
            await job.guard();
            await this.env.BUCKET.put(`${temp}${n}.mp3`, mp3);
            await job.progress(n + 1, prepared.count);
            return { bytes: mp3.length, seconds: result.pcm.length / 2 / result.sampleRate };
          }),
        );
      const key = `${generationPrefix(p)}audio/${p.jobId}.mp3`;
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
        const results = await Promise.allSettled([
          writing,
          this.env.BUCKET.put(key, readable, { httpMetadata: { contentType: "audio/mpeg" } }),
        ]);
        for (const result of results) if (result.status === "rejected") throw result.reason;
      });
      await step.do("finish", async () => {
        await job.guard();
        // A changed revision/hash can never acquire an audio made for an older input.
        const result = await this.env.DB.prepare(
          `UPDATE library_audios SET status = 'ready', r2_key = ?, duration_sec = ?, size_bytes = ?, source_speech_hash = ?, tts_model = ?, created_at = ? WHERE tenant_id = ? AND book_id = ? AND chapter_id = ? AND revision = ? AND EXISTS (SELECT 1 FROM library_chapters c WHERE c.tenant_id = library_audios.tenant_id AND c.book_id = library_audios.book_id AND c.id = library_audios.chapter_id AND c.revision = library_audios.revision AND c.speech_hash = ?) AND ${job.live}`,
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
            prepared.hash,
            ...job.scope,
          )
          .run();
        if (result.meta.changes !== 1) {
          await this.env.BUCKET.delete(key);
          throw new NonRetryableError("本文の版が変わりました");
        }
        await job.finish();
      });
    } catch {
      if (input) {
        const failed = input;
        await step.do("fail-audio", async () => {
          await this.env.DB.prepare(
            `UPDATE library_audios SET status = 'failed' WHERE tenant_id = ? AND book_id = ? AND chapter_id = ? AND revision = ? AND source_speech_hash = ? AND status = 'generating' AND ${job.live}`,
          )
            .bind(
              p.tenantId,
              p.bookId,
              failed.chapterId,
              failed.revision,
              failed.hash,
              ...job.scope,
            )
            .run();
        });
      }
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
