import { describe, expect, it } from "vitest";
import type { Env } from "../env.js";
import { libraryAvailable, libraryRuntimeStatus } from "./library-capabilities.js";

function env(overrides: Partial<Env> = {}): Env {
  return { LIBRARY_BUCKET: {} as R2Bucket, ...overrides } as Env;
}

describe("library availability", () => {
  it("is available with the private bucket bound and the flag left on", () => {
    expect(libraryAvailable(env())).toBe(true);
    expect(libraryRuntimeStatus(env())).toEqual({ libraryEnabled: true });
  });

  it.each([{ LIBRARY_ENABLED: "0" }, { LIBRARY_ENABLED: "false" }, { LIBRARY_BUCKET: undefined }])(
    "is unavailable when local configuration turns it off: %j",
    (overrides) => {
      expect(libraryAvailable(env(overrides))).toBe(false);
      expect(libraryRuntimeStatus(env(overrides))).toEqual({ libraryEnabled: false });
    },
  );
});
