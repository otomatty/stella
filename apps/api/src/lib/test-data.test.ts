import { describe, expect, it } from "vitest";
import { testDataWelcomeBody } from "./test-data.js";

describe("testDataWelcomeBody", () => {
  it("names the user and says test enrollment data was inserted", () => {
    const body = testDataWelcomeBody("佐藤");
    expect(body).toContain("佐藤");
    expect(body).toContain("受講登録・進捗");
    expect(body).toContain("を投入しました");
  });
});
