import { describe, expect, it } from "vitest";
import { LIBRARY_LIMITS } from "@stella/shared/library/types";
import { overBookLimit } from "./library-upload";

describe("book limits before sending a file", () => {
  const fits = { pdfs: 50, bytes: LIBRARY_LIMITS.maxBookBytes, pages: 1000 };
  it("accepts totals exactly at every limit", () => {
    expect(overBookLimit(fits, LIBRARY_LIMITS)).toBeNull();
  });
  it("names the first limit that is passed", () => {
    expect(overBookLimit({ ...fits, pdfs: 51 }, LIBRARY_LIMITS)).toBe("PDF50個");
    expect(overBookLimit({ ...fits, bytes: fits.bytes + 1 }, LIBRARY_LIMITS)).toBe("1GB");
    expect(overBookLimit({ ...fits, pages: 1001 }, LIBRARY_LIMITS)).toBe("1000ページ");
  });
});
