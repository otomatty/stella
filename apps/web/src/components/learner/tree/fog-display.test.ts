import { describe, expect, it } from "vitest";

import { fogObscured } from "./fog-display";

describe("fogObscured", () => {
  it("通常は霧の星をぼかす", () => {
    expect(fogObscured("fog", false)).toBe(true);
  });

  it("開発者モードでは霧の星もぼかさない", () => {
    expect(fogObscured("fog", true)).toBe(false);
  });

  it("霧以外は開発者モードでもぼかさない", () => {
    expect(fogObscured("full", false)).toBe(false);
    expect(fogObscured("name-only", true)).toBe(false);
  });
});
