import { describe, expect, it, vi } from "vitest";
import type { Env } from "../env.js";
import { libraryRuntimeStatus, processingAvailable } from "./library-capabilities.js";

function fixture(overrides: Partial<Env> = {}) {
  const capabilities = vi.fn(async () => ({ configured: true, provider: "gemini" as const }));
  const env = {
    LIBRARY_BUCKET: {} as R2Bucket,
    NARRATOR: { capabilities, startJob: vi.fn() },
    ...overrides,
  } as Env;
  return { env, capabilities };
}

describe("library processing availability", () => {
  it.each([{ LIBRARY_ENABLED: "0" }, { LIBRARY_ENABLED: "false" }, { LIBRARY_BUCKET: undefined }])(
    "returns immediately without RPC when local configuration prevents processing: %j",
    async (overrides) => {
      const { env, capabilities } = fixture(overrides);
      expect(await processingAvailable(env)).toBe(false);
      expect(capabilities).not.toHaveBeenCalled();
    },
  );

  it("uses the narrator status when the library can process books", async () => {
    const { env, capabilities } = fixture();
    expect(await processingAvailable(env)).toBe(true);
    expect(capabilities).toHaveBeenCalledTimes(1);
  });

  it("still diagnoses narrator connectivity for health checks with the library disabled", async () => {
    const { env, capabilities } = fixture({ LIBRARY_ENABLED: "0" });
    expect(await libraryRuntimeStatus(env)).toEqual({
      libraryEnabled: false,
      narratorAvailable: true,
      processingAvailable: false,
    });
    expect(capabilities).toHaveBeenCalledTimes(1);
  });
});
