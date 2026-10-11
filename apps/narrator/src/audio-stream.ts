/** Cancel the producer if authorization/storage rejects before consuming its stream. */
export async function putWhileWriting(
  writing: Promise<void>,
  readable: ReadableStream<Uint8Array>,
  put: () => Promise<void>,
): Promise<void> {
  const results = await Promise.allSettled([
    writing,
    put().catch(async (error: unknown) => {
      await readable.cancel(error).catch(() => undefined);
      throw error;
    }),
  ]);
  for (const result of results) if (result.status === "rejected") throw result.reason;
}
