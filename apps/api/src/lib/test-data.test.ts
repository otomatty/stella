import { describe, expect, it } from "vitest";
import { recordsTestDataAudit, testDataWelcomeBody } from "./test-data.js";

describe("testDataWelcomeBody", () => {
  it("does not claim enrollment data was inserted for sales", () => {
    const body = testDataWelcomeBody("sales", "山田");
    expect(body).toContain("山田");
    expect(body).toContain("受講登録・進捗は投入していません");
    expect(body).not.toContain("を投入しました");
  });

  it("keeps the enrollment copy for students and staff", () => {
    expect(testDataWelcomeBody("student", "佐藤")).toContain("受講登録・進捗");
    expect(testDataWelcomeBody("instructor", "鈴木")).toContain("を投入しました");
  });
});

describe("recordsTestDataAudit", () => {
  it("skips the test_data audit flag for sales", () => {
    expect(recordsTestDataAudit("sales")).toBe(false);
    expect(recordsTestDataAudit("student")).toBe(true);
    expect(recordsTestDataAudit("instructor")).toBe(true);
  });
});
