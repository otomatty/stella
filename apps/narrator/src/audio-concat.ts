import type { JobContext } from "./context";
import type { AudioPart } from "./audio-batches";
import { putWhileWriting } from "./audio-stream";
export async function concatenateAudio(
  job: JobContext,
  parts: AudioPart[],
  key: string,
): Promise<AudioPart> {
  await job.guard();
  const bytes = parts.reduce((sum, part) => sum + part.bytes, 0);
  const { readable, writable } = new FixedLengthStream(bytes);
  const writer = writable.getWriter();
  const writing = (async () => {
    try {
      for (const part of parts) {
        const object = await job.env.BUCKET.get(part.key);
        if (!object || object.size !== part.bytes) throw new Error("音声の分割がありません");
        await writer.write(new Uint8Array(await object.arrayBuffer()));
      }
      await writer.close();
    } catch (error) {
      await writer.abort(error);
      throw error;
    }
  })();
  await putWhileWriting(writing, readable, () =>
    job.put(key, readable, { httpMetadata: { contentType: "audio/mpeg" } }),
  );
  return { key, bytes, seconds: parts.reduce((sum, part) => sum + part.seconds, 0) };
}
