import { describe, expect, it } from "vitest";
import {
  ApiError,
  canManageInterviewPrep,
  requireCanManageInterviewPrep,
  type Caller,
  type ProfileRole,
} from "./authz.js";

const caller = (role: ProfileRole): Caller => ({
  id: "u1",
  tenantId: "ses",
  role,
  name: "Tester",
  email: null,
});

describe("canManageInterviewPrep", () => {
  const allowed: ProfileRole[] = ["instructor", "admin", "platform_admin", "sales"];
  const denied: ProfileRole[] = ["student"];

  it("allows staff and sales", () => {
    for (const role of allowed) {
      expect(canManageInterviewPrep(role)).toBe(true);
      expect(() => requireCanManageInterviewPrep(caller(role))).not.toThrow();
    }
  });

  it("rejects students", () => {
    for (const role of denied) {
      expect(canManageInterviewPrep(role)).toBe(false);
      expect(() => requireCanManageInterviewPrep(caller(role))).toThrow(ApiError);
    }
  });
});
