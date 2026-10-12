import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { LIBRARY_LIMITS, type NarratorJobRequest } from "@stella/shared/library/types";
import { loadPdf, extractFigures } from "@stella/book-core/pdf";
import { parseOcrResponse, normalizeOcrPage } from "@stella/book-core/ocr";
import { splitIntoChapters, type ChapterDraft } from "@stella/book-core/chapters";
import { speechHash } from "@stella/book-core/speech";
import { ocrProvider } from "@stella/book-core/providers";
import {
  JobContext,
  generationPrefix,
  bookPrefix,
  bookOutputPrefix,
  providerConfig,
  RETRY,
} from "../context";
import { figureBatches, type FigureTask, MAX_BOOK_PDFS, MAX_FIGURE_BATCHES } from "../book-figures";
import { checkpointOcr } from "../ocr-checkpoint";
import { ocrLimits, quotaMonth, reserveOcrPages, userFacing, userMessage } from "../quota";
import { readChapterState } from "../book-state";
interface Pdf {
  id: string;
  r2_key: string;
  size_bytes: number;
  file_name: string;
  page_count: number;
  first_page_no: number;
}
interface PreparedChapter extends ChapterDraft {
  id: string;
  position: number;
  hash: string;
}
const MAX_BOOK_CHAPTERS = 1000;
export class BookWorkflow extends WorkflowEntrypoint<NarratorEnv, NarratorJobRequest> {
  async run(event: WorkflowEvent<NarratorJobRequest>, step: WorkflowStep): Promise<void> {
    const job = new JobContext(this.env, event.payload, event.instanceId),
      p = job.p;
    try {
      // OCR settings are persisted with the step so a resumed run cannot mix models in one book.
      const start = await step.do("start", async () => {
        const row = await job.guard();
        await job.progress(0, 0);
        await this.env.DB.prepare(
          `UPDATE library_books SET status = 'processing', updated_at = ? WHERE tenant_id = ? AND id = ? AND generation = ? AND status <> 'ready' AND ${job.live}`,
        )
          .bind(Date.now(), ...job.bookScope, ...job.scope)
          .run();
        return {
          kind: row.type,
          ocrModel: this.env.OCR_MODEL,
          fake: this.env.FAKE_PROVIDERS === "1",
        };
      });
      if (start.kind === "ocr") {
        const ids = await step.do("list-pdfs", async () => {
          await job.guard();
          const rows = await this.env.DB.prepare(
            "SELECT id FROM library_book_pdfs WHERE tenant_id = ? AND book_id = ? AND upload_status = 'completed' ORDER BY position",
          )
            .bind(p.tenantId, p.bookId)
            .all<{ id: string }>();
          if (!rows.results.length) throw new NonRetryableError("PDFがありません");
          if (rows.results.length > MAX_BOOK_PDFS)
            throw new NonRetryableError(userFacing("pdf_count"));
          return rows.results.map((pdf) => pdf.id);
        });
        for (const id of ids)
          await step.do(`count-${id}`, RETRY, async () => {
            await job.guard();
            const pdf = await this.env.DB.prepare(
              "SELECT * FROM library_book_pdfs WHERE tenant_id = ? AND book_id = ? AND id = ?",
            )
              .bind(p.tenantId, p.bookId, id)
              .first<Pdf>();
            if (!pdf?.r2_key.startsWith(bookPrefix(p)))
              throw new NonRetryableError("PDFが見つかりません");
            // Always recount: a stored page_count may be the browser's declaration.
            const object = await this.env.BUCKET.get(pdf.r2_key);
            if (!object || object.size > 50 * 1024 * 1024)
              throw new NonRetryableError("PDFのサイズが無効です");
            const count = (
              await loadPdf(new Uint8Array(await object.arrayBuffer()))
            ).getPageCount();
            if (count < 1 || count > 100) throw new NonRetryableError(userFacing("pdf_pages"));
            await this.env.DB.prepare(
              `UPDATE library_book_pdfs SET page_count = ? WHERE tenant_id = ? AND book_id = ? AND id = ? AND ${job.live}`,
            )
              .bind(count, p.tenantId, p.bookId, id, ...job.scope)
              .run();
          });
        const pdfs = await step.do("number-pages", async () => {
          await job.guard();
          const rows = await this.env.DB.prepare(
            "SELECT * FROM library_book_pdfs WHERE tenant_id = ? AND book_id = ? AND upload_status = 'completed' ORDER BY position",
          )
            .bind(p.tenantId, p.bookId)
            .all<Pdf>();
          let next = 1;
          const plans = rows.results.map((pdf) => {
            const plan = { ...pdf, first_page_no: next };
            next += pdf.page_count;
            return plan;
          });
          if (next - 1 > 1000) throw new NonRetryableError(userFacing("book_pages"));
          if (rows.results.reduce((n, pdf) => n + pdf.size_bytes, 0) > LIBRARY_LIMITS.maxBookBytes)
            throw new NonRetryableError(userFacing("book_bytes"));
          await this.env.DB.prepare(
            `UPDATE library_books SET page_count = ? WHERE tenant_id = ? AND id = ? AND generation = ? AND ${job.live}`,
          )
            .bind(next - 1, ...job.bookScope, ...job.scope)
            .run();
          await job.progress(0, next - 1);
          return plans;
        });
        for (const pdf of pdfs) {
          await step.do(`number-${pdf.id}`, async () => {
            await job.guard();
            await this.env.DB.batch([
              this.env.DB.prepare(
                `UPDATE library_book_pdfs SET first_page_no = ? WHERE tenant_id = ? AND book_id = ? AND id = ? AND ${job.live}`,
              ).bind(pdf.first_page_no, p.tenantId, p.bookId, pdf.id, ...job.scope),
              this.env.DB.prepare(
                `WITH RECURSIVE pages(n) AS (SELECT ? UNION ALL SELECT n + 1 FROM pages WHERE n < ?) INSERT OR IGNORE INTO library_pages (tenant_id, book_id, page_no) SELECT ?, ?, n FROM pages WHERE ${job.live}`,
              ).bind(
                pdf.first_page_no,
                pdf.first_page_no + pdf.page_count - 1,
                p.tenantId,
                p.bookId,
                ...job.scope,
              ),
            ]);
          });
        }
        // Reserve the pages still to be read (a retry skips pages already read) before any
        // paid OCR call. Reservations of failed runs are not refunded: the budget errs on the
        // side of spending less.
        await step.do("reserve-ocr", async () => {
          await job.guard();
          const remaining = await this.env.DB.prepare(
            "SELECT count(*) AS n FROM library_pages WHERE tenant_id = ? AND book_id = ? AND ocr_status <> 'succeeded'",
          )
            .bind(p.tenantId, p.bookId)
            .first<{ n: number }>();
          const refused = await reserveOcrPages(
            this.env.DB,
            {
              instanceId: event.instanceId,
              tenantId: p.tenantId,
              bookId: p.bookId,
              pages: remaining?.n ?? 0,
              month: quotaMonth(),
            },
            ocrLimits(this.env),
          );
          if (refused) throw new NonRetryableError(refused);
        });
        const ocr = ocrProvider({
          ...providerConfig(this.env),
          OCR_MODEL: start.ocrModel,
          FAKE_PROVIDERS: start.fake ? "1" : "0",
        });
        let figureStepCount = 0;
        for (const pdf of pdfs) {
          const ranges = await step.do(`ranges-${pdf.id}`, async () => {
            await job.guard();
            const rows = await this.env.DB.prepare(
              "SELECT page_no FROM library_pages WHERE tenant_id = ? AND book_id = ? AND ocr_status = 'succeeded'",
            )
              .bind(p.tenantId, p.bookId)
              .all<{ page_no: number }>();
            const done = new Set(rows.results.map((row) => row.page_no)),
              ranges: [number, number][] = [];
            for (let from = 1; from <= pdf.page_count; from += 20) {
              const to = Math.min(from + 19, pdf.page_count);
              if (
                Array.from(
                  { length: to - from + 1 },
                  (_, i) => pdf.first_page_no + from + i - 1,
                ).some((n) => !done.has(n))
              )
                ranges.push([from, to]);
            }
            return ranges;
          });
          if (ranges.length) {
            const file = await step.do(`upload-${pdf.id}`, RETRY, async () => {
              await job.guard();
              return ocr.upload(pdf.r2_key, pdf.size_bytes, pdf.file_name);
            });
            for (const [from, to] of ranges)
              await step.do(`ocr-${pdf.id}-${from}`, RETRY, async () => {
                await job.guard();
                const result = await checkpointOcr(
                  job,
                  ocr,
                  file,
                  from,
                  to,
                  `${generationPrefix(p)}ocr/${event.instanceId}/${pdf.id}-${from}-${to}.json`,
                );
                await job.usage(ocr.model, result.usage, result.reference);
                const pages = parseOcrResponse(result.text, from, to);
                await this.env.DB.batch(
                  pages.map((raw) => {
                    const pageNo = pdf.first_page_no + raw.page - 1,
                      page = normalizeOcrPage(pageNo, raw);
                    return this.env.DB.prepare(
                      `UPDATE library_pages SET ocr_status = 'succeeded', ocr_markdown = ?, ocr_figures = ? WHERE tenant_id = ? AND book_id = ? AND page_no = ? AND ${job.live}`,
                    ).bind(
                      page.markdown,
                      JSON.stringify(page.figures),
                      p.tenantId,
                      p.bookId,
                      pageNo,
                      ...job.scope,
                    );
                  }),
                );
                const count = await this.env.DB.prepare(
                  "SELECT count(*) AS count FROM library_pages WHERE tenant_id = ? AND book_id = ? AND ocr_status = 'succeeded'",
                )
                  .bind(p.tenantId, p.bookId)
                  .first<{ count: number }>();
                const total = pdfs.reduce((n, pdf) => n + pdf.page_count, 0);
                await job.progress(count?.count ?? 0, total);
              });
            await step.do(`remove-${pdf.id}`, () => ocr.remove(file));
          }
          const figurePlan = await step.do(`figure-pages-${pdf.id}`, async () => {
            await job.guard();
            const pages = (
              await this.env.DB.prepare(
                "SELECT page_no, ocr_figures FROM library_pages WHERE tenant_id = ? AND book_id = ? AND page_no BETWEEN ? AND ? AND image_r2_key IS NULL AND ocr_figures <> '[]'",
              )
                .bind(
                  p.tenantId,
                  p.bookId,
                  pdf.first_page_no,
                  pdf.first_page_no + pdf.page_count - 1,
                )
                .all<{ page_no: number; ocr_figures: string }>()
            ).results;
            const batches = figureBatches(pages);
            const key = `${generationPrefix(p)}figures/${event.instanceId}-${pdf.id}.json`;
            await job.put(key, JSON.stringify(batches));
            return { key, count: batches.length };
          });
          figureStepCount += figurePlan.count;
          if (figureStepCount > MAX_FIGURE_BATCHES)
            throw new NonRetryableError(
              "図版処理の上限を超えています。書籍を分けて登録してください",
            );
          for (let batchNo = 0; batchNo < figurePlan.count; batchNo++)
            await step.do(`figures-${pdf.id}-${batchNo}`, RETRY, async () => {
              await job.guard();
              const plan = await this.env.BUCKET.get(figurePlan.key);
              const tasks = (await plan?.json<FigureTask[][]>())?.[batchNo];
              if (!tasks) throw new NonRetryableError("図版の計画がありません");
              const object = await this.env.BUCKET.get(pdf.r2_key);
              if (!object) throw new NonRetryableError("PDFがありません");
              const doc = await loadPdf(new Uint8Array(await object.arrayBuffer()));
              for (const task of tasks) {
                const result = await extractFigures(
                  doc,
                  task.pageNo - pdf.first_page_no,
                  task.figures,
                );
                for (const figure of result.figures) {
                  const key = `${bookOutputPrefix(p, event.instanceId)}images/${figure.fileName}`;
                  await job.guard();
                  await job.put(key, figure.webp, {
                    httpMetadata: { contentType: "image/webp" },
                  });
                  await this.env.DB.prepare(
                    `INSERT INTO library_figures (id, tenant_id, book_id, file_name, page_no, caption, r2_key, width, height) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${job.live} ON CONFLICT (tenant_id, book_id, file_name) DO UPDATE SET r2_key = excluded.r2_key, width = excluded.width, height = excluded.height, caption = excluded.caption`,
                  )
                    .bind(
                      crypto.randomUUID(),
                      p.tenantId,
                      p.bookId,
                      figure.fileName,
                      task.pageNo,
                      figure.caption,
                      key,
                      figure.width,
                      figure.height,
                      ...job.scope,
                    )
                    .run();
                }
                if (!task.complete) continue;
                const key = `${bookOutputPrefix(p, event.instanceId)}pages/${task.pageNo}.webp`;
                await job.guard();
                await job.put(key, result.pageWebp, {
                  httpMetadata: { contentType: "image/webp" },
                });
                await this.env.DB.prepare(
                  `UPDATE library_pages SET image_r2_key = ? WHERE tenant_id = ? AND book_id = ? AND page_no = ? AND ${job.live}`,
                )
                  .bind(key, p.tenantId, p.bookId, task.pageNo, ...job.scope)
                  .run();
              }
            });
        }
      }
      const chapterPlan = await step.do("split", RETRY, async () => {
        await job.guard();
        const book = await readChapterState(this.env.DB, p);
        if (!book) throw new NonRetryableError("本がありません");
        const readPlan = async (key: string) => {
          if (!key.startsWith(`${generationPrefix(p)}chapters/`))
            throw new NonRetryableError("章の下書きが失効しています");
          const object = await this.env.BUCKET.get(key);
          if (!object) throw new NonRetryableError("章の下書きがありません");
          const count = (await object.json<PreparedChapter[]>()).length;
          if (count > MAX_BOOK_CHAPTERS) throw new NonRetryableError("章の数が上限を超えています");
          return { count, key };
        };
        if (book.chapter_plan_key?.startsWith(`${generationPrefix(p)}chapters/`))
          return readPlan(book.chapter_plan_key);
        if (book.chapter_count) {
          if (book.chapter_count > MAX_BOOK_CHAPTERS)
            throw new NonRetryableError("章の数が上限を超えています");
          return { count: 0, key: "" }; // Preserve personal records on re-split.
        }
        const rows = await this.env.DB.prepare(
          "SELECT page_no, ocr_markdown FROM library_pages WHERE tenant_id = ? AND book_id = ? ORDER BY page_no",
        )
          .bind(p.tenantId, p.bookId)
          .all<{ page_no: number; ocr_markdown: string | null }>();
        const chapters = splitIntoChapters(
          rows.results.map((row) => ({ pageNo: row.page_no, markdown: row.ocr_markdown ?? "" })),
          book.title,
        );
        if (!chapters.length) throw new NonRetryableError("章がありません");
        if (chapters.length > MAX_BOOK_CHAPTERS)
          throw new NonRetryableError("章の数が上限を超えています");
        const prepared = await Promise.all(
          chapters.map(async (chapter, position) => ({
            ...chapter,
            id: crypto.randomUUID(),
            position: position + 1,
            hash: await speechHash(chapter.markdown),
          })),
        );
        const key = `${generationPrefix(p)}chapters/${event.instanceId}.json`;
        await job.put(key, JSON.stringify(prepared));
        const claimed = await this.env.DB.prepare(
          `UPDATE library_books SET chapter_plan_key = ? WHERE tenant_id = ? AND id = ? AND chapter_plan_key IS ? AND ${job.live}`,
        )
          .bind(key, p.tenantId, p.bookId, book.chapter_plan_key, ...job.scope)
          .run();
        if (claimed.meta.changes === 1) return { count: prepared.length, key };
        await this.env.BUCKET.delete(key);
        const winner = await this.env.DB.prepare(
          "SELECT chapter_plan_key FROM library_books WHERE tenant_id = ? AND id = ?",
        )
          .bind(p.tenantId, p.bookId)
          .first<{ chapter_plan_key: string }>();
        if (!winner?.chapter_plan_key)
          throw new NonRetryableError("章の下書きを確保できませんでした");
        return readPlan(winner.chapter_plan_key);
      });
      // Two statements per chapter; each step stays below the Free plan's 50-query cap.
      for (let offset = 0; offset < chapterPlan.count; offset += 20) {
        await step.do(`save-chapters-${offset}`, async () => {
          await job.guard();
          const object = await this.env.BUCKET.get(chapterPlan.key);
          if (!object) throw new NonRetryableError("章の下書きがありません");
          const prepared = await object.json<PreparedChapter[]>();
          const now = Date.now();
          await this.env.DB.batch(
            prepared
              .slice(offset, offset + 20)
              .flatMap((chapter) => [
                this.env.DB.prepare(
                  `INSERT OR IGNORE INTO library_chapters (id, tenant_id, book_id, position, title, markdown, speech_hash, start_page, end_page, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${job.live}`,
                ).bind(
                  chapter.id,
                  p.tenantId,
                  p.bookId,
                  chapter.position,
                  chapter.title,
                  chapter.markdown,
                  chapter.hash,
                  chapter.startPage,
                  chapter.endPage,
                  now,
                  ...job.scope,
                ),
                this.env.DB.prepare(
                  `INSERT OR IGNORE INTO library_chapter_revisions (id, tenant_id, book_id, chapter_id, revision, markdown, speech_hash, created_at) SELECT ?, ?, ?, ?, 1, ?, ?, ? WHERE ${job.live}`,
                ).bind(
                  crypto.randomUUID(),
                  p.tenantId,
                  p.bookId,
                  chapter.id,
                  chapter.markdown,
                  chapter.hash,
                  now,
                  ...job.scope,
                ),
              ]),
          );
        });
      }
      await step.do("finish", async () => {
        if ((await job.authorize()).status === "succeeded") return;
        await job.guard();
        await job.finishBook();
      });
    } catch (error) {
      const reason = userMessage(error);
      await step.do("fail", () => job.failBook(reason));
    }
    // OCR checkpoints and figure plans are per instance; pages and figures are already in D1/R2.
    await step.do("cleanup", async () => {
      for (const prefix of [
        `${generationPrefix(p)}ocr/${event.instanceId}/`,
        `${generationPrefix(p)}figures/${event.instanceId}-`,
      ])
        for (;;) {
          const objects = await this.env.BUCKET.list({ prefix });
          if (objects.objects.length)
            await this.env.BUCKET.delete(objects.objects.map((object) => object.key));
          if (!objects.truncated) break;
        }
    });
  }
}
