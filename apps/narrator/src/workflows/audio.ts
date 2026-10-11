import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import type { NarratorJobRequest } from "@stella/shared/library/types";
import { chunkParagraphs, speechHash, toSpeechParagraphs } from "@stella/book-core/speech";
import { pcmToMp3 } from "@stella/book-core/mp3";
import { ttsProvider } from "@stella/book-core/providers";
import { JobContext, generationPrefix, providerConfig, RETRY } from "../context";
import { releaseAudioClaim } from "../audio-state";
import { concatenateAudio } from "../audio-concat";
import { cachedAudio } from "../audio-cache";
import { audioSettings, audioConfig } from "../audio-settings";
import {
  audioBatchStarts,
  AUDIO_CHUNKS_PER_STEP,
  AUDIO_CONCAT_BATCH_SIZE,
  audioConcatGroups,
  type AudioPart,
} from "../audio-batches";
export class AudioWorkflow extends WorkflowEntrypoint<NarratorEnv, NarratorJobRequest> {
  async run(event: WorkflowEvent<NarratorJobRequest>, step: WorkflowStep): Promise<void> {
    const job = new JobContext(this.env, event.payload, event.instanceId),
      p = job.p;
    const claim = event.instanceId;
    const temp = `${generationPrefix(p)}audio/tmp/${claim}/`;
    const key = `${generationPrefix(p)}audio/${claim}.mp3`;
    const config = providerConfig(this.env);
    let input: { chapterId: string; revision: number; hash: string } | undefined;
    try {
      const prepared = await step.do("prepare", async () => {
        const settings = audioSettings(config);
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
            settings.model,
            Date.now(),
            claim,
            ...job.scope,
            p.generation,
          )
          .run();
        if (acquired.meta.changes !== 1) throw new NonRetryableError("この章の音声は生成中です");
        await job.put(`${temp}chunks.json`, JSON.stringify(chunks));
        await job.progress(0, chunks.length);
        return {
          chapterId: chapter.id,
          revision: chapter.revision,
          hash,
          count: chunks.length,
          settings,
        };
      });
      input = prepared;
      const tts = ttsProvider(audioConfig(config, prepared.settings));
      const parts: AudioPart[] = [];
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
              const partKey = `${temp}${n}.mp3`;
              const stored = await this.env.BUCKET.head(partKey);
              const cached = cachedAudio(stored?.customMetadata, prepared.hash, prepared.settings);
              if (stored && cached) {
                await job.usage(
                  tts.model,
                  cached.usage,
                  cached.reference,
                  prepared.settings.fake ? "fake" : "google",
                );
                await job.progress(n + 1, prepared.count);
                batch.push({ key: partKey, bytes: stored.size, seconds: cached.seconds });
                continue;
              }
              const result = await tts.synthesize(text);
              const reference = `${claim}:${n}:${crypto.randomUUID()}`;
              const mp3 = pcmToMp3(result.pcm, result.sampleRate);
              const seconds = result.pcm.length / 2 / result.sampleRate;
              try {
                await job.putCheckpoint(partKey, mp3, {
                  customMetadata: {
                    hash: prepared.hash,
                    model: tts.model,
                    voice: prepared.settings.voice,
                    language: prepared.settings.language,
                    provider: prepared.settings.fake ? "fake" : "google",
                    reference,
                    seconds: String(seconds),
                    inputTokens: String(result.usage.inputTokens),
                    outputTokens: String(result.usage.outputTokens),
                  },
                });
              } finally {
                // Checkpoint before D1 writes; a usage/progress failure resumes
                // the saved MP3. A failed put still records the paid call.
                await job.usage(
                  tts.model,
                  result.usage,
                  reference,
                  prepared.settings.fake ? "fake" : "google",
                );
              }
              await job.progress(n + 1, prepared.count);
              batch.push({ key: partKey, bytes: mp3.length, seconds });
            }
            return batch;
          })),
        );
      let finalParts = parts;
      if (parts.length > AUDIO_CONCAT_BATCH_SIZE) {
        finalParts = [];
        const groups = audioConcatGroups(parts);
        for (let n = 0; n < groups.length; n++) {
          const group = groups[n];
          if (!group) throw new NonRetryableError("結合する音声がありません");
          finalParts.push(
            await step.do(`concat-${n}`, RETRY, () =>
              concatenateAudio(job, group, `${temp}group-${n}.mp3`),
            ),
          );
        }
      }
      await step.do("concat", RETRY, () => concatenateAudio(job, finalParts, key));
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
