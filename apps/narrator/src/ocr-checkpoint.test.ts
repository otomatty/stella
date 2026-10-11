import { describe, expect, it, vi } from "vitest";
import type { OcrProvider } from "@stella/book-core/providers";
import type { JobContext } from "./context";
import { checkpointOcr } from "./ocr-checkpoint";
const valid = JSON.stringify({
  pages: [1, 2].map((page) => ({ page, markdown: "Text", figures: [] })),
});
const usage = { inputTokens: 100, outputTokens: 200 };
function harness(first = valid) {
  const objects = new Map<string, string>();
  const put = vi.fn(async (key: string, value: string) => {
    objects.set(key, value);
  });
  const recordUsage = vi.fn().mockResolvedValue(undefined);
  const job = {
    env: {
      BUCKET: {
        async get(key: string) {
          const value = objects.get(key);
          return value === undefined
            ? null
            : {
                async json() {
                  return JSON.parse(value);
                },
              };
        },
        async delete(key: string) {
          objects.delete(key);
        },
      },
    },
    put,
    usage: recordUsage,
  } as unknown as JobContext;
  const read = vi
    .fn()
    .mockResolvedValueOnce({ text: first, usage })
    .mockResolvedValue({ text: valid, usage });
  const provider: OcrProvider = {
    model: "fake-ocr",
    read,
    async upload() {
      return { name: "file", uri: "file" };
    },
    async remove() {
      return undefined;
    },
  };
  const resume = () =>
    checkpointOcr(job, provider, { name: "file", uri: "file" }, 1, 2, "range.json");
  return { objects, put, recordUsage, read, resume };
}
describe("OCR checkpoint validation", () => {
  it.each([
    "malformed JSON",
    JSON.stringify({ pages: [{ page: 1, markdown: "Text", figures: [] }] }),
    JSON.stringify({ pages: [2, 1].map((page) => ({ page, markdown: "Text", figures: [] })) }),
    JSON.stringify({ pages: [{ page: 1 }, { page: 2, markdown: "Text", figures: [] }] }),
  ])("retries an invalid provider response without checkpointing it: %s", async (first) => {
    const h = harness(first);
    await expect(h.resume()).rejects.toThrow();
    expect(h.objects.size).toBe(0);
    expect(h.recordUsage).toHaveBeenCalledOnce();
    const result = await h.resume();
    expect(result.text).toBe(valid);
    expect(await h.resume()).toEqual(result);
    expect(h.read).toHaveBeenCalledTimes(2);
    expect(h.put).toHaveBeenCalledOnce();
  });
  it("discards an invalid saved page range and replaces it with a validated response", async () => {
    const h = harness();
    h.objects.set(
      "range.json",
      JSON.stringify({ text: '{"pages":[]}', usage, model: "fake-ocr", reference: "old" }),
    );
    const result = await h.resume();
    expect(result.text).toBe(valid);
    expect(result.reference).not.toBe("old");
    expect(await h.resume()).toEqual(result);
    expect(h.read).toHaveBeenCalledOnce();
  });
});
