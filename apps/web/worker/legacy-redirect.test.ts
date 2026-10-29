import { describe, expect, it } from "vitest";

import worker, { LEARNER_ORIGIN } from "./legacy-redirect";

describe("旧ホストの転送", () => {
  it("パスとクエリを保って受講者用オリジンへ 308 する", () => {
    const response = worker.fetch(
      new Request("https://stella-web.saedgewell.workers.dev/api/auth/sign-in/social?x=1"),
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe(`${LEARNER_ORIGIN}/api/auth/sign-in/social?x=1`);
  });
});
