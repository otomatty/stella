import { describe, expect, it } from "vitest";

import { isReadableEnrollmentStatus, READABLE_ENROLLMENT_STATUSES } from "./access.js";

describe("isReadableEnrollmentStatus", () => {
  it("受講中 / 修了済みは閲覧できる", () => {
    expect(isReadableEnrollmentStatus("active")).toBe(true);
    expect(isReadableEnrollmentStatus("completed")).toBe(true);
  });

  it("期限切れは閲覧できない", () => {
    expect(isReadableEnrollmentStatus("expired")).toBe(false);
  });

  it("未知の値 / 未設定は閲覧できない", () => {
    for (const value of ["", "unknown", null, undefined]) {
      expect(isReadableEnrollmentStatus(value)).toBe(false);
    }
  });

  it("定数は active / completed の 2 つ", () => {
    expect([...READABLE_ENROLLMENT_STATUSES]).toEqual(["active", "completed"]);
  });
});
