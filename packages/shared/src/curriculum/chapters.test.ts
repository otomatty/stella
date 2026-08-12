import { describe, expect, it } from "vitest";
import { chapters } from "./chapters.js";

describe("chapters", () => {
  it("型システムとジェネリクスの章がある", () => {
    const ids = chapters.map((c) => c.id);
    expect(ids).toContain("Ch17");
    expect(ids).toContain("Ch18");
  });

  it("order は 0 から連番", () => {
    chapters.forEach((c, i) => expect(c.order).toBe(i));
  });
});
