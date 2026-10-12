import { describe, expect, it } from "vitest";

import { buildVerificationUrl } from "./certificates-api";

describe("buildVerificationUrl", () => {
  it("Access の Bypass にしてある /verify/<コード> を組み立てる (クエリ文字列は使わない)", () => {
    expect(buildVerificationUrl("AB12-CD34")).toBe("/verify/AB12-CD34");
    expect(buildVerificationUrl("a/b c")).toBe("/verify/a%2Fb%20c");
  });
});
