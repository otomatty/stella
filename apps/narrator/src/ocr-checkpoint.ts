import type { OcrProvider, Usage } from "@stella/book-core/providers";
import { parseOcrResponse } from "@stella/book-core/ocr";
import type { JobContext } from "./context";
interface OcrCheckpoint {
  text: string;
  usage: Usage;
  model: string;
  reference: string;
}
export async function checkpointOcr(
  job: JobContext,
  ocr: OcrProvider,
  file: Parameters<OcrProvider["read"]>[0],
  from: number,
  to: number,
  key: string,
): Promise<OcrCheckpoint> {
  const stored = await job.env.BUCKET.get(key);
  const cached = await stored?.json<OcrCheckpoint>();
  if (cached?.model === ocr.model && cached.reference) {
    try {
      parseOcrResponse(cached.text, from, to);
      return cached;
    } catch {
      await job.env.BUCKET.delete(key);
    }
  }
  const result = await ocr.read(file, from, to);
  const checkpoint = { ...result, model: ocr.model, reference: crypto.randomUUID() };
  try {
    parseOcrResponse(result.text, from, to);
  } catch (error) {
    // A malformed response is still a paid call, but must not poison retries.
    await job.usage(ocr.model, result.usage, checkpoint.reference);
    throw error;
  }
  // Checkpoint the paid response before usage/page/progress writes. A retry of
  // any of those writes resumes this response without calling OCR again.
  await job.put(key, JSON.stringify(checkpoint));
  return checkpoint;
}
